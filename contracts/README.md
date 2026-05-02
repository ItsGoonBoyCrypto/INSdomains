# INS Contracts

Foundry project for the Igra Name Service — V2 Registry (current), V1 Registry (legacy), Resolver, Reverse Resolver, Marketplace, Subname Extension.

## Contracts

| Contract | Role | Tests |
|---|---|---|
| `INSRegistryIgraV2.sol` | **Current `.igra` Registry.** Dual Forever / Annual tenure (1y renewable, 30-day grace). V1 → V2 migration via `claimV1Forever`. ENS-compatible label validator, Punycode-friendly for emoji names. Spec: `docs/V2_SPEC.md`. | 103 (incl. 8 fuzz × 1024 runs) |
| `INSRegistry.sol` / `INSRegistryIgra.sol` / `INSRegistryIkas.sol` | V1 Registries — legacy, read-only since V2 launched 2026-05-02. NFTs remain in holders' wallets indefinitely. | 55 + 6 (TLD variants) |
| `INSResolver.sol` | ENS-compatible namehash wrapper (`addr(bytes32)` + `text(bytes32,string)`). Works with both V1 and V2 names. | 18 |
| `INSReverseResolver.sol` | Opt-in `setPrimary(tokenId)` + stale-safe `primaryName(addr)`. Works against either Registry. | 12 |
| `INSMarketplace.sol` | Zero-custody listings (seller keeps the NFT until fill). 2% seller fee + 1% featured upfront. Fee-cap 500 bps. `nonReentrant` on external calls. Pause kill-switch. Same instance serves V1 and V2 NFTs (identical ERC-721 surface). | 43 |
| `INSSubnameExtension.sol` | Free child names under any parent (e.g. `pay.alice.igra`). Feature-flagged off until v1.1 activation. | 27 |

Run everything:

```bash
forge install foundry-rs/forge-std --no-commit
forge build
forge test   # 273 tests total across 8 suites, 15 fuzz × 1024 runs, 0 failures
```

## Deploy order

Contracts are independent but the Marketplace + Reverse Resolver depend on the Registry address. Deploy in this order:

```bash
export PRIVATE_KEY=0x...
export IGRA_RPC=https://rpc.igralabs.com:8545
export INS_TREASURY=0x...   # recipient of mint + marketplace fees
# Optional: after atomic ownership transfer (so the deployer EOA never owns)
export MARKET_NEW_OWNER=0x...   # e.g. your Safe

# 1. Registry + Resolver
forge script script/Deploy.s.sol           --rpc-url $IGRA_RPC --broadcast

# 2. Reverse Resolver (needs INS_REGISTRY env after step 1)
export INS_REGISTRY=0x...   # Registry address from step 1
forge script script/DeployReverseResolver.s.sol --rpc-url $IGRA_RPC --broadcast

# 3. Marketplace (needs INS_REGISTRY + INS_TREASURY)
forge script script/DeployMarketplace.s.sol     --rpc-url $IGRA_RPC --broadcast
```

Copy the returned addresses into `.env.local` at the repo root:

```
NEXT_PUBLIC_INS_REGISTRY=0x...
NEXT_PUBLIC_INS_RESOLVER=0x...
NEXT_PUBLIC_INS_REVERSE_RESOLVER=0x...
NEXT_PUBLIC_INS_MARKETPLACE=0x...
NEXT_PUBLIC_ADMIN_WALLET=0x...   # Safe or EOA that owns Registry + Marketplace
```

## Key invariants

### Registry
- No expiry. `register()` mints; transfer moves the NFT; no burn path.
- `targetOf` lives on the registry — transferring the NFT does **not** silently redirect funds until the new holder calls `setTarget`.
- Payment in native **iKAS** (18 decimals).

### Reverse Resolver
- Separate contract, no owner, no admin functions.
- `primaryName(addr)` returns `""` if the user no longer owns the token — explorers don't need liveness logic.

### Marketplace
- **Zero custody.** NFT stays in seller wallet; contract pulls via `safeTransferFrom` only at fill.
- Listing treated as dead if `active=false`, expired, **or** seller moved the NFT — enforced on `buyListing` + filtered by `getActiveListing`.
- CEI: state cleared before external calls in `buyListing`.
- `nonReentrant` on `createListing` + `buyListing` (defence-in-depth against a future Registry that invokes `onERC721Received` hooks).
- Owner blast radius:
  - `saleFeeBps` and `featureFeeBps` bounded at **500 bps (5%)** by `FEE_CAP_BPS` — a compromised owner cannot drain more than 5% of a sale.
  - Treasury is admin-settable, but NFTs are never custodied — admin cannot seize names.
  - Pause freezes new listings + buys, but sellers can always `cancelListing` (intentionally *not* `whenNotPaused`). `updateListing` *is* paused-gated — prices can't move during a freeze.

