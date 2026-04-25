# INS — Pre-Launch Hard-Test Checklist

**Target:** exhaustive functional + security test across every route, contract function, API endpoint, and known edge case before broad public launch / founder handover / pre-mainnet-announcement.

**Scope:** 10 live contracts on Igra mainnet (chain 38833), 8 routes on `https://insdomains.org`, 3 public API endpoints, per-TLD admin surface.

**Commit under test:** `af6c12b` (or whatever HEAD is when testing begins — re-pull before starting).

---

## Before you start

- [ ] `git pull origin main` on VPS — confirm HEAD matches repo
- [ ] `npm run build` clean, no TS errors, no warnings beyond known pino/metamask/async-storage
- [ ] `systemctl restart ins-dapp && systemctl is-active ins-dapp` → `active`
- [ ] Deployer wallet balance (`0x3352E8…D044`) — note current balance; expect registration txs to originate from **user wallet**, not deployer
- [ ] Test wallets prepared — have at least **2 separate** funded wallets:
  - Wallet A: owns the `.ins` admin rights via Safe signer (for admin flows)
  - Wallet B: clean user wallet with ~30 iKAS (for end-to-end buyer + seller flows)
- [ ] Open in two browsers (or browser + incognito) so A + B can be connected simultaneously for marketplace buy/sell testing

---

## 1. Homepage (`/`)

- [ ] StatsRow loads within 2s, shows real numbers (not `…` skeleton) — sanity-check against `cast call <registry> totalSupply()`
- [ ] Hero headline renders: **"Your forever domain .igra / .ikas / .ins name on Igra"** with per-TLD colours
- [ ] Subtitle: "Send crypto to alice.ins / alice.igra / alice.ikas instead of 0x71C4…f3a2"
- [ ] HeroSearch placeholder reads "Search .igra / .ikas / .ins"
- [ ] Typing a name in HeroSearch routes to `/app?q=<name>`
- [ ] Suggestion chips (alice.ins, grok.igra, vitalik.ikas, rooftop.ins, kaspa.igra) → all clickable, route to `/app?q=<label>`
- [ ] Zero-renewal callout strip visible below search with emerald "0" circle
- [ ] Trust row: "Powered by Igra EVM · 3,000+ TPS · Sub-second finality · Kaspa-secured · 0 renewal · forever"
- [ ] 3 feature cards (Search / Register / Manage) — link correctly
- [ ] StatsRow numbers are correct sum of per-TLD totalSupply
- [ ] DomainMarquee animates left-to-right, names mixed across TLDs with TLD-coloured suffixes
- [ ] CTA row at bottom: "Get your INS name →" + "About INS"
- [ ] Footer: Product / Community columns (no Ecosystem), Telegram link goes to `t.me/IgraNameService`, X shows "soon" badge, DAO… removed? verify

## 2. `/app` — register flow

### 2a. Empty state
- [ ] Visit `/app` with no query — EmptyHint shows 6 TLD-coloured chips + 5-tier pricing grid
- [ ] `Renewal fee: 0 iKAS` emerald banner below tier chips

### 2b. Name search
- [ ] Type `alice` → 3 rows appear (`.igra` / `.ikas` / `.ins`)
- [ ] Each row fetches `available()` + `priceFor()` from its TLD's Registry
- [ ] All 3 show "Available · forever · 10 iKAS" (tier 5, assuming `alice` is free on all 3)
- [ ] BatchRegisterBanner appears with "Claim alice on all 3 TLDs" + total 30 iKAS

### 2c. Tier edge cases
- [ ] `ab` (2-char) → 5,000 iKAS ultra-rare row if available; reserved if reserved
- [ ] `abc` (3-char) → 500 iKAS rare
- [ ] `abcd` (4-char) → 50 iKAS uncommon
- [ ] `abcde` (5-char+) → 10 iKAS standard
- [ ] `a` (1-char) → "Reserved · ecosystem only"

