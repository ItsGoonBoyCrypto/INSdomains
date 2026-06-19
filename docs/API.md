# INS Public API

Free, open, CORS-enabled HTTP endpoints for integrating `.igra` name resolution into wallets, explorers, dApps, and bots. Wrap our smart contracts so you don't have to write a single line of contract-call code.

**Base URL:** `https://insdomains.org/api`

- All endpoints are **GET** only, JSON responses, CORS open (`Access-Control-Allow-Origin: *`).
- Cached at the edge (30–60s with `stale-while-revalidate`). Hit them as often as you like.
- No auth, no rate limit (please behave; reserve the right to add one if abused).
- Active TLD = **`.igra`** (legacy `.ins` / `.ikas` Registries remain on chain forever for existing holders, but the platform itself runs `.igra`-only since 2026-04-26).
- **V2-aware automatically.** Endpoints union V1 + V2 reads; each name in the response is tagged with `registry_version` (`"v1"` or `"v2"`), `tenure` (`"forever"` or `"annual"`), and `expires_at` (unix timestamp or null). No separate V2 endpoints — wallets just upgrade their consumers to read the new fields.
- Source: [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains) · contracts in `contracts/src/`, API routes in `app/api/`.

---

## Endpoints at a glance

| | |
|---|---|
| `GET /api/resolve?name=alice.igra` | name → address + owner + tokenId |
| `GET /api/reverse?address=0x…` | address → primary name |
| `GET /api/names/by-owner?address=0x…` | list every name an address holds |
| `GET /api/names/recent?limit=50` | most-recent registrations (explorers / "newly minted" feeds) |
| `GET /api/marketplace/listings?limit=50` | currently-active marketplace listings |
| `GET /api/stats` | totals: names, sales, volume, fee bps |
| `GET /api/reserved-labels` | admin-reserved labels |
| `GET /api/nft-image/<tokenId>?size=200|400|800|1200` | rendered NFT card PNG |

---

## `GET /api/resolve`

Forward resolution — **name → address**.

Query: `name` (required, e.g. `alice.igra` or just `alice`), `tld` (optional, default `igra`).

```bash
curl https://insdomains.org/api/resolve?name=alice.igra
```

**200 (found):**
```json
{
  "name": "alice.igra",
  "label": "alice",
  "tld": "igra",
  "tokenId": "5",
  "address": "0xF9d065b70C9357098dc7854D7A28B1498f6d125c",
  "owner":   "0xF9d065b70C9357098dc7854D7A28B1498f6d125c",
  "exists": true,
  "registry_version": "v2",
  "tenure": "forever",
  "expires_at": null
}
```

- `address` — resolver target (where to send tokens). Use this for send-to-name UIs.
- `owner` — current ERC-721 holder. Diverges from `address` if user transferred the NFT without updating target — flag that as "stale".
- `registry_version` — `"v1"` (legacy holders) or `"v2"` (current). V2 is queried first; V1 is the fallback.
- `tenure` — `"forever"` (V1 names + V2 Forever mints) or `"annual"` (V2 1-year mints).
- `expires_at` — unix timestamp for Annual names; `null` for Forever. Use to surface renewal reminders in wallet UIs.

**404 (not found):**
```json
{ "name": "ghost.igra", "label": "ghost", "tld": "igra", "address": null, "exists": false }
```

**400 (bad label):** `{ "error": "invalid_label", "label": "...", "tld": null }`

Label rules:
- ASCII labels: 1–32 chars, lowercase `a-z` / digits / hyphens, no leading or trailing hyphen.
- **Emoji & Unicode**: pass either the beautified form (`🔥.igra`) or the Punycode form (`xn--4v8h.igra`). The API canonicalizes via ENSIP-15 (the ENS normalization standard, Unicode 17.0) + Punycode encoding. Max 32 graphemes; the encoded `xn--…` form must fit the same 32-byte on-chain cap. Mixed-script and homograph labels (Cyrillic `а` look-alikes, Latin+Greek mixes, zero-width invisibles, bidi controls) are rejected at the API boundary.

