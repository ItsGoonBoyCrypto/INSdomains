# INS Public Resolver API

Free, open, CORS-enabled HTTP endpoints for resolving INS names on Igra Network. Use these if you'd rather not read contracts directly — one `fetch()` and you're done.

**Base URL:** `https://insdomains.org/api`

- All endpoints are **GET** only.
- All responses are JSON.
- CORS is open (`Access-Control-Allow-Origin: *`), so you can call from a browser.
- Responses are cached at the edge for 60s (with `stale-while-revalidate: 120s`). Feel free to call as often as you like.
- No auth, no rate limit (please behave; I reserve the right to add one if abused).
- Supports all three INS TLDs: `.ins`, `.igra`, `.ikas`.

---

## `GET /api/resolve`

Forward resolution — **name → address**.

### Query params

| Param | Required | Description |
|---|---|---|
| `name` | yes | The label to resolve. Either `"alice.ins"` (full name with suffix) or just `"alice"` (use `tld=` to pick one). |
| `tld` | optional | `ins` \| `igra` \| `ikas`. Only used if `name` has no suffix. If both are omitted, the endpoint searches all three TLDs in order (`.ins` → `.igra` → `.ikas`) and returns the first match. |

### Response — 200 (found)

```json
{
  "name": "alice.ins",
  "label": "alice",
  "tld": "ins",
  "tokenId": "1",
  "address": "0xF9d065b70C9357098dc7854D7A28B1498f6d125c",
  "owner":   "0xF9d065b70C9357098dc7854D7A28B1498f6d125c",
  "exists": true
}
```

- `address` — the resolver target (where the user wants sends to land). **This is what you want for send-to-name flows.**
- `owner` — the current ERC-721 holder. Usually the same as `address`, but they diverge when a user transfers the NFT without updating the target. Use this to flag "target is stale — owner is different" warnings.
- `tokenId` — the on-chain ERC-721 token id (as string, to avoid JS BigInt issues).

### Response — 404 (not found)

```json
{
  "name": "nonexistent.ins",
  "label": "nonexistent",
  "tld": "ins",
  "address": null,
  "exists": false
}
```

### Response — 400 (invalid label)

```json
{ "error": "invalid_label", "label": "...", "tld": null }
```

Label rules: 1–32 chars, lowercase `a-z` / digits / hyphens, no leading or trailing hyphen.

### Examples

```bash
# Full name with suffix
curl https://insdomains.org/api/resolve?name=alice.ins

# Label + explicit tld
curl "https://insdomains.org/api/resolve?name=alice&tld=igra"

# Search all three TLDs (preference: .ins → .igra → .ikas)
curl https://insdomains.org/api/resolve?name=alice
```

```ts
// TypeScript / browser / Node
const r = await fetch(`https://insdomains.org/api/resolve?name=${encodeURIComponent(input)}`);
const data = await r.json();
if (data.exists) {
  send(data.address);
} else {
  showNotFound();
}
```

```python
import requests
r = requests.get("https://insdomains.org/api/resolve", params={"name": "alice.ins"}).json()
if r["exists"]:
    address = r["address"]
