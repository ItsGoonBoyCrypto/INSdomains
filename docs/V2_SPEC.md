# INSRegistryIgraV2 — design spec

> **Status:** spec frozen, implementation in flight (Phase 2). Scheduled
> mainnet deploy: Phase 3 (next week). Source-of-truth for the dual-tier
> dApp UX, REST API, activity bot, and migration tooling.

V2 keeps V1's permanence promise (`Forever` tier still pays once and never
expires), but adds an optional cheaper `Annual` tier alongside it, plus a
clean migration path for the 13 existing V1 holders and a one-click
upgrade lane for subname holders. Everything else (the resolver, the
marketplace, the reverse resolver, the activity bot) stays exactly the
same — V2 is a Registry-only redeploy.

---

## Why V2

V1's pricing made every name a permanent buy. That's the right product
position for the long tail (5+ char standard names) but priced out users
who wanted to try a name for a year first, and locked us out of the ENS
mental model where renewal-based pricing is the default.

V2 keeps Forever as the default brand promise but makes Annual available
for users who want a cheaper entry point. **No existing V1 holder pays
again** — the migration grandfathers them onto V2 Forever for gas only.

---

## Pricing (locked 2026-05-02)

| Tier | Annual / yr | Forever (once) |
|---|---|---|
| 1-char (ultra-premium) | 1,000 iKAS | 4,000 iKAS |
| 2-char (premium) | 800 iKAS | 2,000 iKAS |
| 3-char (rare) | 500 iKAS | 1,200 iKAS |
| 4-char (uncommon) | 250 iKAS | 800 iKAS |
| 5–32 char (standard) | 50 iKAS | 500 iKAS |

These are the **constructor defaults**. Admin (Safe) can update each via
`setLengthPrice(bucket, price)` and `setLengthPriceAnnual(bucket, price)`.

The Forever price column matches what's already live on V1 — so the V1
runbook's `setLengthPrice` calls double as the V2 Forever defaults.
That's intentional: anyone minting V1 today is buying at the V2 Forever
price, and gets grandfathered onto V2 Forever for free in Phase 3.

---

## Tenure model

Two "tenure types", one storage scheme:

```solidity
mapping(uint256 => uint256) public expiresAt;
//   tokenId  → 0 means Forever; >0 means Annual (unix timestamp)
```

- **Forever:** `expiresAt[id] == 0`. Functionally identical to a V1 name.
  Cannot be expired, cannot be re-minted by anyone else, ever.
- **Annual:** `expiresAt[id] > 0`. Expires at that timestamp; enters a
  30-day grace period; after the grace period ends the name returns to
  public availability and can be re-registered by anyone (the previous
  NFT becomes a stale artifact in the original owner's wallet — see
  "Re-registration after grace" below).

`isExpired(tokenId)` returns true when `expiresAt[id] != 0 && now >= expiresAt[id]`.
`isInGrace(tokenId)` returns true when expired AND `now < expiresAt[id] + gracePeriodSec`.

Grace period default: **30 days** (`30 * 86400 = 2,592,000 sec`). Admin
can adjust via `setGracePeriod(uint256 sec)` — capped 7 days minimum,
365 days maximum, so admin can't accidentally trap or release names.

---

## Registration

Two distinct functions for clarity (no overloaded duration arg):

### `register(string label, address target) payable returns (uint256)`

V2's Forever path. Identical surface to V1's `register()`. Mints a name
with `expiresAt = 0`, pays the Forever-tier price (or `premiumPrice[label]`
override). Refunds overpayment in the same tx.

### `registerAnnual(string label, address target, uint256 yearsCount) payable returns (uint256)`

V2's Annual path. `yearsCount` must be 1..10 (cap stops fat-finger
multi-decade prepays). Mints a name with `expiresAt = block.timestamp + (yearsCount * 365 days)`.

Price = `yearsCount * lengthPriceAnnual[bucket]` (or
`yearsCount * premiumPriceAnnual[label]` if override set).

Both functions:
- Revert with `InvalidLabel`, `AlreadyRegistered`, `NameReserved`,
  `TierReserved`, `InsufficientPayment` (existing V1 errors)
- Allow re-registration of expired+post-grace names by any caller
  (see "Re-registration after grace" below)

---

## Renewal

### `renew(uint256 tokenId, uint256 yearsToAdd) payable`