Every successful response includes the full quartet so integrators can pick whichever form fits their UI:

```json
{
  "name":            "🔥.igra",          // beautified for display
  "label":           "xn--4v8h",         // contract label (use for namehash, register())
  "display_label":   "🔥",
  "punycode_name":   "xn--4v8h.igra",    // pure ASCII form
  "normalized_name": "🔥.igra"           // ENSIP-15 canonical (FE0F stripped)
}
```

---

## `GET /api/reverse`

Reverse resolution — **address → primary name**.

Query: `address` (required, any case).

```bash
curl https://insdomains.org/api/reverse?address=0xF9d065b70C9357098dc7854D7A28B1498f6d125c
```

```json
{
  "address": "0xf9d065b70c9357098dc7854d7a28b1498f6d125c",
  "primary": "insdomains.igra",
  "primary_version": "v2",
  "primaries": {
    "igra_v2": "insdomains",
    "igra":    null,
    "ins":     null,
    "ikas":    null
  }
}
```

The top-level `primary` field selects across all four reverse resolvers in this precedence order: **V2 `.igra`** → V1 `.igra` → V1 `.ins` → V1 `.ikas`. The companion `primary_version` field tells you which Registry the answer came from (`"v2"` for the canonical post-launch RR, `"v1"` for legacy holders).

The `primaries` map gives you the full per-source breakdown — use this if you want to display all primaries side-by-side or apply a custom precedence rule.

If the user has set no primary on any RR, both `primary` and `primary_version` are `null` and every `primaries.*` is `null`. Always 200 on a valid address — "no primary" is a valid state.

**Stale-safe**: if the user no longer owns the token they previously set as primary, the underlying contract returns `""` and we drop it from the response. You'll never see a name that's been transferred away.

**Backwards compatibility:** the `primaries.ins/igra/ikas` keys preserved their v1 shape (V1-only reads). The V2 read was added as a new `primaries.igra_v2` key so integrators on the original v1 API continue to work without changes.

---

## `GET /api/names/by-owner` *(new in v2)*

List every active name an address currently holds. Use this on wallet connect to populate the user's "My INS names" panel — without you having to scan Transfer events yourself.

Query: `address` (required), `tld` (optional, default `igra`).

```bash
curl "https://insdomains.org/api/names/by-owner?address=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
```

```json
{
  "address": "0x7447f0e5cdfa55cef123f8d2e0b2c981d1807aa1",
  "tld": "igra",
  "count": 2,
  "names": [
    {
      "tokenId": "4",
      "label": "igranetwork",
      "name": "igranetwork.igra",
      "target": "0x7447f0e5cdfa55cef123f8d2e0b2c981d1807aa1",
      "mintedAt": 1735100000,
      "registry_version": "v2",
      "tenure": "forever",
      "expires_at": null
    },
    {
      "tokenId": "1",
      "label": "oioisavaloy",
      "name": "oioisavaloy.igra",
      "target": "0x7447f0e5cdfa55cef123f8d2e0b2c981d1807aa1",
      "mintedAt": 1735000000,
      "registry_version": "v2",
      "tenure": "annual",
      "expires_at": 1809269169
    }
  ]
}
```

Sorted: most-recently-minted first across both V1 and V2. Filters out names the user has since transferred away (we re-check `ownerOf` on every candidate token).

**Annual expiry reminders** — surface a renewal CTA when `tenure === "annual"` and `expires_at` is within ~60 days:
```ts
const daysLeft = Math.floor((n.expires_at * 1000 - Date.now()) / 86400000);
if (n.tenure === "annual" && daysLeft < 60) showRenewBanner(n.name, daysLeft);
```

---

## `GET /api/names/recent` *(new in v2)*

Most-recently-registered names. For "newly minted" feeds in explorers + wallet UIs.

Query: `tld` (default `igra`), `limit` (1–200, default 50).

```bash
curl https://insdomains.org/api/names/recent?limit=10
```