## Pricing tiers (V2 — locked 2026-05-02)

| Length | Forever (once) | Annual (per year) | Notes |
|--------|----------------|-------------------|-------|
| 1-char | 4,000 iKAS     | 1,000 iKAS        | ultra-premium |
| 2-char | 2,000 iKAS     | 800 iKAS          | premium |
| 3-char | 1,200 iKAS     | 500 iKAS          | rare |
| 4-char | 800 iKAS       | 250 iKAS          | uncommon |
| 5–32   | 500 iKAS       | 50 iKAS           | standard |

Owner can override any tier with `setLengthPrice(bucket, price)` / `setLengthPriceAnnual(bucket, price)` and any individual label with `setPremiumPrice(label, price)` / `setPremiumPriceAnnual(label, price)`. `priceFor(label)` returns the effective Forever cost; `priceAnnualFor(label)` returns the per-year Annual cost.

Annual `yearsCount` is bounded `1..10` at the contract layer; the public dApp UI exposes only 1-year for simplicity. Admin can still gift multi-year names via `adminMintAnnual(label, to, yearsCount)` for ecosystem partners.

V1 (legacy) shares the same `lengthPrice` / `priceFor` surface, with the same numbers above for Forever-only — V1 was bumped to match V2 via Safe tx on the same day V2 launched.

## Admin surface

### Registry V2
- `adminMint(label, to)` — Forever, bypasses payment + reservation. Used to gift premium names to ecosystem partners.
- `adminMintAnnual(label, to, yearsCount)` — Annual gift (1..10 years).
- `setReserved(label, bool)` / `setReservedBatch(labels, bool)` — flip reservation status. Reserved names cannot be publicly minted.
- `setLengthPrice(bucket, price)` / `setLengthPriceAnnual(bucket, price)` / `setLengthPriceAnnualBatch(buckets, prices)`.
- `setPremiumPrice(label, price)` / `setPremiumPriceAnnual(label, price)` — per-name overrides.
- `setGracePeriod(seconds)` — admin-tunable, capped `[7d, 365d]`.
- `withdraw(to)` / `transferOwnership(newOwner)`.

### Registry V1 (legacy)
Same admin surface as V2 minus the Annual + grace functions. Still active for treasury withdrawals + admin-mints over historical reservations, though new mints are routed to V2.

### Marketplace
- `setTreasury(addr)` — route fees to a new address.
- `setSaleFeeBps(bps)` / `setFeatureFeeBps(bps)` — bounded by `FEE_CAP_BPS` (500).
- `setPaused(bool)` — emergency kill-switch.
- `transferOwnership(newOwner)`.

The UI at `/admin` (wallet-gated by `NEXT_PUBLIC_ADMIN_WALLET`) exposes all of the above, including live treasury balance reads, pause state, and the V2 → DAO ownership transfer button.

## Deploy script reference

| Script | Output |
|---|---|
| `script/DeployRegistryIgraV2.s.sol` | Deploys V2 Registry, transfers ownership to `INS_OWNER` (Safe), wires V1 Registry address (immutable) for `claimV1Forever`. Use `--legacy --slow --with-gas-price 1100000000000` (Igra has a 1000 gwei floor). |
| `script/DeployRegistryIgra.s.sol` | V1 Registry (already deployed; kept for reference). |
| `script/DeployMarketplace.s.sol` | Marketplace + atomic ownership transfer via `MARKET_NEW_OWNER`. |
| `script/DeployReverseResolver.s.sol` | Reverse Resolver (per-Registry). |

## Changes since mainnet launch

- **2026-05-02** — V2 Registry deployed at `0x7E70...f4E9`, owned by Safe. V1 stays read-only for legacy holders. 273 tests, 0 failures, 1024-run fuzz soak clean across V1 + V2.
- **2026-04-26** — `.igra`-only pivot. `.ins` and `.ikas` Marketplaces paused on chain.
- **2026-04-24** — Marketplace v1: `nonReentrant` on `createListing` + `buyListing`, +7 tests for post-audit coverage gaps. `DeployMarketplace.s.sol` supports atomic ownership transfer via `MARKET_NEW_OWNER`.
- **2026-04-23** — Initial Registry + Resolver + ReverseResolver deploy.
