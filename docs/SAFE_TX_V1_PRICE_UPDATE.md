# Safe transaction — V1 price update (.igra Registry)

**Goal:** raise the on-chain `lengthPrice[bucket]` values on the live `.igra`
Registry to match the new **Forever** tier locked for V1.

V1 only knows one price per length tier (no 1-year/Forever distinction yet —
that lands in V2). Anyone minting between now and V2 launch is buying a
Forever name; when V2 ships, V1 holders are grandfathered onto the V2
Forever tier for **gas only** (path A migration).

---

## Target contract

| Field | Value |
|---|---|
| Network | Igra L2 (chain `38833`) |
| Contract | INSRegistryIgra |
| Address | `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` |
| Owner | Treasury Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |
| Function | `setLengthPrice(uint8 bucket, uint256 price)` |
| Selector | `0x6b7c20d3` |

Each call emits `LengthPriceUpdated(bucket, price)`. The dApp `priceFor()` /
homepage / `/about` pricing card will reflect the new values on the next
RPC read (a few seconds).

---

## The 5 transactions

Bundle these as a **batch** in the Safe UI (Transaction Builder app) so they
all execute atomically in one Safe execution. If you prefer one-per-tx, run
them in any order — they're independent.

| # | Bucket | Length tier | New price | Wei (uint256) |
|---|---|---|---|---|
| 1 | `1` | 1-char (ultra-premium) | **4,000 iKAS** | `4000000000000000000000` |
| 2 | `2` | 2-char (premium) | **2,000 iKAS** | `2000000000000000000000` |
| 3 | `3` | 3-char (rare) | **1,200 iKAS** | `1200000000000000000000` |
| 4 | `4` | 4-char (uncommon) | **800 iKAS** | `800000000000000000000` |
| 5 | `5` | 5–32 char (standard) | **500 iKAS** | `500000000000000000000` |

> **Heads up on bucket 1:** it's currently set to `TIER_RESERVED`
> (`type(uint256).max`), meaning 1-char names are admin-mint-only today.
> Setting bucket 1 to `4000 ether` **unreserves the entire 1-char tier for
> public minting at 4,000 iKAS**. If you don't want that, skip tx #1 and
> issue 1-char names manually via `setPremiumPrice(label, 4000 ether)`
> per name as needed.

---

## How to execute (Safe Web app)

1. Open <https://app.safe.global> and connect to the Igra Safe at
   `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` on chain 38833.
2. **Apps** → **Transaction Builder** → **New batch**.
3. For each of the 5 transactions:
   - **Address** → `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c`
   - **ABI** → paste the snippet below (or the contract's full ABI from
     the explorer if Safe auto-pulls it)
   - **Function** → `setLengthPrice`
   - **`bucket (uint8)`** → the bucket number (1-5)
   - **`price (uint256)`** → the wei value from the table above
   - Click **Add transaction**
4. Click **Create batch** → **Send batch** → confirm in your wallet.
5. Co-signers approve in the Safe, then **Execute**.

Minimal ABI snippet to paste into the Transaction Builder:

```json
[
  {
    "type": "function",
    "name": "setLengthPrice",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "bucket", "type": "uint8" },
      { "name": "price",  "type": "uint256" }
    ],
    "outputs": []
  }
]
```

---

## Alternative: cast (CLI)

If you want to dry-run the calldata locally before pasting into Safe:

```bash
cast calldata "setLengthPrice(uint8,uint256)" 1 4000000000000000000000
cast calldata "setLengthPrice(uint8,uint256)" 2 2000000000000000000000
cast calldata "setLengthPrice(uint8,uint256)" 3 1200000000000000000000
cast calldata "setLengthPrice(uint8,uint256)" 4 800000000000000000000
cast calldata "setLengthPrice(uint8,uint256)" 5 500000000000000000000
```

Output: 5 calldata blobs you can paste directly into the Safe Transaction
Builder's **raw data** field (skip the function picker entirely).

---

## Verify after execution

Wait ~30s for indexing, then sanity-check from any terminal:

```bash
# Should now return 4000 iKAS in wei (4000000000000000000000)
cast call 0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c \
  'lengthPrice(uint8)(uint256)' 1 \
  --rpc-url https://rpc.igralabs.com:8545

# Or hit our public API — same source of truth
curl 'https://insdomains.org/api/resolve?name=ab'
# (any 2-char query returns priceFor() in the response)
```

Or browse to <https://insdomains.org/about> — the tier chips render the
fresh on-chain values once Next.js revalidates the cache.

---

## Rollback

If anything looks wrong, run a second batch with the previous prices:

| Bucket | Previous price | Wei |
|---|---|---|
| 1 | TIER_RESERVED | `115792089237316195423570985008687907853269984665640564039457584007913129639935` |
| 2 | 5,000 iKAS | `5000000000000000000000` |
| 3 | 500 iKAS | `500000000000000000000` |
| 4 | 50 iKAS | `50000000000000000000` |
| 5 | 10 iKAS | `10000000000000000000` |

(These are the constructor defaults — adjust if a more recent admin tx
changed them. Check the explorer's `LengthPriceUpdated` event log for the
authoritative latest value.)