```json
{
  "tld": "igra",
  "count": 10,
  "names": [
    {
      "tokenId": "4",
      "label": "igranetwork",
      "name": "igranetwork.igra",
      "owner": "0x...",
      "target": "0x...",
      "mintedAt": 1735100000,
      "blockNumber": "5500000",
      "txHash": "0x...",
      "registry_version": "v2",
      "tenure": "forever",
      "expires_at": null
    },
    {
      "tokenId": "13",
      "label": "satoshi",
      "name": "satoshi.igra",
      "owner": "0x...",
      "target": "0x...",
      "mintedAt": 1735000000,
      "blockNumber": "5176410",
      "txHash": "0x...",
      "registry_version": "v1",
      "tenure": "forever",
      "expires_at": null
    }
  ]
}
```

Mints from V1 + V2 are unioned chronologically (newest first across both registries). For .igra, V2 events include both fresh mints AND `V1Migrated` claims (a V1 holder upgrading to V2 Forever for free).

---

## `GET /api/marketplace/listings` *(new in v2)*

Currently-active listings on the `.igra` Marketplace. The contract's `getActiveListing(tokenId)` does the staleness check (active flag + expiry + seller-still-owns), so what you see here is fillable-right-now.

Query: `tld` (default `igra`), `limit` (1–200, default 50), `featured=true` (only featured, default all).

```bash
curl https://insdomains.org/api/marketplace/listings?limit=20
```

```json
{
  "tld": "igra",
  "marketplace": "0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a",
  "count": 3,
  "listings": [
    {
      "tokenId": "5",
      "label": "alice",
      "name": "alice.igra",
      "seller": "0x...",
      "price": "30000000000000000000",
      "price_ikas": "30",
      "expiry": 1767536000,
      "expires_in_seconds": 31536000,
      "featured": true
    },
    …
  ]
}
```

Sorted: featured first, then by price descending. `price` is wei (string to avoid JS `BigInt` issues); `price_ikas` is a human-readable convenience.

---

## `GET /api/stats` *(new in v2)*

Aggregate counts. Useful for status-page badges, "X names minted" UIs, and integration-test smoke checks.

```bash
curl https://insdomains.org/api/stats
```

```json
{
  "chain_id": 38833,
  "network": "Igra L2 mainnet",
  "live_tlds": ["igra"],
  "by_tld": {
    "igra": {
      "registry": "0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c",
      "marketplace": "0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a",
      "total_supply": 13,
      "registry_balance_ikas": "320",
      "marketplace_paused": false,
      "sale_fee_bps": 200,
      "feature_fee_bps": 100,
      "total_volume_ikas": "25",
      "total_sales": 2
    }
  },
  "v2": {
    "registry": "0x7E7018959bf44045F01D176D8db1594894CBf4E9",
    "total_supply": 4,
    "registry_balance_ikas": "0",
    "grace_period_sec": 2592000
  },
  "totals": { "names": 17, "sales": 2, "volume_ikas": "25" }
}
```