Extends an Annual name's `expiresAt` by `yearsToAdd * 365 days`. **Anyone
can call this** — pay the price, anyone benefits the holder. (Mirrors
ENS's "anyone can renew anyone" UX.) Reverts with `NotAnnual` if called
on a Forever name (use `extendToForever` instead — you can't accidentally
"renew" a Forever name into oblivion).

`yearsToAdd` must be 1..10 (same cap as `registerAnnual`).

If the name is already expired but still in grace, renewal works and
extends from the original `expiresAt` (not from `now`). If grace has ended,
renewal reverts with `NameExpired` — the holder has lost the name and
must re-register from scratch.

Price = `yearsToAdd * lengthPriceAnnual[bucket]` (or override).

### `extendToForever(uint256 tokenId) payable`

Converts an Annual name to Forever. Sets `expiresAt[id] = 0`. Charges the
**full Forever price** (no proration / credit for unused Annual time —
keeps accounting simple, and Forever is still cheaper than ~10y Annual).

Anyone can call (same as renew). Reverts with `AlreadyForever` if called
on an existing Forever name.

---

## Re-registration after grace

When `block.timestamp >= expiresAt[id] + gracePeriodSec`, the name is
publicly available again. Calling `register()` or `registerAnnual()` for
that label:

1. Looks up the old `tokenIdOf[label]`
2. Burns the old NFT (`Transfer(oldOwner, address(0), oldTokenId)`)
3. Clears `labelOf[oldTokenId]`, `targetOf[oldTokenId]`, `expiresAt[oldTokenId]`
4. Mints a fresh tokenId with the new owner

The old owner's wallet still shows the burned NFT briefly (depending on
indexer behaviour) but `ownerOf(oldTokenId)` reverts and `tokenIdOf[label]`
returns the new id. The marketplace's per-listing `ownerOf` recheck
catches stale listings automatically.

---

## V1 migration (one-time, gas-only)

V2 ships knowing the V1 Registry address (constructor arg, immutable).

### `claimV1Forever(uint256 v1TokenId, address target) returns (uint256)`

For V1 holders to mint the equivalent V2 Forever NFT for free.

1. Reads `INSRegistryIgra(v1Registry).labelOf(v1TokenId)` to get the label
2. Reads `INSRegistryIgra(v1Registry).ownerOf(v1TokenId)` — must equal `msg.sender`
3. Checks `migrated[v1TokenId]` — must be false (no double-claims)
4. Checks `tokenIdOf[label] == 0` on V2 (no race with a fresh V2 mint)
5. Sets `migrated[v1TokenId] = true`
6. Mints a V2 Forever NFT with the same label, owned by `msg.sender`

No payment. The original V1 NFT stays in the user's wallet (legacy artifact;
not destroyed — V1 is a separate contract we don't have authority over).

After Phase 3 launches, the dApp surfaces a "Migrate to V2" CTA on
`/domains` for any V1 holder. We assume nearly all 13 will migrate within
the first week.

If a label is already taken on V2 by the time a V1 holder tries to claim
(edge case: someone admin-minted it), the call reverts with
`AlreadyRegistered`. This shouldn't happen in practice because we won't
admin-mint over V1 holders' labels.

---

## Subname → root upgrade

V2 handles this with no special function — it's just a regular V2 mint.

The dApp surfaces it as "promote `pay.alice.igra` to `pay.igra`" but
under the hood it calls `register("pay", target)` with the Forever price
(or `registerAnnual("pay", target, years)` for Annual). The subname
itself is unaffected — `pay.alice.igra` continues to exist and work; the
holder now also owns the standalone `pay.igra`.

If they want to free up the subname slot they call `revokeSubname` on
the (V2-targeted) SubnameExtension contract separately. Two-tx flow,
explicit, no surprises.

---

## Punycode / emoji names

V1's label validator already accepts `a-z`, `0-9`, `-` only — which
is exactly what Punycode uses (`xn--ls8h` for 🦄, etc.). So the validator
**doesn't need to change**. Emoji names work today — the dApp just
needs to do the IDN encode/decode at the UI layer.

V2 preserves the validator unchanged. No on-chain Unicode parsing
(homograph-attack surface, gas cost) — keeping the validator strictly
ASCII keeps the contract simple and lets the dApp own all Unicode UX.

The dApp will:
- On register: detect non-ASCII input, run punycode encode (`punycode-2.3.x`
  npm package), submit the `xn--…` form to the contract
- On display: detect `xn--` labels, decode for human display, fall back
  to the encoded form on decode failure
- Surface a "this is an emoji name" badge so users understand what
  they're buying

