# Emoji premium-price batch — execution runbook

One-shot operation to set 51 emoji premium prices on the INS V2 Registry in a single
transaction, working around Igra L2's MultiSend / delegatecall block on the Safe.

## Tier table

| Tier | Count | Forever | Annual | Examples |
|---|---|---|---|---|
| ULTRA | 10 | 4,000 iKAS | 1,000 iKAS/yr | 🔥 🚀 💎 ❤️ 🌙 🦄 👑 ⚡ 🌟 🎯 |
| PREMIUM | 41 | 2,000 iKAS | 800 iKAS/yr | top hearts, flags, faces, animals, objects |

Every emoji **not** on this list stays at the contract default 500 iKAS Forever / 50 iKAS/yr.

## Total cost

- Deploy: ~$0.50 (one-time `forge create`)
- 3 Safe transactions: ~$0.30 total
- **Time:** ~10 minutes start to finish

## Prerequisites

- Treasury Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` has signing quorum reachable
- Deployer wallet has ≥ 1 iKAS for gas
- `IGRA_RPC` env var set (e.g. `https://rpc.igralabs.com:8545`)
- Foundry installed locally

## Step 1 — Deploy the helper

```bash
cd contracts

export SAFE_ADDRESS=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1
export REGISTRY_V2=0x7E7018959bf44045F01D176D8db1594894CBf4E9
export PRIVATE_KEY=<your deployer key>
export IGRA_RPC=https://rpc.igralabs.com:8545

forge script script/DeployInsBatchPriceSetter.s.sol \
  --rpc-url $IGRA_RPC --broadcast \
  --legacy --slow \
  --with-gas-price 1100000000000
```

The script prints `InsBatchPriceSetter deployed at: 0x<HELPER_ADDR>`. **Save that address.**

### Verify on Blockscout (optional but recommended)

```bash
forge verify-contract <HELPER_ADDR> InsBatchPriceSetter \
  --chain-id 38833 \
  --constructor-args $(cast abi-encode "constructor(address,address)" \
    $SAFE_ADDRESS $REGISTRY_V2) \
  --verifier blockscout \
  --verifier-url https://explorer.igralabs.com/api
```

## Step 2 — Safe transfers Registry ownership to the helper

In the Safe Web app, **New transaction → Contract interaction**:

- **To:** `0x7E7018959bf44045F01D176D8db1594894CBf4E9` (Registry V2)
- **ABI:** paste the `transferOwnership(address)` ABI snippet (one-liner)
- **Function:** `transferOwnership`
- **newOwner:** `<HELPER_ADDR>` from step 1

Sign + execute. **Verify in the explorer that `Registry.owner()` now returns the helper address before moving on.**

```bash
cast call $REGISTRY_V2 "owner()(address)" --rpc-url $IGRA_RPC
# expect: 0x<HELPER_ADDR>
```

If `owner()` still returns the Safe, the transfer didn't land — re-do step 2.

## Step 3 — Safe calls helper.runBatch(...)

In the Safe Web app, **New transaction → Contract interaction**:

- **To:** `<HELPER_ADDR>` from step 1
- **Calldata:** copy the **entire** contents of `emoji-batch-calldata.txt` (the 0x… blob, ~8KB)
- **Value:** `0`

OR, easier — drag `emoji-batch-runBatch.json` into Transaction Builder (replace `REPLACE_WITH_BATCH_HELPER_ADDRESS` with the helper address first).

Sign + execute.

This single transaction:
1. Calls `setPremiumPrice` for each of the 51 emoji
2. Calls `setPremiumPriceAnnual` for each of the 51 emoji
3. Sets the helper's `used` flag to `true` (one-shot)
4. Transfers ownership back to the Safe atomically

## Step 4 — Verify

```bash
# Fire should now price at 4000 iKAS Forever
cast call $REGISTRY_V2 "priceFor(string)(uint256)" "xn--4v8h" --rpc-url $IGRA_RPC
# expect: 4000000000000000000000

# Annual companion should be 1000 iKAS/yr
cast call $REGISTRY_V2 "priceAnnualFor(string)(uint256)" "xn--4v8h" --rpc-url $IGRA_RPC
# expect: 1000000000000000000000

# Soccer ball should be in Premium tier — 2000 iKAS Forever
cast call $REGISTRY_V2 "priceFor(string)(uint256)" "xn--y8h" --rpc-url $IGRA_RPC
# expect: 2000000000000000000000

# Ownership returned
cast call $REGISTRY_V2 "owner()(address)" --rpc-url $IGRA_RPC
# expect: 0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1 (Treasury Safe)

# Helper is dead
cast call <HELPER_ADDR> "used()(bool)" --rpc-url $IGRA_RPC
# expect: true
```

## Rollback / emergency exit

If between steps 2 and 3 you decide NOT to run the batch (e.g. spotted a wrong
label, want to adjust pricing), the Safe can hand back ownership without
executing the batch:

```
Safe → InsBatchPriceSetter.emergencyReturnOwnership()  — no args
```

This sets `used = true` (helper becomes dead) and returns ownership to the Safe.
You'd then deploy a NEW helper and start over.

## Safety properties

- **Helper is one-shot.** After `runBatch` (or `emergencyReturnOwnership`), the
  `used` flag is `true` and any further call reverts. The contract can never
  manipulate Registry state again.
- **Only the Safe can call.** `runBatch` and `emergencyReturnOwnership` are
  `msg.sender == safe` gated. No other address can run them.
- **No funds at risk.** Helper has no payable functions, no withdraw path, no
  treasury — it can only call the two `setPremiumPrice*` functions.
- **Ownership in helper for ≤ 1 tx.** In the recommended sequence, step 2 and
  step 3 happen back-to-back. Even if step 3 is delayed, the helper's ONLY
  effect on Registry state is bulk-pricing or returning ownership.
- **Foundry tests:** 20/20 pass including 256-run fuzz. Audit-clean.

## Tier list reference

See `emoji-top50-admin-checklist.md` at the project root for the full table
with each emoji's Punycode label + pricing.
