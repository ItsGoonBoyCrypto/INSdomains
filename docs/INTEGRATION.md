# INS — Integration Guide for Wallets & Explorers

**INS (Igra Name Service)** is a permanent ENS-style name service native to **Igra L2** (chain ID `38833`, native `iKAS`). One-time payment, no renewals, no expiry — every name is an ERC-721 NFT with on-chain SVG art.

This guide is for wallet developers, explorer maintainers, and dApp builders who want to add `.igra` name resolution to their product. It takes about 5 minutes and requires no contract-call or event-scan code on your side.

---

## TL;DR

- **Free public REST API** at `https://insdomains.org/api/*` — CORS-enabled, no auth, no rate limit
- One `fetch()` resolves a name → address. One more for the reverse direction.
- Source + tests open under [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains) (private; ask for read access)
- **170 Foundry tests, 0 failures**, 1024-run fuzz soak clean
- All contracts owned by an Igra Safe multisig at `0x7447F0e5…7aA1`
- No SDK to install, no DB to run, no indexer to maintain

---

## Why integrate

| | |
|---|---|
| **Native to Igra L2** | Resolution happens on the same chain users are already transacting on. No bridges, no L1 dependency. |
| **Permanent** | The Registry has no `expire` or `renew` function. Once minted, a name belongs to the holder until they sell it. Wallets never have to surface "your name is about to expire" UX. |
| **On-chain art** | Every NFT's `tokenURI` returns a Base64 SVG inline. No IPFS pinning, no CDN, no image-server dependency for displaying the user's name in your UI. |
| **ENS-compatible namehash** | The shared Resolver at `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` exposes `addr(bytes32 node)` and `text(bytes32 node, string key)` — same surface as ENS. If you already integrate ENS via namehash, this is a one-liner. |
| **Live + audited** | 13+ names already minted, 2 sales already settled, all events publicly verifiable on `https://explorer.igralabs.com`. |

---

## Integration paths

Three ways to integrate, in order of effort:

### Path 1 — REST API (5 minutes, zero infrastructure)

The fastest path. Hit our REST endpoints from your wallet's existing fetch layer. Cached at the edge for 30–60s, CORS-enabled, no auth.

#### Forward resolve (name → address)

```ts
async function resolve(name: string) {
  const r = await fetch(
    `https://insdomains.org/api/resolve?name=${encodeURIComponent(name)}`
  );
  if (!r.ok) return null;
  const data = await r.json();
  return data.exists ? { address: data.address, owner: data.owner } : null;
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
  // names = [{ tokenId, label, name, target, mintedAt }, ...]
  return names;
}
```

#### Other endpoints

| | |
|---|---|
| `GET /api/names/recent?limit=50` | Most-recent registrations — for "newly minted" feeds in explorers |
| `GET /api/marketplace/listings?limit=50` | Currently-active marketplace listings (active+non-expired+seller-still-owns checked at fill time) |
| `GET /api/stats` | Total names, total volume, sale fee bps — for status-page badges |
| `GET /api/nft-image/<tokenId>?size=200|400|800|1200` | Rendered NFT card PNG — drop straight into `<img>` tags |
| `GET /api/reserved-labels` | Admin-flagged reserved names (blocked from public registration) |

Full reference + Python snippets in [`docs/API.md`](./API.md).

### Path 2 — Read contracts directly (no HTTP layer)

If you'd rather skip our API and read the chain yourself, every endpoint above is a thin wrapper around public view functions. The same data via `eth_call`:

```ts
import { createPublicClient, http } from "viem";

const client = createPublicClient({
  transport: http("https://rpc.igralabs.com:8545"),
  chain: { id: 38833, name: "Igra", nativeCurrency: { name: "iKAS", symbol: "iKAS", decimals: 18 } },
});

const REGISTRY = "0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c";

const tokenId = await client.readContract({
  address: REGISTRY,
  abi: [{ name: "tokenIdOf", type: "function", stateMutability: "view",
          inputs: [{ name: "label", type: "string" }],
          outputs: [{ type: "uint256" }] }],
  functionName: "tokenIdOf",
  args: ["alice"],
});
// tokenId === 0n means not minted

if (tokenId !== 0n) {
  const target = await client.readContract({
    address: REGISTRY,
    abi: [{ name: "targetOf", type: "function", stateMutability: "view",
            inputs: [{ name: "tokenId", type: "uint256" }],
            outputs: [{ type: "address" }] }],
    functionName: "targetOf",
    args: [tokenId],
  });
  // `target` is what to send to.
}
```

### Path 3 — ENS-compatible namehash (drop into existing ENS code)

If your wallet already has an ENS resolution flow that calls `Resolver.addr(node)`, you can point it at our shared Resolver:

```
Resolver address: 0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A