Reserved labels list will get a "common emoji squat" sweep before V2
launch (single-emoji punycode names get reserved + admin-mint-only,
mirroring V1's 1-char treatment).

---

## Storage layout (additions vs V1)

```solidity
// Tenure
mapping(uint256 => uint256) public expiresAt;          // 0 = Forever
uint256 public gracePeriodSec;                         // default 30 days

// Annual pricing
mapping(uint8 => uint256) public lengthPriceAnnual;    // bucket → price/yr
mapping(string => uint256) public premiumPriceAnnual;  // label → price/yr (override)

// V1 migration
address public immutable v1Registry;
mapping(uint256 => bool) public migrated;              // v1 tokenId → claimed
```

All other V1 storage (lengthPrice, premiumPrice, reserved, owners,
balances, approvals, tokenIdOf, labelOf, targetOf, mintedAt, totalSupply)
keeps the same layout + semantics as V1, so the test suite from V1
transfers across cleanly.

---

## Events (additions vs V1)

```solidity
event RegisteredAnnual(string indexed label, address indexed owner, address target, uint256 paid, uint256 expiresAt, uint256 yearsCount);
event Renewed(uint256 indexed tokenId, address indexed payer, uint256 yearsAdded, uint256 paid, uint256 newExpiresAt);
event ExtendedToForever(uint256 indexed tokenId, address indexed payer, uint256 paid);
event V1Migrated(uint256 indexed v1TokenId, uint256 indexed v2TokenId, string indexed label, address owner);
event LengthPriceAnnualUpdated(uint8 len, uint256 price);
event PremiumPriceAnnualUpdated(string indexed label, uint256 price);
event GracePeriodUpdated(uint256 newGracePeriodSec);
event Reclaimed(string indexed label, uint256 indexed oldTokenId, uint256 indexed newTokenId, address newOwner);
```

V1's `Registered` event is preserved (Forever mints fire it). Annual mints
fire `RegisteredAnnual` — same indexer surface as `Registered` plus the
expiresAt/yearsCount fields. Both events fire `TargetSet` so reverse-
resolver tooling doesn't need to special-case Annual.

---

## Errors (additions vs V1)

```solidity
error NotAnnual();          // renew() called on Forever
error AlreadyForever();     // extendToForever() called on Forever
error NameExpired();        // operation on past-grace name
error InvalidYearsCount();  // years == 0 or > 10
error NotV1Owner();         // claimV1Forever caller doesn't own the V1 NFT
error AlreadyMigrated();    // claimV1Forever called twice for the same V1 id
error InvalidGracePeriod(); // setGracePeriod() outside [7d, 365d]
```

All V1 errors preserved.

---

## tokenURI changes

Adds two attributes:
```json
{ "trait_type": "Tenure", "value": "Forever" | "Annual" }
{ "trait_type": "Expires", "value": "<unix-ts>" } // omitted for Forever
```

SVG card adds a small "Forever" or "Annual · expires <date>" pill in the
top-right corner so wallets render the tenure clearly.

---

## Admin surface (additions vs V1)

- `setLengthPriceAnnual(bucket, price)` — mirrors `setLengthPrice`
- `setLengthPriceAnnualBatch(buckets[], prices[])` — for the V2 launch
  configuration in one tx
- `setPremiumPriceAnnual(label, price)` — mirrors `setPremiumPrice`
- `adminMintAnnual(label, to, yearsCount)` — gift Annual names (rare;
  most admin gifts will stay Forever via existing `adminMint`)
- `setGracePeriod(uint256 sec)` — admin-mutable within [7d, 365d]

Existing V1 admin functions (`adminMint`, `setReserved*`, `setLengthPrice`,
`setPremiumPrice`, `withdraw`, `transferOwnership`) keep their V1
semantics — Forever tier only.

---

## Test plan (target: 80+ tests, all green, fuzz clean)

Carries over the full V1 suite (all 55 INSRegistry tests work unchanged
on V2 by treating Forever as the default). Adds:

### Annual minting (15 tests)
- happy path: 1y / 5y / 10y mints set expiresAt correctly
- price = years × tier; refund on overpay
- yearsCount = 0 reverts InvalidYearsCount
- yearsCount = 11 reverts InvalidYearsCount
- per-name premium override (annual) takes precedence over tier
- reserved labels can't be Annual-minted publicly

### Renewal (12 tests)
- happy: renew(1y) extends by 1y from current expiresAt
- happy: renew(5y) extends by 5y
- pre-expiry renew works
- in-grace renew works (extends from original expiresAt, not now)
- post-grace renew reverts NameExpired
- renew on Forever reverts NotAnnual
- anyone-can-renew (caller != owner) works + emits with correct `payer`
- price = yearsToAdd × tier
- refund on overpay
- yearsToAdd = 0 reverts
- yearsToAdd = 11 reverts
- emits Renewed with correct newExpiresAt

### extendToForever (8 tests)
- happy: in-tenure Annual → Forever, expiresAt set to 0
- happy: in-grace Annual → Forever
- post-grace reverts NameExpired
- on Forever reverts AlreadyForever
- price = full Forever-tier (or premium override)
- refund on overpay
- emits ExtendedToForever
- ownership unchanged

### Re-registration after grace (10 tests)
- pre-grace: cannot register existing label
- in-grace: cannot register existing label
- post-grace + 1 second: register works, old token burned, new token minted
- old `ownerOf(oldId)` reverts after re-register
- `labelOf[oldId]` cleared
- `tokenIdOf[label]` updated to new id
- emits Reclaimed + Transfer(oldOwner, 0, oldId) + standard mint events
- re-registered name can be Annual or Forever, regardless of original
- previous owner can outbid via re-registration too (no preferential
  reclaim window)
- can also re-register an in-grace Forever-via-claim-after-Annual? — N/A
  Forever names never expire, so this case can't happen

### V1 migration (12 tests)
- happy: V1 holder calls claimV1Forever, gets V2 Forever NFT
- non-V1-holder reverts NotV1Owner
- already-migrated reverts AlreadyMigrated
- label collision (V2 label already minted) reverts AlreadyRegistered
- migration emits V1Migrated + Registered + TargetSet
- migrated V1 tokenId stays in user's wallet (V2 doesn't touch V1)
- migrated V2 NFT has expiresAt = 0
- migrated V2 NFT counts toward totalSupply
- multiple V1 holders can migrate independently
- target = address(0) defaults to msg.sender
- tokenURI on migrated NFT shows "Forever" pill
- migration with non-existent v1TokenId reverts (V1.ownerOf reverts)

