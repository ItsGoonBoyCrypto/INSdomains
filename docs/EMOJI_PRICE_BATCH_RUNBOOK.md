# Emoji premium-price batch — execution runbook

One-shot operation to set 51 emoji premium prices on the INS V2 Registry in a single
transaction, working around Igra L2's MultiSend / delegatecall block on the Safe.

## Tier table

| Tier | Count | Forever | Annual | Examples |
|---|---|---|---|---|
| ULTRA | 10 | 4,000 iKAS | 1,000 iKAS/yr | 🔥 🚀 💎 ❤️ 🌙 🦄 👑 ⚡ 🌟 🎯 |
| PREMIUM | 41 | 2,000 iKAS | 800 iKAS/yr | top hearts, flags, faces, animals, objects |

Every emoji **not** on this list stays at the contract default 500 iKAS Forever / 50 iKAS/yr.

## Cost + time

- Deploy: ~$0.50 (one `forge create`)
- 2 Safe transactions (Step 2 + Step 3): ~$2–$3 total at Igra's 1.1 nKAS/gas floor
  - Step 2 (`transferOwnership`): ~$0.10
  - Step 3 (`runBatch` — 51 entries × 2 SSTOREs + transferOwnership-back): ~$2–$3
- **Time:** ~10–15 min start to finish

## Prerequisites

- Treasury Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` has signing quorum reachable
- Deployer wallet has ≥ 1 iKAS for gas
- `IGRA_RPC` env var set (e.g. `https://rpc.igralabs.com:8545`)
- **Foundry** installed locally
- **Node.js ≥ 18** + run `npm install` in the project root (uses `tr46`, `@adraffy/ens-normalize`, `viem`)

⚠️ **Igra L2 gas-price floor: 1.1 nKAS/gas (1,100,000,000,000 wei).** Safe's UI gas estimator can quote *below* this and the tx will stall in the mempool. For EVERY Safe transaction (Steps 2 and 3) check the gas price field before signing — bump manually to ≥ 1100 gwei if Safe defaulted lower.

## Step 0 — Generate the calldata

```bash
# From project root
npm install                              # if not already done
node scripts/gen-emoji-top50.mjs         # generates emoji-top50.json + checklist
node scripts/gen-batch-calldata.mjs      # generates calldata + Safe import JSON
```

Expected output:
```
Generated runBatch calldata for 51 labels
  Ultra (4000/1000): 10
  Premium (2000/800): 41
Files:
  emoji-batch-calldata.txt    — raw 0x… calldata
  emoji-batch-runBatch.json   — Safe Tx Builder import (replace helper addr)
```

Diff `emoji-top50-admin-checklist.md` against your expectations before continuing. If anything changed in the curated list, re-run both scripts so the checklist and calldata stay in sync.

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

### Sanity-check the deploy before Step 2

```bash
# Helper.safe() must match the Treasury Safe
cast call <HELPER_ADDR> "safe()(address)" --rpc-url $IGRA_RPC
# expect: 0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1

# Helper.registry() must match the V2 Registry
cast call <HELPER_ADDR> "registry()(address)" --rpc-url $IGRA_RPC
# expect: 0x7E7018959bf44045F01D176D8db1594894CBf4E9
```