### 2d. Invalid input
- [ ] `ABC` → auto-lowered to `abc`
- [ ] `a_b_c` → InvalidHint ("use 3–32 lowercase letters, digits, or hyphens")
- [ ] `-abc` / `abc-` → InvalidHint
- [ ] 33+ chars → InvalidHint
- [ ] emoji or unicode → InvalidHint

### 2e. Reserved labels
- [ ] Search a known-reserved label (e.g. `dao`, `kcom`, `zealous`) → Reserved card shows "Not for sale · Contact team for ecosystem allocation"

### 2f. Single-TLD registration
- [ ] Wallet B connected, `alice.ikas` (cheapest at 10 iKAS) → click Register on `.ikas` row
- [ ] Wallet prompts tx with `value = 10 iKAS` to `INSRegistryIkas`
- [ ] Confirm → tx pending → mined → "Minted! #1 →" badge appears with explorer link
- [ ] Navigate to `/domains` — `alice.ikas` appears with emerald TLD badge
- [ ] Call `/api/resolve?name=alice.ikas` → returns the wallet as address + owner

### 2g. Batch-register all 3
- [ ] Fresh label `bob` (available on all 3)
- [ ] Click "Register all 3 →" banner
- [ ] Per-TLD chips appear: `.ins` signing → mined (green ✓) → `.igra` signing → mined → `.ikas` signing → mined
- [ ] 3 wallet confirmations in sequence (not parallel)
- [ ] End state: "All 3 minted →" green button links to `/domains`
- [ ] `/domains` shows 3 new cards (`bob.ins`, `bob.igra`, `bob.ikas`), each with its TLD colour

### 2h. Batch-register with partial failure (stretch)
- [ ] Start batch → reject wallet on 2nd tx
- [ ] Verify: first TLD stays green ✓, second goes red "failed", third stays pending
- [ ] "Continue (2 left) →" button appears
- [ ] Click continue → fires from 2nd TLD, not 1st (no double-charge)

### 2i. AI suggestions
- [ ] AiSuggestSection → click "Generate ideas" → calls `/api/suggest` → 8 chips render
- [ ] Click a suggestion → routes to `/app?q=<name>`
- [ ] Backend: check `/api/suggest` POST with seed body returns valid JSON
- [ ] ANTHROPIC_API_KEY is set on VPS env

## 3. `/domains` — wallet dashboard

- [ ] Not connected → "Connect to see your names" gate with RainbowKit button
- [ ] Connected → header shows "N names owned across .ins / .igra / .ikas · shortAddr"
- [ ] Cards sorted: TLDs grouped (.ins first), then tokenId ascending
- [ ] Each card has per-TLD colour badge (cyan/plum/emerald) + "Primary .xxx" / "Owned" badge + `#<tokenId>`
- [ ] Primary badge uses TLD colour + star fill when active
- [ ] Copy target address chip works (clipboard + green check flash)

### 3a. Target editing
- [ ] Click Edit Target → expands input
- [ ] Paste a valid 0x... → Save enabled
- [ ] Click Save → setTarget tx fires on the matching TLD's Registry
- [ ] After confirm → target updates in card
- [ ] `/api/resolve?name=<label>.<tld>` returns new address

### 3b. Stale-target warning
- [ ] Transfer a name from Wallet A → Wallet B
- [ ] Connect Wallet B → card shows amber "Resolution target is stale" banner
- [ ] Click "Point at my wallet" → fires setTarget with connected address
- [ ] After confirm → warning disappears

### 3c. Set primary per TLD
- [ ] For `.ins` name → click "Set primary" → writes to `REVERSE_RESOLVER_ADDRESSES.ins`
- [ ] Confirm → card shows cyan "Primary .ins" badge with star
- [ ] `/api/reverse?address=<wallet>` → `primary: "<name>.ins"`, `primaries: { ins: "<name>.ins", igra: null, ikas: null }`
- [ ] Repeat for a `.igra` name → plum badge + both primaries in the API response
- [ ] Repeat for `.ikas` → all three primaries set
- [ ] Click "Clear primary" on `.igra` → becomes "Owned"; API reflects `primaries.igra: null`