- `by_tld.igra` — V1 Registry + shared Marketplace stats (legacy holders' state).
- `v2` — V2 Registry stats (current). `total_supply` is V2 mints only; `grace_period_sec` is the on-chain Annual grace window (default 30 days, admin-tunable [7d, 365d]).
- `totals.names` — sum of V1 + V2 supply.

---

## `GET /api/reserved-labels`

List of labels currently reserved on a given TLD (admin-flagged to block public registration).

Query: `tld` (default `igra`).

```bash
curl https://insdomains.org/api/reserved-labels
```

```json
{ "tld": "igra", "labels": ["alphaprism", "dao", "dev", …, "zealous"] }
```

---

## `GET /api/nft-image/<tokenId>?size=…&v=…`

Returns a rendered PNG card of the NFT, generated server-side via `next/og`. Use as a thumbnail in feeds, share-to-X cards, Telegram embeds.

Sizes: `200` (default, TG-friendly), `400`, `800`, `1200` (X / retina).
Versions: `v=1` (default — reads from V1 Registry) or `v=2` (reads from V2 Registry — required for V2 token ids since V1 + V2 id spaces both start at 1).

```html
<!-- V1 token #5 -->
<img src="https://insdomains.org/api/nft-image/5?size=400" />

<!-- V2 token #5 (different name, different card) -->
<img src="https://insdomains.org/api/nft-image/5?size=400&v=2" />
```

V2 cards include a cyan **`V2 #N`** badge and an Annual expiry pill (when applicable) so they're visually distinct from V1.

Cached 1h at the edge.

---

## Reading contracts directly (if you'd rather not depend on this API)

Every endpoint is a pass-through to public view functions. If you want to skip HTTP, the addresses + ABIs are below — verify on `https://explorer.igralabs.com`.

**Chain:** Igra L2 mainnet · chain ID **38833** · RPC `https://rpc.igralabs.com:8545` · native `iKAS` (18 decimals).

### `.igra` Registry V2 (current) — `0x7E7018959bf44045F01D176D8db1594894CBf4E9`

V2 is the canonical Registry as of 2026-05-02. Strict superset of V1 — same reads work, plus the dual-tenure surface.

```solidity
// Shared with V1
function tokenIdOf(string label)         external view returns (uint256);
function labelOf(uint256 tokenId)        external view returns (string memory);
function ownerOf(uint256 tokenId)        external view returns (address);
function targetOf(uint256 tokenId)       external view returns (address);
function priceFor(string label)          external view returns (uint256); // Forever
function available(string label)         external view returns (bool);
function totalSupply()                   external view returns (uint256);
function register(string label, address target) external payable returns (uint256);

// V2-only
function priceAnnualFor(string label)    external view returns (uint256); // per year
function availableAnnual(string label)   external view returns (bool);
function expiresAt(uint256 tokenId)      external view returns (uint256); // 0 = Forever
function isExpired(uint256 tokenId)      external view returns (bool);
function isInGrace(uint256 tokenId)      external view returns (bool);
function gracePeriodSec()                external view returns (uint256); // default 30 days
function v1Registry()                    external view returns (address);
function migrated(uint256 v1TokenId)     external view returns (bool);

function registerAnnual(string label, address target, uint256 yearsCount)
                                         external payable returns (uint256);
function renew(uint256 tokenId, uint256 yearsToAdd) external payable;
function extendToForever(uint256 tokenId) external payable;
function claimV1Forever(uint256 v1TokenId, address target) external returns (uint256);
```

V2 events worth indexing (in addition to standard ERC-721 `Transfer`):

```solidity
event Registered(string indexed label, address indexed owner, address target, uint256 paid);
event RegisteredAnnual(string indexed label, address indexed owner, address target,
                       uint256 paid, uint256 expiresAt, uint256 yearsCount);
event Renewed(uint256 indexed tokenId, address indexed payer,
              uint256 yearsAdded, uint256 paid, uint256 newExpiresAt);
event ExtendedToForever(uint256 indexed tokenId, address indexed payer, uint256 paid);
event V1Migrated(uint256 indexed v1TokenId, uint256 indexed v2TokenId,
                 string label, address owner);
```

### `.igra` Registry V1 (legacy, read-only) — `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c`

V1 NFTs remain in their holders' wallets indefinitely. Holders can migrate to V2 Forever for gas only via `INSRegistryIgraV2.claimV1Forever(v1TokenId, target)`. Same read surface as V2 minus the Annual + migration functions.

```solidity
function tokenIdOf(string label) external view returns (uint256);
function labelOf(uint256 tokenId) external view returns (string memory);
function ownerOf(uint256 tokenId) external view returns (address);
function targetOf(uint256 tokenId) external view returns (address);
function priceFor(string label) external view returns (uint256);
function available(string label) external view returns (bool);
function totalSupply() external view returns (uint256);
function register(string label, address target) external payable returns (uint256);
```

### `.igra` Marketplace — `0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a`

```solidity
function listings(uint256 tokenId) external view returns (
    address seller, uint64 expiry, bool featured, bool active, uint256 price
);
function getActiveListing(uint256 tokenId) external view returns (
    (address seller, uint64 expiry, bool featured, bool active, uint256 price)
);
function createListing(uint256 tokenId, uint256 price, uint64 expiry, bool featured) external payable;
function buyListing(uint256 tokenId) external payable;
function cancelListing(uint256 tokenId) external;
```

### `.igra` ReverseResolver — `0x1bbd46aec04330a90832faf1da91889dee67d931`

```solidity
function setPrimary(uint256 tokenId) external;
function clearPrimary() external;
function primaryName(address user) external view returns (string memory);
```

### Shared Resolver (ENS-compatible) — `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A`

```solidity
function addr(bytes32 node) external view returns (address);
function text(bytes32 node, string key) external view returns (string memory);
function cacheNode(string label, bytes32 node) external;  // trust-on-first-write
```

Useful if you're integrating via a system that already speaks ENS namehash (Blockscout BENS, existing ENS SDKs, etc.).

### Owner / Treasury — Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1`

All admin-only functions on every contract above are gated to this address. Multisig at `safe.igralabs.com`.

---

## Contract verification + audit

- All contracts deployed from [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains) (MIT-licensed)
- **273 Foundry tests, 0 failures** — full report at `contracts/test/TEST_REPORT.md` in repo (V1 + V2 + Marketplace + Resolver + ReverseResolver + SubnameExtension + Integration + TldVariants)
- 1024-run fuzz soak across 15 fuzz tests (15,360 fuzz iterations, all clean)
- Coverage: 100% lines on Resolver / ReverseResolver, 96-100% lines on Registry / Marketplace
- Verified on-chain via `cast call` or the Igra explorer (V2 verified on Blockscout 2026-05-02)
- Each deployer wallet drained immediately after `transferOwnership` to the Safe in the same broadcast — no live deployer keys retain admin rights

---

## Quick start: TypeScript wallet integration

```ts
// One fetch, full resolver
async function resolve(name: string) {
  const r = await fetch(`https://insdomains.org/api/resolve?name=${encodeURIComponent(name)}`);
  if (!r.ok) return null;
  const data = await r.json();
  return data.exists ? { address: data.address, owner: data.owner } : null;
}