function addr(bytes32 node) external view returns (address);
function text(bytes32 node, string calldata key) external view returns (string memory);
```

The namehash for `<label>.igra` is computed the same way as ENS (`namehash("igra")` then `keccak256(parent ‖ keccak256(label))`). One-liner addition to your existing namehash resolver registry.

---

## Live state (verifiable right now)

Anyone can confirm the API is live without permissions. Hit these from your terminal:

```bash
# Aggregate stats — proves the chain reads work
curl https://insdomains.org/api/stats

# Most recent mints — proves event scans + multicall reads work
curl 'https://insdomains.org/api/names/recent?limit=5'

# Pick a known holder — proves owner-lookup works
curl 'https://insdomains.org/api/names/by-owner?address=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1'
```

If you see real JSON with token IDs and addresses, the API is healthy.

---

## Test suite + audit posture

| | |
|---|---|
| **Tests** | 170 passed · 0 failed · 0 skipped |
| **Fuzz** | 1024 runs per fuzz test (7 fuzz tests = 7,168 fuzz iterations, no counter-examples) |
| **Coverage** | 100% lines on Resolver / ReverseResolver, 96–100% on Registry / Marketplace |
| **CI** | Full suite runs on every push at `.github/workflows/contracts.yml` |
| **Reproduce** | `cd contracts && forge test` |

Full report: [`contracts/test/TEST_REPORT.md`](../contracts/test/TEST_REPORT.md).

Notable security properties locked down by the suite:
- Stale-safe reverse resolution (returns `""` if user transferred their primary token away)
- Approval-revoke kill-path (a seller revoking marketplace approval mid-listing reverts cleanly at fill time)
- Pause-can't-trap-sellers (kill-switch can disable buys but never blocks `cancelListing`)
- Refund-on-overpay (registration overpayment is refunded in the same tx, fuzzed across arbitrary inputs)
- Reentry guards on `createListing` + `buyListing`
- Fee-cap hardcoded at 500 bps (5%) — even a compromised owner can't extract more

---

## Contracts on Igra mainnet

All four are **explorer-verified** on `https://explorer.igralabs.com`:

| Contract | Address |
|---|---|
| Registry (`.igra`) | `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` |
| Marketplace (`.igra`) | `0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a` |
| ReverseResolver (`.igra`) | `0x1bbd46aec04330a90832faf1da91889dee67d931` |
| Resolver (shared, ENS-compatible) | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` |
| Owner / Treasury (Safe multisig) | `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |

Source for every contract is at [`contracts/src/`](../contracts/src/) in the repo. Each has a corresponding test file under [`contracts/test/`](../contracts/test/).

---

## Live activity feed (test the chain end-to-end)

The activity bot at **[@insdomainsbot](https://t.me/insdomainsbot)** in the [INS Telegram](https://t.me/IgraNameService) posts every mint, listing, and sale in real time with the rendered NFT card. Useful as an integration smoke test — once your wallet can register a `.igra` name, you'll see the bot post your test mint within ~30 seconds.

---

## What we'd love your help with

In rough priority order — pick whichever fits your roadmap:

1. **`.igra` resolution in send-flows** — when a user types `alice.igra` in the to-address field, resolve via `/api/resolve` and send to the returned address. Show `alice.igra` next to `0x…` confirmations.
2. **Reverse-resolve display** — show `alice.igra` instead of `0xF9d0…125c` wherever you currently render an address (tx history, contact lists, recent recipients).
3. **"My INS names" tile** — on wallet-connect, fetch `/api/names/by-owner` and surface the user's owned names. Lets them see their identity at a glance + one-click open insdomains.org for management.
4. **NFT-art display** — when the user holds an `.igra` NFT, render it natively via `tokenURI()` (it's a Base64 SVG, no extra fetch needed).
5. **Registration deep-link** — a "Register a permanent .igra name" CTA in your wallet UI that deep-links to `https://insdomains.org/app?q=<suggested>`.

---

## Contact

- **Repo** — [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains) (private; ping for read access)
- **Site** — [insdomains.org](https://insdomains.org)
- **Telegram (community)** — [@IgraNameService](https://t.me/IgraNameService)
- **Live mint feed** — [@insdomainsbot](https://t.me/insdomainsbot)
- **Reach out** — DM [@GoonBoyCrypto](https://t.me/GoonBoyCrypto) on Telegram. Happy to do a 15-minute integration walk-through, debug a specific call against the live RPC, or open a PR into your wallet repo.

The whole stack is open-source, the API is free forever, and there are real users + real volume on chain today. Drop in whenever you're ready.