```

---

## `GET /api/reverse`

Reverse resolution — **address → primary name(s)**. Fans out across all 3 per-TLD reverse resolvers and returns whichever primaries are set.

### Query params

| Param | Required | Description |
|---|---|---|
| `address` | yes | The EVM address to reverse-resolve. Any case. |

### Response — 200

```json
{
  "address": "0xf9d065b70c9357098dc7854d7a28b1498f6d125c",
  "primary": "alice.ins",
  "primaries": {
    "ins":  "alice.ins",
    "igra": "alice.igra",
    "ikas": null
  }
}
```

- `primary` — a single name picked in preference order `.ins → .igra → .ikas`. Use this for the "name next to 0x…" UI in wallets / explorers / send-screens.
- `primaries` — per-TLD breakdown. Use this if you want to show multiple primaries (e.g. a profile page listing every TLD the user has claimed) or pick by a different rule.

If the user has set no primary on any TLD, both `primary` and all three `primaries.*` entries are `null`. The endpoint **always returns 200** on a valid-address input — "no primary" is a valid state, not an error.

### Stale-safety

The underlying contracts return `""` if the user no longer owns the token they previously set as primary, so you'll never see a name that's been transferred away. The API preserves this behaviour — sold-off names disappear from the response automatically.

### Response — 400 (invalid address)

```json
{ "error": "invalid_address", "address": "not-an-address" }
```

### Examples

```bash
# Basic reverse lookup
curl https://insdomains.org/api/reverse?address=0xF9d065b70C9357098dc7854D7A28B1498f6d125c
```

```ts
// Display name-or-0x in a UI
async function displayName(addr: `0x${string}`) {
  const r = await fetch(`https://insdomains.org/api/reverse?address=${addr}`);
  const { primary } = await r.json();
  return primary ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
```

```ts
// Show every primary the user has set, per-TLD
async function allPrimaries(addr: `0x${string}`) {
  const r = await fetch(`https://insdomains.org/api/reverse?address=${addr}`);
  const { primaries } = await r.json();
  return Object.entries(primaries).filter(([, name]) => name !== null);
}
```

---

## `GET /api/reserved-labels`

Returns the list of labels currently reserved on a given TLD (from on-chain event history). Useful for admin / management dashboards and for previewing which brand labels are locked down.

### Query params

| Param | Required | Description |
|---|---|---|
| `tld` | optional | `ins` \| `igra` \| `ikas`. Defaults to `ins`. Unknown values fall back to `ins`. |

### Response

```json
{
  "tld": "ins",
  "labels": ["alphaprism", "dao", "dev", "…", "zealous"]
}
```

First request per TLD can take several seconds while it scans the chain; subsequent calls are edge-cached.

---

## Reading contracts directly (if you'd rather not depend on this API)

Everything this API does is a pass-through to public view functions on Igra mainnet. If you want to skip the HTTP layer, here are the addresses:

**Chain:** Igra mainnet · chain ID **38833** · RPC `https://rpc.igralabs.com:8545`

### Forward resolution (name → address)

Call on the Registry for the TLD you want:

```
.ins    0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46
.igra   0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c
.ikas   0xe705e38DeF4970e23617d30D9774062FEeEBA610

function tokenIdOf(string label) external view returns (uint256);
function targetOf(uint256 tokenId) external view returns (address);
function ownerOf(uint256 tokenId) external view returns (address);
```

If `tokenIdOf` returns `0`, the name isn't minted. Pass the label **without** the suffix — the registry contract you call IS the TLD.

### Reverse resolution (address → primary name)

Call on the ReverseResolver for each TLD you care about:

```
.ins    0x9afb263be198c35159FafDafa0729Fc8B13562DA
.igra   0x1bbd46aec04330a90832faf1da91889dee67d931
.ikas   0x9963aa24327f513b4cd5ce8118027a1da2fe76b5

function primaryName(address user) external view returns (string memory);
```

Returns the full name (e.g. `"alice.ins"`) or empty string if no primary set or the user no longer owns the token.

### ENS-compatible namehash resolver (shared across all 3 TLDs)

Also available at `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A`:

```
function addr(bytes32 node) external view returns (address);
function text(bytes32 node, string calldata key) external view returns (string memory);
function cacheNode(string calldata label, bytes32 node) external;  // trust-on-first-write
```

Use this if you're integrating via a system that already speaks ENS-style namehash resolution (Blockscout BENS, existing ENS SDKs, etc.). Forward namehash resolution works; reverse is per-TLD via the contracts above.

---

## Contract verification

All 10 contracts:
- Deployed from the [INSdomains repo](https://github.com/ItsGoonBoyCrypto/INSdomains) (MIT, 116 Foundry tests)
- Owned by the Igra Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1`
- Verifiable on-chain via `cast call` or the Igra explorer
- Deployer wallet retained only for future deploys; owns none of the running contracts

## Status / changelog

- **v1** (2026-04-24) — Initial public API. `/api/resolve`, `/api/reverse`, `/api/reserved-labels`.

## Contact

- Telegram: https://t.me/IgraNameService
- Repo / issues: https://github.com/ItsGoonBoyCrypto/INSdomains
- Site: https://insdomains.org