// Display name OR shortened 0x in your UI
async function displayName(addr: `0x${string}`) {
  const r = await fetch(`https://insdomains.org/api/reverse?address=${addr}`);
  const { primary } = await r.json();
  return primary ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// "My .igra names" on wallet connect
async function myNames(addr: `0x${string}`) {
  const r = await fetch(`https://insdomains.org/api/names/by-owner?address=${addr}`);
  const { names } = await r.json();
  return names; // [{ tokenId, label, name, target, mintedAt }]
}
```

```python
import requests

def resolve(name):
    r = requests.get("https://insdomains.org/api/resolve", params={"name": name}).json()
    return (r["address"], r["owner"]) if r.get("exists") else None

def my_names(address):
    return requests.get(
        "https://insdomains.org/api/names/by-owner", params={"address": address}
    ).json()["names"]
```

---

## Changelog

- **v3** (2026-05-02) — V2 Registry deployed. Endpoints transparently union V1 + V2 reads. New response fields: `registry_version`, `tenure`, `expires_at`. `/api/stats` gains a `v2:` block. `/api/nft-image` gains `?v=2` query param for V2 token ids. New V2-only contract reads documented: `priceAnnualFor`, `expiresAt`, `isExpired`, `isInGrace`, `registerAnnual`, `renew`, `extendToForever`, `claimV1Forever`. Test count refreshed to 273.
- **v2** (2026-04-30) — Added `/api/names/by-owner`, `/api/names/recent`, `/api/marketplace/listings`, `/api/stats`. Documented `/api/nft-image`. Pivoted documentation to `.igra`-only.
- **v1** (2026-04-24) — Initial public API. `/api/resolve`, `/api/reverse`, `/api/reserved-labels`.

## Contact

- Site: https://insdomains.org
- Telegram: https://t.me/IgraNameService
- Repo / issues: https://github.com/ItsGoonBoyCrypto/INSdomains
- Bot (live mint feed): https://t.me/insdomainsbot
