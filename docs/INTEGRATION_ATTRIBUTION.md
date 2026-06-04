# INS Integration — Attribution / Leaderboard / Pool Pages

**For: mining pools, validator leaderboards, contributor attribution
pages, hall-of-fame screens, any UI that lists many EVM addresses
and wants to humanize them with on-chain names.**

You have a list of `0x…` addresses. INS turns them into `alice.igra`
+ optional NFT card. Five-minute integration, zero infrastructure on
your side.

> **Live REST API, CORS-enabled, no auth, no rate limit:** `https://insdomains.org/api/*`

If you're integrating a wallet's send flow instead, see [INTEGRATION.md](./INTEGRATION.md) — it covers forward resolution + ENS-compatible namehash paths. This doc is the attribution-page subset.

---

## TL;DR — the 30-line drop-in

Shows `alice.igra` (with a click-through to the holder's INS profile)
wherever the holder has a `.igra` name; falls back to a truncated
address otherwise. Pure browser JS, no build step.

```js
const insCache = new Map();              // per-page in-memory cache
const fmt = (a) => `${a.slice(0,6)}…${a.slice(-4)}`;

async function getInsName(address) {
  const a = address.toLowerCase();
  if (insCache.has(a)) return insCache.get(a);
  const p = fetch(`https://insdomains.org/api/reverse?address=${a}`)
    .then(r => r.ok ? r.json() : null)
    .then(d => d?.primary || null)
    .catch(() => null);
  insCache.set(a, p);
  return p;
}

async function renderAddress(address) {
  const name = await getInsName(address);
  if (!name) return fmt(address);
  return `<a href="https://insdomains.org/n/${encodeURIComponent(name)}"
            target="_blank" rel="noopener" class="ins-name">${name}</a>`;
}
```

That's the whole integration. Drop it into your row renderer.

---

## Reverse resolution endpoint

```
GET https://insdomains.org/api/reverse?address=0x…
```

Response shape:

```json
{
  "address":          "0x7447f0e5cdfa55cef123f8d2e0b2c981d1807aa1",
  "primary":          "insdomains.igra",
  "primary_version":  "v2",
  "primaries":        { "igra_v2": "insdomains.igra", "igra": null }
}
```

- `primary` is the holder's currently-selected display name (or `null`)
- Addresses without a `.igra` name return `primary: null` — render their `0x…` directly
- V1 + V2 are unioned automatically; you don't need to know which registry the name lives on
- Response is cache-friendly: stable per holder unless they change their primary on-chain

**Caching guidance:**
- **In-memory per page:** the snippet above caches per address for the page lifetime — sufficient for most attribution pages
- **Persistent (if you want):** holder-level cache with ~5 min TTL is safe. Beyond that, `primary` can change when the holder updates their reverse record
- **No `Cache-Control` you need to set** — our edge already serves 30-60s s-maxage

---

## Batched usage pattern

Got 100+ addresses on one page? Don't await them sequentially:

```js
const addresses = ['0xabc…', '0xdef…', '0xghi…']; // from your leaderboard
const names = await Promise.all(addresses.map(getInsName));
// names is array of {primary: string|null} parallel to addresses
```

`Promise.all` lets all reverse lookups run in parallel. Even with 200
addresses you'll usually complete in <1s end-to-end thanks to our edge
cache + CDN. The browser handles HTTP connection pooling for you.

**If you'd benefit from a single bulk endpoint (`POST /api/reverse-bulk`
with a JSON array of addresses) for a page with 500+ rows, let us know
— happy to ship one. Current `GET /api/reverse?address=…` works fine
at the per-page scale we've seen so far.**

---

## NFT card badge (optional visual)

Every `.igra` name is also an ERC-721 NFT with on-chain SVG art. To
show the holder's NFT card as a badge:

```html
<!-- 200×200 PNG of the holder's first .igra NFT card -->
<img
  src="https://insdomains.org/api/nft-image/<tokenId>?size=200&v=2"
  alt="alice.igra"
  width="40" height="40"
  loading="lazy"
/>
```

You can get `tokenId` from the `/api/resolve?name=alice.igra` endpoint
(field `tokenId`). Pass `v=2` for V2 tokens (the default registry); pass
`v=1` for legacy V1 tokens. The same name will only ever resolve in
one of the two.

Sizes: `200`, `400`, `800`, `1200`. Larger = sharper for hero positions.

---

## "Powered by INS" attribution snippet

If you want to credit INS visibly on your page (much appreciated, not
required), drop this anywhere:

```html
<a href="https://insdomains.org" target="_blank" rel="noopener"
   class="ins-credit">
  Names by <strong>INS</strong> · Igra Name Service
</a>
```

```css
.ins-credit {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 999px;
  background: linear-gradient(120deg, rgba(0,240,255,0.10), rgba(168,85,247,0.10));
  border: 1px solid rgba(0,240,255,0.30);
  font-size: 12px; font-weight: 600; color: #a5f3fc;
  text-decoration: none;
}
.ins-credit strong { color: #fff; font-weight: 800; }
.ins-credit:hover {
  background: linear-gradient(120deg, rgba(0,240,255,0.20), rgba(168,85,247,0.20));
}
```

Or use our official icon as a 16×16 mark:

```html
<img src="https://insdomains.org/icon.svg" alt="INS" width="16" height="16">
```

---

## Profile click-through

Each name has a public profile page at `https://insdomains.org/n/<name>`.
Linking to it from your attribution page lets visitors see the name's
expiry, NFT card, and (for the holder) acts as a sign-up funnel.

```js
const url = `https://insdomains.org/n/${encodeURIComponent('alice.igra')}`;
```

Both Forever and Annual tenure names work. Names with no profile yet
still render a basic on-chain card.

---

## Other endpoints you might want

| Endpoint | Use case |
|---|---|
| `GET /api/resolve?name=alice.igra` | Forward lookup (name → address). Useful for "is this user one of ours?" checks. |
| `GET /api/names/by-owner?address=0x…` | List every `.igra` an address holds. Useful for multi-name attribution. |
| `GET /api/names/recent?limit=20` | Most-recent mints across V1 + V2. Powers our /about carousel — could power a "newest contributors" sub-section. |
| `GET /api/stats` | Platform stats (total supply, owners, volume). Useful for context badges. |

All CORS-enabled. All free. All return JSON.

---

## What you get for a 5-minute integration

- Every miner / validator / contributor / sponsor with a `.igra` name
  shows up by name on your attribution page instead of `0xABC…XYZ`
- Holders click through to their INS profile (passive sign-up funnel)
- Non-holders see their normal truncated address — no broken UI for
  the un-named majority
- Zero infra on your side: no DB, no indexer, no rate limit, no API key
- All resolution is on-chain truth via our cached REST layer — no
  trust assumption beyond "Igra L2 + insdomains.org are up"

---

## Contact

- **GitHub:** [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains)
- **Docs hub:** [insdomains.org/snap-help](https://insdomains.org/snap-help) (snap-focused but covers most of the same REST surface)
- **X:** [@IgraNameService](https://x.com/IgraNameService)
- **Email:** `GoonBoyCrypto@gmail.com`
- **TG:** [t.me/IgraNameService](https://t.me/IgraNameService)

Want a bulk endpoint, a custom card design, co-marketing, a CSS
themed widget, or anything else for your page? DM and we'll ship it.