If either is wrong, you deployed with bad constructor args — destroy the helper (it's worthless) and redeploy with corrected env vars.

### Verify on Blockscout (optional)

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
- **ABI:** paste `[{"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]`
- **Method:** `transferOwnership`
- **newOwner:** `<HELPER_ADDR>` from Step 1
- ⚠️ **Verify the gas price field is ≥ 1100 gwei before signing.**

Sign + execute.

### Verify before moving to Step 3

```bash
cast call $REGISTRY_V2 "owner()(address)" --rpc-url $IGRA_RPC
# expect: 0x<HELPER_ADDR>
```

If `owner()` still returns the Safe, the transfer didn't land — repeat Step 2 (likely a gas-price stall).

## Step 3 — Safe calls helper.runBatch(...)

In the Safe Web app, open **Apps → Transaction Builder** (NOT the Contract Interaction form):

1. Click **"Drag and drop a JSON file"** (or use the file picker)
2. Drop `emoji-batch-runBatch.json` (from Step 0)
3. Before signing: open the JSON and replace `REPLACE_WITH_BATCH_HELPER_ADDRESS` with `<HELPER_ADDR>` from Step 1
4. Safe shows: "1 transaction · InsBatchPriceSetter.runBatch(string[], uint256[], uint256[])"
5. ⚠️ **Verify the gas price field is ≥ 1100 gwei before signing.**
6. Sign + execute

This single transaction:
1. Calls `setPremiumPrice` for each of the 51 emoji (Ultra at 4000, Premium at 2000)
2. Calls `setPremiumPriceAnnual` for each (Ultra at 1000, Premium at 800)
3. Sets the helper's `used` flag to `true` (one-shot, prevents re-execution)
4. Transfers ownership back to the Safe atomically

## Step 4 — Verify on chain

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

# Ownership returned to Safe
cast call $REGISTRY_V2 "owner()(address)" --rpc-url $IGRA_RPC
# expect: 0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1

# Helper is dead (one-shot)
cast call <HELPER_ADDR> "used()(bool)" --rpc-url $IGRA_RPC
# expect: true
```

## Troubleshooting

### Step 3 reverts mid-execution

If `runBatch` reverts (bad calldata, invalid label, OOG, etc.):
- Solidity rolls back the entire tx → `used` stays `false`, ownership stays with the helper
- **Recovery:** Safe calls `InsBatchPriceSetter.emergencyReturnOwnership()` (no args, no calldata) to pull ownership back, then redeploy with corrected inputs and start over from Step 1

### Step 3 succeeded but with wrong prices

If `runBatch` succeeded but you spot a wrong price afterward:
- The helper is now `used = true`, dead, and ownership has returned to Safe
- The wrong prices are not destructive — they just need overwriting
- **Recovery:** Deploy a NEW `InsBatchPriceSetter` (Step 1 again), `transferOwnership` to it (Step 2), `runBatch` with corrected prices (Step 3). Old wrong prices get overwritten.

### Safe accidentally re-transferred ownership to a used helper

After a successful runBatch the helper is `used = true`. If the Safe accidentally re-transfers Registry ownership to the helper (mis-clicked, replayed tx, automated workflow), the helper is still able to return ownership:
- **Recovery:** Safe calls `InsBatchPriceSetter.emergencyReturnOwnership()`. This is **not** gated on `used` — the rescue path always works as long as the helper currently owns the Registry.
- This safety net was added after audit feedback (commit history). Without it, Registry admin would be permanently inaccessible in this scenario.

### Tx stuck in mempool

Igra L2 enforces a 1.1 nKAS/gas (1100 gwei) floor. Safe's UI may show a lower default. If your transaction sits unconfirmed for >2 minutes after broadcast, it was likely below floor:
- **Speed-up:** Resubmit with `--with-gas-price 1100000000000` (Foundry) or the equivalent in Safe (Advanced → set gas price)
- Or cancel + re-sign with bumped gas

## Safety properties (post-audit)

- **One-shot pricing.** After `runBatch`, the `used` flag is `true` and any further `runBatch` call reverts. The contract can never set prices again.
- **Always-available rescue.** `emergencyReturnOwnership` is NOT gated on `used` so the Safe can ALWAYS recover Registry ownership while the helper holds it. Eliminates the permanent-lock vector.
- **Only the Safe can call.** Both external functions are `msg.sender == safe` gated. No other address can run them.
- **No funds at risk.** Helper has no payable functions, no withdraw path, no treasury — it can only call the two `setPremiumPrice*` functions and `transferOwnership(safe)`.
- **Routes ownership to one address.** The `safe` address is immutable. The helper can never transfer Registry ownership to anyone else.
- **Foundry tests:** 21/21 pass including 256-run fuzz on random batches and the post-audit lockup-rescue scenario.
- **Multi-agent audit:** 1 medium (lockup, fixed) + 4 lower-priority findings (all docs-related, fixed in this runbook).

## Tier list reference

See `emoji-top50-admin-checklist.md` at the project root for the full table with each emoji's Punycode label + pricing. That file and `emoji-batch-calldata.txt` are both generated from the SAME source-of-truth (`emoji-top50.json`) so they cannot drift.
