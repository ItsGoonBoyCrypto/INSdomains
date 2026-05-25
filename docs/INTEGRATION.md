# INS — Integration Guide for Wallets & Explorers

**INS (Igra Name Service)** is the permanent name service native to **Igra L2** (chain ID `38833`, native `iKAS`). Every name is an ERC-721 NFT with on-chain SVG art.

V2 (live since 2026-05-02) introduces a dual tenure model:

- **Forever** — pay once, no expiry, no renewals. The brand promise.
- **Annual** — 1-year renewable. Cheaper entry, 30-day grace period after expiry.

Existing V1 holders keep their names forever and can migrate to V2 Forever for **gas only** via `claimV1Forever`.

This guide is for wallet developers, explorer maintainers, and dApp builders who want to add `.igra` resolution to their product. Five-minute integration, zero infrastructure on your side.

---

## TL;DR

- **Free public REST API** at `https://insdomains.org/api/*` — CORS-enabled, no auth, no rate limit
- One `fetch()` resolves a name → address. Same surface for both V1 and V2 — the API unions the registries automatically.
- Source + tests open under [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains) (private; ping for read access)
- **273 Foundry tests, 0 failures**, 1024-run fuzz soak clean across V1 + V2
- All contracts owned by the Igra Treasury Safe at `0x7447F0e5…7aA1`
- No SDK to install, no DB to run, no indexer to maintain

---

## Why integrate

| | |
|---|---|
| **Native to Igra L2** | Resolution happens on the same chain users are already transacting on. No bridges, no L1 dependency. |
| **Dual tenure** | Forever names are permanent; Annual names give cheaper entry with predictable renewal. Wallets can render either via the unified `expiresAt` field (`0` = Forever, `> 0` = Annual unix timestamp). |
| **On-chain art** | Every NFT's `tokenURI` returns a Base64 SVG inline. No IPFS pinning, no CDN, no image-server dependency for displaying the user's name in your UI. |
| **ENS-compatible namehash** | The hardened INSResolverV2 at `0xcb2A450784849b85A797998EE220dC43d8B3f557` exposes the ENS surface (`addr(bytes32 node)` / `text(bytes32 node, string key)`) with trustless node→label binding. For most wallets the Registry's `resolve(label)` (Path 2) is simpler. Full `.eth` interop ships via the CCIP-Read gateway (`docs/ETH_INTEGRATION.md`). |
| **Live + audited** | 17+ names minted across V1 + V2, real sales settled, all events publicly verifiable on `https://explorer.igralabs.com`. |

---

## Integration paths

Three ways to integrate, in order of effort:

### Path 1 — REST API (5 minutes, zero infrastructure)

The fastest path. Hit our REST endpoints from your wallet's existing fetch layer. Cached at the edge for 30–60s, CORS-enabled, no auth. **API is V2-aware out of the box** — no flags, no separate endpoints. Reads union V2 + V1 transparently.

#### Forward resolve (name → address)

```ts
async function resolve(name: string) {
  const r = await fetch(
    `https://insdomains.org/api/resolve?name=${encodeURIComponent(name)}`
  );
  if (!r.ok) return null;
  const data = await r.json();
  if (!data.exists) return null;
  return {
    address:           data.address,
    owner:             data.owner,
    registry_version:  data.registry_version,  // "v1" | "v2"
    tenure:            data.tenure,            // "forever" | "annual"
    expires_at:        data.expires_at,        // unix-ts or null
  };
}

