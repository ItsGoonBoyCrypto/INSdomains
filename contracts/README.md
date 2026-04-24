# INS Contracts

Foundry project for the Igra Name Service — Registry, Resolver, Reverse Resolver, and Marketplace.

## Contracts

| Contract | Role | Tests |
|---|---|---|
| `INSRegistry.sol` | ERC-721, native-iKAS payments, tiered pricing, reserved names, on-chain SVG tokenURI. | 55 |
| `INSResolver.sol` | ENS-compatible namehash wrapper (`addr(bytes32)` + `text(bytes32,string)`). | — |
| `INSReverseResolver.sol` | Opt-in `setPrimary(tokenId)` + stale-safe `primaryName(addr)`. Separate sidecar, no Registry change. | 12 |
| `INSMarketplace.sol` | Zero-custody listings (seller keeps the NFT until fill). 2% seller fee + 1% featured upfront. Fee-cap 500 bps. `nonReentrant` on external calls. Pause kill-switch. | 43 |

Run everything:

```bash
forge install foundry-rs/forge-std --no-commit
forge build
forge test   # 110 tests total across 3 suites, 3 fuzz × 256 runs
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

## Pricing tiers (Registry)

| Length | Price        | Notes                                |
|--------|--------------|--------------------------------------|
| 1-char | `TIER_RESERVED` | Blocked from public mint (auction) |
| 2-char | 5,000 iKAS   | ultra-rare                           |
| 3-char | 500 iKAS     | rare                                 |
| 4-char | 50 iKAS      | uncommon                             |
| 5–32   | 10 iKAS      | standard                             |

Owner can override any tier with `setLengthPrice(bucket, price)` and any individual label with `setPremiumPrice(label, price)`. `priceFor(label)` returns the effective cost (premium if set, else length tier).

## Admin surface

### Registry
- `adminMint(label, to)` — bypasses payment + reservation. Used to gift premium names to ecosystem partners.
- `setReserved(label, bool)` / `setReservedBatch(labels, bool)` — flip reservation status. Reserved names cannot be publicly minted.
- `setLengthPrice(bucket, price)` / `setPremiumPrice(label, price)`.
- `withdraw(to)` / `transferOwnership(newOwner)`.

### Marketplace
- `setTreasury(addr)` — route fees to a new address.
- `setSaleFeeBps(bps)` / `setFeatureFeeBps(bps)` — bounded by `FEE_CAP_BPS` (500).
- `setPaused(bool)` — emergency kill-switch.
- `transferOwnership(newOwner)`.

The UI at `/admin` (wallet-gated by `NEXT_PUBLIC_ADMIN_WALLET`) exposes all of the above, including live treasury balance reads and pause state.

## Internal audit notes (pre-founder-review)

Run before each deploy:

```bash
forge test -vv           # all 74 tests should pass
forge coverage           # expect >90% on INSMarketplace.sol
```

Changes since the last mainnet deploy (Registry + Resolver + ReverseResolver 2026-04-23):

- **2026-04-24** — Marketplace v1: added `nonReentrant` on `createListing` + `buyListing`, NatSpec clarifying intentional pause asymmetry on `cancelListing`, +7 tests for the post-audit coverage gaps (revoke-approval, non-receiver buyer, good-receiver buyer, cancel-while-paused, updateListing edge cases, revert-path featured-fee refund, nested-reentry via `onERC721Received`). Deploy script `DeployMarketplace.s.sol` supports atomic ownership transfer via `MARKET_NEW_OWNER`.
