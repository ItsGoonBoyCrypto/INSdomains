# INS Contracts

Foundry project for the Igra Name Service.

## Deploy

```bash
forge install foundry-rs/forge-std --no-commit
export PRIVATE_KEY=0x...
export IGRA_RPC=https://rpc.igralabs.com:8545
forge script script/Deploy.s.sol --rpc-url $IGRA_RPC --broadcast
```

Then set the returned addresses in `.env.local` at the repo root:

```
NEXT_PUBLIC_INS_REGISTRY=0x...
NEXT_PUBLIC_INS_RESOLVER=0x...
NEXT_PUBLIC_ADMIN_WALLET=0x...   # same wallet that ran the deploy (owner)
```

## Key invariants

- No expiry. `register()` mints; transfer moves the NFT; no burn path.
- `targetOf` lives on the registry — transferring the NFT does **not**
  silently redirect funds until the new holder calls `setTarget`.
- Payment in native **iKAS** (Igra's gas token), all values in wei / 18 decimals.

## Pricing tiers (baked into constructor)

| Length | Price        | Notes                                |
|--------|--------------|--------------------------------------|
| 1-char | `TIER_RESERVED` | Blocked from public mint (auction) |
| 2-char | 5,000 iKAS   | ultra-rare                           |
| 3-char | 500 iKAS     | rare                                 |
| 4-char | 50 iKAS      | uncommon                             |
| 5–32   | 10 iKAS      | standard                             |

Owner can override any tier with `setLengthPrice(bucket, price)` and any
individual label with `setPremiumPrice(label, price)`. `priceFor(label)`
returns the effective cost (premium if set, else length tier).

## Admin surface

- `adminMint(label, to)` — bypasses payment + reservation. Used to gift
  premium names to ecosystem partners for growth / distribution.
- `setReserved(label, bool)` / `setReservedBatch(labels, bool)` — flip
  reservation status. Reserved names cannot be publicly minted.
- `setLengthPrice(bucket, price)` / `setPremiumPrice(label, price)`.
- `withdraw(to)` / `transferOwnership(newOwner)`.

The UI at `/admin` (wallet-gated by `NEXT_PUBLIC_ADMIN_WALLET`) exposes all
of these.