### Grace period admin (5 tests)
- setGracePeriod(7d) works, emits
- setGracePeriod(365d) works
- setGracePeriod(6d) reverts InvalidGracePeriod
- setGracePeriod(366d) reverts InvalidGracePeriod
- non-owner reverts NotAuthorized

### Annual admin (5 tests)
- setLengthPriceAnnual(bucket, price) works + emits
- setLengthPriceAnnualBatch updates all 5 buckets atomically
- non-owner reverts
- setPremiumPriceAnnual(label, price) works + emits
- adminMintAnnual gifts a 1y name with expiresAt set

### Fuzz (8 fuzz tests, 1024 runs each)
- yearsCount in [1,10] — register/renew price math
- expiresAt monotonicity under arbitrary renewal sequences
- migration idempotence (claimV1Forever twice always reverts)
- grace boundary: register at expiresAt+grace-1 reverts, +grace+1 succeeds
- overpayment refund == msg.value - price for arbitrary inputs
- label length distribution → bucket assignment correctness (5+ chars)
- premium override > tier price always wins
- Punycode-shaped labels (`xn--<random>`) accepted by validator

### Integration with V1 + Marketplace (10 tests)
- V1 ownership unchanged after V2 migration
- V2 Forever NFT can be listed on existing marketplace contract
- V2 Annual NFT can be listed (buyer becomes new owner; expiresAt
  preserved)
- listing of an in-grace Annual name: marketplace's ownerOf check
  catches it correctly when re-register fires
- subname extension contract retargeted at V2 mints subnames against V2
  parents
- reverse resolver works against V2 names (primaryName flow)
- selling an Annual name to a new owner doesn't reset expiresAt
- selling an in-grace name still possible (transfer != renew)
- gas budget for register / registerAnnual / renew within 5% of V1
- ERC-721 surface tests pass unchanged

---

## Out of scope for V2

These are deliberately deferred to V3 / future work:

- **Multi-year Annual prepay discounts** — flat price for years 1..10.
  Discount tiers are a marketing knob; can be added without contract
  changes (admin-set pricing).
- **Auctions on expired names** — re-registration is first-come, no
  auction lane. Names that have known squatter demand should be reserved
  by admin pre-launch.
- **Cross-chain reverse resolution contracts** — that's a CCIP-Read
  gateway, not a Registry change.
- **DAO governance** — current ownership transfer (`transferOwnership`)
  is enough for now. On-chain governance is a separate Governor + Token
  contract that wraps the Registry's owner role.

---

## Migration timeline (Phase 3)

1. Deploy V2 Registry (this contract) — broadcast hands ownership to Safe in same tx
2. Verify on Igra explorer, sanity-check `priceFor` reads
3. Update dApp env: `NEXT_PUBLIC_INS_REGISTRY_IGRA_V2 = <new address>`
4. Update REST API to read from V2 by default, with V1 fallback for
   legacy lookups
5. Update activity bot to watch V2 events as well as V1
6. Deploy migration UI on `/domains`: any V1 holder sees a banner with
   one-click "Migrate to V2 Forever (gas only)"
7. After 14 days, swap homepage CTAs to V2-only
8. After 30 days, V1 register button hidden from `/app` (V1 reads
   stay supported indefinitely for legacy NFT viewing)
9. Subname extension v1.1 activation: deploy fresh extension pointed
   at V2

The Marketplace, ReverseResolver, and Resolver contracts stay the same
addresses — V2 NFTs work with the existing marketplace because the
ERC-721 surface is identical.