### 3d. History panel per card (H1 fix verification)
- [ ] Click History button on a `.ins` card → panel opens, shows Transfer + TargetSet events for THAT token on `.ins` Registry
- [ ] Click History on `.igra` card → panel shows events from `.igra` Registry (NOT `.ins` — this is the H1 fix)
- [ ] Confirm tokenId 1 on `.igra` doesn't show events from `.ins` tokenId 1

### 3e. List for sale modal (per-TLD)
- [ ] Click "List for sale" on `.ins` card → modal opens with gradient-coloured `.ins` suffix in title
- [ ] First time: shows "Step 1 of 2 · Approve marketplace" CTA
- [ ] Click Approve → `setApprovalForAll(marketplace, true)` tx on `.ins` Registry
- [ ] After confirm → modal re-renders with list-form
- [ ] Enter price (e.g. 5 iKAS), pick 7 days duration, uncheck featured
- [ ] "List for 5 iKAS" button → createListing tx
- [ ] Confirm → modal closes + card shows "Listed" pill
- [ ] Repeat for `.igra` card — separate approval needed (different marketplace)
- [ ] Repeat for `.ikas` card — separate approval
- [ ] Featured flow: check featured → `featureFeeOn` fetched via contract read, shown as fee preview
- [ ] List with featured → tx includes `value: featureFee`, goes to treasury

### 3f. Cancel listing
- [ ] Click "Listed" on an already-listed card → modal shows manage-listing state
- [ ] Click Cancel → `cancelListing` tx
- [ ] After confirm → card reverts to "List for sale", `getActiveListing().active = false`

### 3g. Paused marketplace
- [ ] From admin: pause `.ikas` marketplace
- [ ] Wallet B opens `.ikas` card → "List for sale" modal shows amber "Marketplace is paused by admin" banner, CTA disabled
- [ ] Verify: `.ins` + `.igra` List modals still work (per-TLD pause is independent)
- [ ] Verify: cancel works even while paused (cancelListing is not whenNotPaused)

## 4. `/marketplace` — aggregated browse + buy

- [ ] Live on Igra mainnet pill (emerald pulse) if no TLD paused
- [ ] Header: "N names listed · 2% seller fee · 0% buyer fee"
- [ ] Empty state when 0 listings: "Be the first to list" CTA → `/domains`
- [ ] Listings appear after 3a-3f — group into Featured first, then Regular
- [ ] Each card has TLD colour badge + token id badge + featured star (when featured)
- [ ] Price shows correctly (BigInt → number conversion correct even for fractional iKAS)
- [ ] Time-left pill ("Xd left", "Xh left", "Xm left", "expired")

### 4a. Buy flow (wallet B buys from wallet A)
- [ ] Wallet A lists `bob.igra` for 5 iKAS
- [ ] Wallet B → `/marketplace` → sees the listing
- [ ] Click "Buy for 5 iKAS" → tx `buyListing` on `.igra` marketplace with `value: 5 iKAS`
- [ ] Confirm → tx mines → "Bought" checkmark
- [ ] Check: `.igra` NFT ownership transferred to Wallet B on-chain (`cast call registry ownerOf(tokenId)`)
- [ ] Check: Wallet A received 4.9 iKAS (5 - 2% fee), treasury Safe received 0.1 iKAS
- [ ] Listing disappears from marketplace

### 4b. Buy own listing blocked
- [ ] Wallet A lists + Wallet A visits marketplace → card shows "Your listing" disabled button (not Buy)