// Use in your send-flow:
const target = await resolve("alice.igra");
if (target) sendTransaction(target.address);
```

#### Reverse (address → primary name)

```ts
async function displayName(addr: `0x${string}`) {
  const r = await fetch(`https://insdomains.org/api/reverse?address=${addr}`);
  const { primary } = await r.json();
  return primary ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
```

#### "Your INS names" panel (on wallet connect)

```ts
async function myNames(addr: `0x${string}`) {
  const r = await fetch(`https://insdomains.org/api/names/by-owner?address=${addr}`);
  const { names } = await r.json();
  // names = [{
  //   tokenId, label, name, target, mintedAt,
  //   registry_version: "v1" | "v2",
  //   tenure: "forever" | "annual",
  //   expires_at: number | null,
  // }, ...]
  return names;
}

// Surfacing Annual expiry in a wallet:
for (const n of names) {
  if (n.tenure === "annual" && n.expires_at) {
    const daysLeft = Math.floor((n.expires_at * 1000 - Date.now()) / 86400000);
    if (daysLeft < 60) showRenewalReminder(n.name, daysLeft);
  }
}
```

#### Other endpoints

| | |
|---|---|
| `GET /api/names/recent?limit=50` | Most-recent registrations across V1 + V2. Each entry tagged with `registry_version` |
| `GET /api/marketplace/listings?limit=50` | Active marketplace listings (active+non-expired+seller-still-owns checked at fill time) |
| `GET /api/stats` | Total names, total volume, sale fee bps + V2 supply/balance/grace breakdown |
| `GET /api/nft-image/<tokenId>?size=200\|400\|800\|1200&v=1\|2` | Rendered NFT card PNG. Pass `v=2` for V2 token ids — V1+V2 ids collide at low numbers |
| `GET /api/reserved-labels` | Admin-flagged reserved names (blocked from public registration) |

Full reference + Python snippets in [`docs/API.md`](./API.md).

### Path 2 — Read contracts directly (no HTTP layer)

If you'd rather skip our API and read the chain yourself, every endpoint above is a thin wrapper around public view functions.

```ts
import { createPublicClient, http } from "viem";

const client = createPublicClient({
  transport: http("https://rpc.igralabs.com:8545"),
  chain: { id: 38833, name: "Igra", nativeCurrency: { name: "iKAS", symbol: "iKAS", decimals: 18 } },
});

// V2 is the canonical .igra Registry going forward; V1 stays read-only
// for legacy NFT viewing. Most wallets should query V2 first, fall
// through to V1 on miss (this matches the dApp + REST API behaviour).
const REGISTRY_V2 = "0x7E7018959bf44045F01D176D8db1594894CBf4E9";
const REGISTRY_V1 = "0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c";

async function resolveOnChain(label: string) {
  for (const registry of [REGISTRY_V2, REGISTRY_V1]) {
    const tokenId = await client.readContract({
      address: registry,
      abi: [{ name: "tokenIdOf", type: "function", stateMutability: "view",
              inputs: [{ name: "label", type: "string" }],
              outputs: [{ type: "uint256" }] }],
      functionName: "tokenIdOf",
      args: [label],
    });
    if (tokenId !== 0n) {
      const target = await client.readContract({
        address: registry,
        abi: [{ name: "targetOf", type: "function", stateMutability: "view",
                inputs: [{ name: "tokenId", type: "uint256" }],
                outputs: [{ type: "address" }] }],
        functionName: "targetOf",
        args: [tokenId],
      });
      return { registry, tokenId, target };
    }
  }
  return null;
}
```

V2-specific reads (Annual support):

```ts
// Forever-tier price / Annual-tier price-per-year for any label
const foreverPrice = await client.readContract({
  address: REGISTRY_V2, abi: [...],
  functionName: "priceFor", args: ["alice"],
}); // bigint, wei

const annualPerYear = await client.readContract({
  address: REGISTRY_V2, abi: [...],
  functionName: "priceAnnualFor", args: ["alice"],
}); // bigint, wei

// Whether a token has expired / is in 30-day grace
const isExpired = await client.readContract({
  address: REGISTRY_V2, abi: [...],
  functionName: "isExpired", args: [tokenId],
});
```

### Path 3 — ENS-compatible namehash (for ENS-only tooling)

The hardened **INSResolverV2** at `0xcb2A450784849b85A797998EE220dC43d8B3f557` exposes the ENS surface (`addr(bytes32 node)` / `text(bytes32 node, string key)`) for tooling that *only* speaks namehash and can't take a label string.

```
Resolver address: 0xcb2A450784849b85A797998EE220dC43d8B3f557   (verified on Blockscout)

function addr(bytes32 node) external view returns (address);
function text(bytes32 node, string calldata key) external view returns (string memory);
function nodeOf(string calldata label) external pure returns (bytes32);   // on-chain namehash helper
function cacheNode(string calldata label) external;                       // seed node→label (trustless, permissionless)
```

The namehash for `<label>.igra` = `keccak256(namehash("igra") ‖ keccak256(label))`, where `namehash("igra") = 0x845ae117fa3f88f78ba0d236aa4592959057d520889c7edd86b74d4123cc73e1`. You can also read it on-chain via `nodeOf(label)`.

**How resolution works:** `addr(node)` reads through a node→label map. A node must be seeded once via `cacheNode(label)` (anyone can call it — it derives the node from the label on-chain, so it can only ever create the *correct* binding; poisoning is impossible). `addr()` is also expiry-aware — an expired Annual name resolves to `address(0)`. Text records are owner-gated.

> Note: the original resolver at `0x451D84…5f2A` is **deprecated** (a namehash-poisoning issue in its permissionless `cacheNode(label, node)`). Point new integrations at `0xcb2A45…f557`.

For most wallets, **Path 1 (REST) or Path 2 (Registry `resolve(label)` / ReverseResolver `primaryName(address)`) is still the simplest** — use the namehash path only if you have an existing ENS resolver pipeline. Full `.igra.eth` resolution from any ENS-aware wallet ships separately via the CCIP-Read gateway (see `docs/ETH_INTEGRATION.md`).

---

## Live state (verifiable right now)

```bash
# Aggregate stats across V1 + V2 — proves chain reads work
curl https://insdomains.org/api/stats

# Most recent mints (union V1 + V2) — each tagged with registry_version
curl 'https://insdomains.org/api/names/recent?limit=5'

# Resolve a name — returns tenure + expires_at automatically
curl 'https://insdomains.org/api/resolve?name=igranetwork.igra'
# → { ..., "registry_version": "v2", "tenure": "forever", "expires_at": null }
```

If you see real JSON with token IDs and addresses, the API is healthy.

---

## Test suite + audit posture

| | |
|---|---|
| **Tests** | **273 passed · 0 failed · 0 skipped** (V1 + V2 + Marketplace + Resolver + ReverseResolver + SubnameExtension + Integration + TldVariants) |
| **Fuzz** | 1024 runs per fuzz test (15 fuzz tests = 15,360 fuzz iterations, no counter-examples) |
| **Coverage** | 100% lines on Resolver / ReverseResolver, 96–100% on Registry / Marketplace |
| **CI** | Full suite runs on every push at `.github/workflows/contracts.yml` |
| **Reproduce** | `cd contracts && forge test` |

Full report: [`contracts/test/TEST_REPORT.md`](../contracts/test/TEST_REPORT.md).
V2 design spec: [`docs/V2_SPEC.md`](./V2_SPEC.md).

Notable security properties locked down by the suite:
- Stale-safe reverse resolution (returns `""` if user transferred their primary token away)
- Approval-revoke kill-path (a seller revoking marketplace approval mid-listing reverts cleanly at fill time)
- Pause-can't-trap-sellers (kill-switch can disable buys but never blocks `cancelListing`)
- Refund-on-overpay (registration overpayment is refunded in the same tx, fuzzed across arbitrary inputs)
- Reentry guards on `createListing` + `buyListing`
- Fee-cap hardcoded at 500 bps (5%) — even a compromised owner can't extract more
- **V2-specific:** 30-day grace boundary semantics, V1→V2 migration idempotence, in-grace renewal extends from original `expiresAt` (no value lost), post-grace re-registration burns the stale NFT cleanly

---

## Contracts on Igra mainnet

All **explorer-verified** on `https://explorer.igralabs.com`:

### V2 — primary (since 2026-05-02)

| Contract | Address |
|---|---|
| **Registry V2 (`.igra`)** | `0x7E7018959bf44045F01D176D8db1594894CBf4E9` |
| Marketplace (shared) | `0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a` |
| ReverseResolver (shared) | `0x1bbd46aec04330a90832faf1da91889dee67d931` |
| Resolver (shared, ENS-compatible) | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` |
| Owner / Treasury (Safe multisig) | `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |

### V1 — legacy, read-only

| Contract | Address |
|---|---|
| Registry V1 (`.igra`) | `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` |

V1 NFTs remain in their holders' wallets indefinitely. Holders can migrate to V2 Forever for gas only via `INSRegistryIgraV2.claimV1Forever(v1TokenId, target)` — see the migration banner on https://insdomains.org/domains.

Source for every contract is at [`contracts/src/`](../contracts/src/) in the repo. Each has a corresponding test file under [`contracts/test/`](../contracts/test/).

---

## Live activity feed (test the chain end-to-end)

The activity bot at **[@insdomainsbot](https://t.me/insdomainsbot)** in the [INS Telegram](https://t.me/IgraNameService) posts every mint, listing, sale, **renewal, extend-to-Forever, and V1→V2 migration** in real time with the rendered NFT card. V2 cards show a cyan "V2 #N" badge so they're visually distinct from V1.

Useful as an integration smoke test — once your wallet can register a `.igra` name, you'll see the bot post your test mint within ~30 seconds.

---

## What we'd love your help with

In rough priority order — pick whichever fits your roadmap:

1. **`.igra` resolution in send-flows** — when a user types `alice.igra` in the to-address field, resolve via `/api/resolve` and send to the returned address. Show `alice.igra` next to `0x…` confirmations.
2. **Reverse-resolve display** — show `alice.igra` instead of `0xF9d0…125c` wherever you currently render an address (tx history, contact lists, recent recipients).
3. **"My INS names" tile** — on wallet-connect, fetch `/api/names/by-owner` and surface the user's owned names. Lets them see their identity at a glance + one-click open insdomains.org for management.
4. **Annual expiry reminders** — for users holding Annual names (`tenure === "annual"`), surface a "renews in X days" indicator when `expires_at` is within 60 days. Massive UX upgrade vs ENS-style "you missed renewal, name auctioned" emails.
5. **NFT-art display** — when the user holds an `.igra` NFT, render it natively via `tokenURI()` (it's a Base64 SVG, no extra fetch needed). V2 cards include the tenure pill automatically.
6. **Registration deep-link** — a "Register a permanent .igra name" CTA in your wallet UI that deep-links to `https://insdomains.org/app?q=<suggested>`.

---

## Contact

- **Repo** — [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains) (private; ping for read access)
- **Site** — [insdomains.org](https://insdomains.org)
- **X** — [@IgraNameService](https://x.com/IgraNameService)
- **Telegram (community)** — [@IgraNameService](https://t.me/IgraNameService)
- **Live mint feed** — [@insdomainsbot](https://t.me/insdomainsbot)
- **Reach out** — DM [@GoonBoyCrypto](https://t.me/GoonBoyCrypto) on Telegram. Happy to do a 15-minute integration walk-through, debug a specific call against the live RPC, or open a PR into your wallet repo.

The whole stack is open-source, the API is free forever, and there are real users + real volume on chain today. Drop in whenever you're ready.