### 4c. Stale price (front-run protection via self-heal)
- [ ] Wallet A lists `foo.ins` for 10 iKAS
- [ ] Wallet A updates to 20 iKAS (but Wallet B hasn't reloaded page)
- [ ] Wallet B clicks Buy → tx reverts (msg.value ≠ price)
- [ ] Verify: card auto-refetches and shows new 20 iKAS price
- [ ] Wallet B can retry at correct price

### 4d. Paused-TLD behaviour
- [ ] From admin: pause `.ikas` marketplace only
- [ ] `/marketplace` header pill: "Paused: .ikas" amber
- [ ] `.ikas` listings show "Trading paused" button; `.ins` + `.igra` cards still show Buy CTA
- [ ] Unpause → all cards normal again

### 4e. Seller revokes approval mid-listing (security)
- [ ] Wallet A lists `bar.ins` for 5 iKAS
- [ ] Wallet A calls `setApprovalForAll(marketplace, false)` directly
- [ ] Wallet B tries to buy → tx reverts on `registry.safeTransferFrom` (no approval)
- [ ] Listing storage intact (cosmetic only); users understand from revert

## 5. `/admin` — wallet-gated multi-TLD admin

- [ ] Gate: connect Wallet A (admin) → dashboard; connect non-admin → NotAllowedScreen
- [ ] TLD selector tabs at top: `.ins` (cyan) / `.igra` (plum) / `.ikas` (emerald)
- [ ] Selection persists: refresh page → stays on last TLD
- [ ] Switch TLD → every card's live data updates (treasury balance, tier prices, reservation list, marketplace state)

### 5a. Gift a name (adminMint)
- [ ] On `.ikas` tab, enter label `giftname` + recipient address → Gift button
- [ ] adminMint tx on `.ikas` Registry → bypasses payment + reservation
- [ ] Recipient gets NFT; `/domains` on recipient wallet shows it

### 5b. Reserved names (per-TLD)
- [ ] On `.igra` tab → candidates list loads from `/api/reserved-labels?tld=igra`
- [ ] Add single reserved label → setReserved tx → row turns red (reserved)
- [ ] Unreserve → row turns green
- [ ] Bulk reserve: paste 3 labels → chunks submitted as setReservedBatch txs
- [ ] Verify chain state with `cast call <registry> reserved("<label>")`

### 5b.bis — Apply-to-all-TLDs toggle + Sync (NEW 2026-04-25)

**Toggle on Reserved Names card:**
- [ ] Toggle starts OFF on first ever load
- [ ] Toggle "Apply to all 3 TLDs" ON → button copy updates: "Reserve" → "Reserve × 3", "Unreserve" → "Unreserve × 3", "Batch-reserve…" → "× 3 TLDs"
- [ ] Toggle persists: refresh page, toggle still ON
- [ ] Toggle persists across TLD switch (.ins → .igra → .ikas tabs)
- [ ] Reserve a fresh label `apptest1` with toggle ON → 3 wallet prompts in sequence
- [ ] Three TLD chips appear: `.ins` cyan-signing → green-mined → `.igra` cyan-signing → green-mined → `.ikas` cyan-signing → green-mined
- [ ] After all 3 confirmed: success state shows ~3s, then auto-clears
- [ ] Verify on chain: `apptest1` is reserved on all 3 Registries (`cast call ... reserved("apptest1")`)
- [ ] Per-row Unreserve `apptest1` with toggle ON → 3 sequential setReserved(label, false) txs → all 3 chains return false

**Toggle on Gift card:**
- [ ] Toggle "Mint on all 3 TLDs to same recipient" ON → button copy updates: "Mint & send → " → "Mint & send × 3 →"
- [ ] Label suffix preview updates: ".ins" → "× 3 TLDs"
- [ ] Will-mint preview reads "labelname.ins + 2 other TLDs to 0xshort..."
- [ ] Gift `multitest` to a wallet → 3 sequential adminMint txs
- [ ] Recipient owns `multitest.ins` + `multitest.igra` + `multitest.ikas` (verify on `/domains` for that wallet)

**Sync flow (one-shot backfill):**
- [ ] Reserve a label only on `.ins` (toggle off)
- [ ] Click "Compute diff" on the plum Sync row → shows "1 label to add" for `.igra`, "1 label to add" for `.ikas`
- [ ] Click "Apply diff" → 2 sequential `setReservedBatch` txs (one per missing TLD) — chips: `.igra` signing → mined, `.ikas` signing → mined
- [ ] Sync row shows green success message: "Synced 1 label to .igra, .ikas."
- [ ] Verify chain: label now reserved on all 3 Registries
- [ ] Click "Compute diff" again → "All reserved labels already mirrored on the other TLDs. Nothing to sync." amber message → Dismiss button works

**Failure recovery:**
- [ ] Start a 3-TLD batch, REJECT the 2nd wallet prompt → 1st chip stays green, 2nd turns red "failed", 3rd stays grey "pending"
- [ ] **Retry** button appears → click → batch resumes from the failed step (signs 2nd again, then 3rd)
- [ ] Alternative: **Cancel** button → batch state clears, 1st TLD's mint persists (intentional — already on chain), 2nd + 3rd not attempted
- [ ] After Cancel: toggle is still on, can start a new batch

**Per-TLD tx hash receipts (after polish 2026-04-25):**
- [ ] During / after each TLD's mined tx, the green chip is clickable → opens that exact tx on the Igra explorer

**Visual sanity:**
- [ ] Toggle has clear ON/OFF visual states (cyan vs neutral, thumb slides)
- [ ] Reserve / Mint buttons disabled while batch in flight (no double-fire)
- [ ] Per-row Unreserve buttons disabled while batch in flight
- [ ] Cancel/Retry buttons appear ONLY on failure
- [ ] Success state is clearly distinguishable from failure state

### 5c. Tier pricing — single TLD path
- [ ] **Apply to all toggle is OFF**
- [ ] On `.ikas` tab, change 5-char tier from current → 31 iKAS
- [ ] Writes `setLengthPrice(5, 31 ether)` on `.ikas` Registry only
- [ ] Switch to `.ins` tab — its 5-char price unchanged (per-TLD independence)
- [ ] Reset back to canonical via the row (or use 5cii Sync)

### 5cii. Tier pricing — Apply to all 3 TLDs
- [ ] Toggle **Apply to all live TLDs** ON — toggle persists on reload
- [ ] Save button label changes to "Save × 3" on every row
- [ ] Change 5-char tier from 30 → 35 iKAS on `.ins` tab → fan-out batch fires
- [ ] Per-TLD chips advance pending → signing → mined for `.ins` → `.igra` → `.ikas`
- [ ] Click each mined chip → opens explorer with the right tx hash
- [ ] Reload page → on-chain reads show 35 iKAS on all 3 TLDs

### 5ciii. Canonical Sync — one-shot pricing standardisation
- [ ] On TierPricingCard, the **Sync to canonical** banner shows the diff vs `1000 / 500 / 250 / 50 / 30`
  - **NOTE:** initial state = `.igra` and `.ikas` need bucket 1 (1000), bucket 3 (250), bucket 5 (30) — `.ins` should already be in line
- [ ] Click **Apply N changes** → step queue fires
- [ ] Step chips advance one-by-one with `tld·bN` labels (e.g. `.igra·b1`, `.igra·b3`, `.igra·b5`, `.ikas·b1`, …)
- [ ] Failed step pauses queue with Retry / Cancel
- [ ] When done, banner flips to green "All 3 TLDs match the canonical schedule"
- [ ] Reload page → banner stays green (next-run guarantee)
- [ ] Visit `/app?q=alice` → all 3 TLDs show **30 iKAS** (5-char standard)
- [ ] Visit `/app?q=ace` (3-char) → all 3 TLDs show **250 iKAS**

### 5d. Premium override — single TLD path
- [ ] **Apply to all toggle is OFF**
- [ ] On `.ins` tab, set premium for `attester` at 2500 iKAS → setPremiumPrice tx
- [ ] Visit `/app?q=attester` → `.ins` row shows 2500 iKAS, `.igra`/`.ikas` rows show 250 iKAS (3-char standard)
- [ ] Items list correctly shows `attester.ins`

### 5dii. Premium override — Apply to all 3 TLDs
- [ ] Toggle **Apply to all live TLDs** ON — persists on reload
- [ ] Set button label changes to "Set × 3"
- [ ] Set premium for `kaspa` at 100,000 iKAS → fan-out batch fires
- [ ] Per-TLD chips advance pending → signing → mined for all 3 TLDs
- [ ] Click each mined chip → opens explorer
- [ ] Items list shows `kaspa (× 3 TLDs)` (not `.ins` hardcoded)
- [ ] Visit `/app?q=kaspa` → all 3 TLDs show 100,000 iKAS
- [ ] Click Clear button on the row → fan-out clear batch fires for all 3
- [ ] Visit `/app?q=kaspa` → reverts to 250 iKAS standard 3-char on all 3

### 5e. Treasury
- [ ] Treasury card shows live balance via `useBalance({ address: registry })`
- [ ] Withdraw button (admin only) → sends funds to Safe
- [ ] Check Safe balance after withdrawal

### 5f. Marketplace card
- [ ] Shows live treasury balance on marketplace address
- [ ] Pause toggle — verify status changes on `.ins` marketplace only
- [ ] Change saleFeeBps: try 300 (3%) → accepts; try 600 (above cap) → reverts with `FeeCapExceeded`
- [ ] Change featureFeeBps: same cap check
- [ ] Change treasury address → verify

### 5g. Ownership
- [ ] View owner (should be Safe `0x7447F0e…7aA1` for all 3 Registries)
- [ ] Transfer ownership: enter new address + confirm → transferOwnership tx
- [ ] **IMPORTANT:** do this only on a scratch deploy; transferring the live Safe's ownership elsewhere loses admin

## 6. `/about` — static content page

- [ ] Hero loads: headline + subtitle mentioning 3 TLDs
- [ ] OG image renders via `/opengraph-image`
- [ ] Stats (forever names / on-chain art / multisig-owned)
- [ ] "Why forever?" section — ENS vs INS comparison cards ($5+/yr vs 0 iKAS/yr)
- [ ] Pricing tier chips correct
- [ ] "Contracts" section lists all 10 addresses + Safe — clicking each opens Igra explorer
- [ ] Roadmap milestones render — "done" items have emerald check, pending have grey
- [ ] CTA: Register / Telegram / GitHub / X soon

## 7. Public API

### 7a. `/api/resolve`
- [ ] `?name=testthemarketplace.ins` → 200 with address + owner + tokenId + exists:true
- [ ] `?name=nonexistent.ins` → 404, exists:false
- [ ] `?name=alice` (no tld) → searches all 3, returns first match or not-found
- [ ] `?name=alice&tld=igra` → searches .igra Registry only
- [ ] `?name=-bad-` → 400 invalid_label
- [ ] CORS headers present (Access-Control-Allow-Origin: *)
- [ ] Cache-Control: public, s-maxage=60

### 7b. `/api/reverse`
- [ ] `?address=<wallet with primary on .ins>` → `primary: "<name>.ins"`, primaries shows .ins set, others null
- [ ] `?address=<wallet with no primary>` → `primary: null`, all primaries null, still 200
- [ ] `?address=garbage` → 400 invalid_address
- [ ] CORS headers present

### 7c. `/api/reserved-labels`
- [ ] `?tld=ins` → returns list (currently 87+ labels)
- [ ] `?tld=igra` → list (likely smaller)
- [ ] `?tld=ikas` → list
- [ ] `?tld=bogus` → defaults to ins
- [ ] First uncached call may take 10-30s (chain scan); subsequent cached

### 7d. `/api/suggest`
- [ ] POST `{"seed":"vitalik"}` → `{ names: [...] }` with 6-8 label suggestions
- [ ] All suggestions pass `isValidLabel`
- [ ] Fallback works if Claude API is down

## 8. Security / edge cases

### 8a. Contract-level invariants
- [ ] `FEE_CAP_BPS = 500` — cannot set fees above 500 (5%) on any marketplace
- [ ] `_reentrancyStatus` guard active — reentry via malicious treasury blocked (already tested in `INSMarketplace.t.sol`)
- [ ] cancelListing works even when marketplace is paused
- [ ] updateListing blocked when paused
- [ ] Safe-ownership confirmed on all 10 contracts via `cast call <addr> owner()`
- [ ] All 10 verified on Blockscout (check via `/api/v2/smart-contracts/{addr}` endpoint)

### 8b. Cross-TLD independence
- [ ] Mint `alice.ins` on wallet A
- [ ] Mint `alice.igra` on wallet B
- [ ] Verify: two separate NFTs, two different owners, no shared state
- [ ] Verify: setting `alice.ins` as primary does NOT affect `.igra`/`.ikas` reverse resolvers
- [ ] Verify: transferring `alice.ins` doesn't touch `.igra`/`.ikas` state

### 8c. Listing edge cases
- [ ] List with expiry 1 second in the future → wait → `getActiveListing` returns empty (stale-safe)
- [ ] List, then transfer NFT to another wallet → `getActiveListing` returns empty (seller check)
- [ ] Listing with price = 0 → reverts `InvalidPrice`
- [ ] Expiry in the past → reverts `InvalidExpiry`

### 8d. Wallet edge cases
- [ ] Connect Safe via WalletConnect → admin actions go through Safe TX flow (not direct)
- [ ] Disconnect mid-tx → page state recovers on reconnect
- [ ] Network switch (to wrong chain) → RainbowKit shows "Wrong network" + switch button

## 9. Performance

- [ ] StatsRow + /domains + /marketplace all load within 3s cold on a reasonable connection
- [ ] No console errors anywhere in the app
- [ ] Lighthouse score > 90 on /
- [ ] Mobile layout: all routes usable on 375px width (iPhone SE width)

## 10. Post-test hygiene

- [ ] Unreserve any test labels you set temporarily during testing
- [ ] Cancel any open test listings
- [ ] Revoke any `setApprovalForAll` grants on test wallets if concerned
- [ ] Unpause any marketplaces you paused for testing
- [ ] Reset treasury / fee values if changed for testing
- [ ] Commit + push a clean state; VPS rebuild + restart
- [ ] Update memory with any new findings

---

## Priority order if time is short

**Must-pass before handover:**
- §1 Homepage, §2f single register, §2g batch register all 3, §3e list for sale (1 TLD), §4a buy flow, §5 admin TLD switcher, §7a-b API

**Nice-to-have if time allows:**
- §2h batch partial failure, §3c set primary all 3, §3d history per-TLD, §4c stale-price self-heal, §4e revoke-approval revert, §5d/5dii premium override + apply-all, §5cii Tier apply-all, §5ciii Canonical Sync, §8b cross-TLD independence

**Run §5ciii Canonical Sync FIRST when starting tomorrow** — it ensures every TLD is on the standard 1000/500/250/50/30 schedule before any per-TLD test does its own price check.

**Skip unless you have a specific reason:**
- §5g ownership transfer (irreversible on mainnet — do only on testnet)
- §2c P3/P4 tier registration (expensive; only if budget allows)

## Test wallet funding (plan for tomorrow)

Expected iKAS spend for full §2-§5 run: ~50-80 iKAS
- Batch register all 3 × 1 round = 30 iKAS
- Admin-mints (free — adminMint bypasses)
- List + buy + 2% fees = negligible
- A few registration retries + experimentation buffer

Top up Wallet B before starting.

## Known non-issues (do not re-flag during testing)

- Forge reports `--gas-price 999999999999` 1 wei below floor — use `--with-gas-price 1100000000000 --legacy --slow` for any new deploy
- `/app` page SSRs as skeleton because `useSearchParams` — clients hydrate the real UI, this is correct
- `/api/reverse` returns 200 with `primary: null` when no primary is set — this is a valid state, not an error
- Blockscout shows 4 duplicate "Fail - Unable to verify" for the per-TLD clones (marketplace + reverseResolver) — that's just Blockscout saying "already bytecode-matched"; they ARE verified, check `/api/v2/smart-contracts/{addr}` to confirm

## Emergency contacts during testing

- VPS: `ssh -i ~/.ssh/ziggy_github root@178.104.105.0`
- Service restart: `systemctl restart ins-dapp`
- Safe multisig: `safe.igralabs.com` → `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1`
- Deployer wallet (for last-resort contract deploys): `/home/ins-dapp/.deployer-wallet`

---

**When every checkbox above is ticked, INSdomains is ready for public launch.**
