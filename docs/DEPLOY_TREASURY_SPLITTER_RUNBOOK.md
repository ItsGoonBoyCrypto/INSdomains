# TreasurySplitter Deploy Runbook — 2026-06-XX

**Goal:** deploy `TreasurySplitter` on Igra L2 mainnet, configured to route **20% of every future INS Registry / Marketplace withdrawal to the Igra DAO multisig**, with the remaining 80% to the INS Treasury Safe.

**Time:** ~30 minutes start to finish.
**Cost:** ~1-2 iKAS gas total on Igra L2.
**Blockers cleared:** none — Pavel's DAO multisig address received 2026-06-XX.

---

## 📋 Inputs (confirmed)

| | |
|---|---|
| **INS Treasury Safe** (recipient of 80%, also splitter owner) | `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |
| **Igra DAO multisig** (recipient of 20%) | `0x90870B1017f3FcbB11647BF563F3c2333EA8a2c2` ✓ verified on-chain (123-byte Safe contract, 6.9M iKAS balance, nonce 1) |
| **DAO_BPS** | `2000` (20% in basis points) |
| **Chain** | Igra L2 mainnet (id `38833`) |
| **RPC** | `https://rpc.igralabs.com:8545` |
| **Explorer** | `https://explorer.igralabs.com` |

---

## ⚙️ Pre-deploy (5 min)

### 1. Fund a throwaway deployer

You need ANY funded wallet with **~2 iKAS** for gas. Use a fresh keypair so the private key only lives long enough to deploy + can be wiped after.

Generate one (PowerShell):
```powershell
cd "C:\Users\Liam\Claude Code\ins-dapp\contracts"
cast wallet new
```

Copy the **Address** + **Private key**. Send ~2 iKAS from your normal wallet to the new address. Wait for confirmation.

### 2. Confirm the deployer has gas

```powershell
cast balance <DEPLOYER_ADDRESS> --rpc-url https://rpc.igralabs.com:8545
```

Should show ≥ `2000000000000000000` (2e18, i.e. 2 iKAS).

---

## 🚀 Deploy (one command)

From `contracts/` directory in PowerShell:

```powershell
$env:PRIVATE_KEY="<deployer private key>"
$env:INS_TREASURY="0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
$env:DAO_ADDRESS="0x90870B1017f3FcbB11647BF563F3c2333EA8a2c2"
$env:DAO_BPS="2000"

forge script script/DeployTreasurySplitter.s.sol `
  --rpc-url https://rpc.igralabs.com:8545 `
  --legacy --slow --with-gas-price 1100000000000 `
  --broadcast
```

**Capture the output** — at the end you'll see:

```
======================================================
TreasurySplitter deployed: 0x<NEW_ADDRESS>
======================================================
treasury (recipient):      0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1
treasury  bps:             8000
dao      (recipient):      0x90870B1017f3FcbB11647BF563F3c2333EA8a2c2
dao       bps:             2000
owner    (Safe):           0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1
```

**Save `0x<NEW_ADDRESS>`** — that's the splitter. You'll need it for steps below.

---

## ✅ Post-deploy verification (3 min)

Run all of these — every one should return the expected value:

```powershell
$SPLITTER="0x<NEW_ADDRESS>"

# 1. Treasury wired correctly (expect 0x7447F0e5...07aA1)
cast call $SPLITTER "treasury()(address)" --rpc-url https://rpc.igralabs.com:8545

# 2. DAO wired correctly (expect 0x90870B10...A2c2)
cast call $SPLITTER "dao()(address)" --rpc-url https://rpc.igralabs.com:8545

# 3. DAO basis points (expect 2000)
cast call $SPLITTER "daoBps()(uint16)" --rpc-url https://rpc.igralabs.com:8545

# 4. Treasury basis points (expect 8000)
cast call $SPLITTER "treasuryBps()(uint16)" --rpc-url https://rpc.igralabs.com:8545

# 5. Owner is the Safe (expect 0x7447F0e5...07aA1)
cast call $SPLITTER "owner()(address)" --rpc-url https://rpc.igralabs.com:8545

# 6. Preview a 1000-iKAS split (expect 800 to treasury, 200 to DAO)
cast call $SPLITTER "previewSplit(uint256)(uint256,uint256)" 1000000000000000000000 --rpc-url https://rpc.igralabs.com:8545
```

If anything's off, **don't proceed** — DM me + we redeploy.

---

## 🌐 Update VPS env (2 min)

SSH to VPS and add the new env var so the dApp can reference the splitter:

```bash
ssh -i ~/.ssh/ziggy_github_v2 root@91.99.27.76 <<'EOF'
SPLITTER="0x<NEW_ADDRESS>"
echo "NEXT_PUBLIC_INS_TREASURY_SPLITTER=$SPLITTER" >> /home/insdapp/ins-dapp/.env.local
chown insdapp:insdapp /home/insdapp/ins-dapp/.env.local
grep "TREASURY_SPLITTER" /home/insdapp/ins-dapp/.env.local
systemctl restart ins-dapp
sleep 5
systemctl is-active ins-dapp
EOF
```

---

## 💸 Drain deployer + wipe key (2 min)

```powershell
# Send remaining deployer balance back to Treasury Safe
cast send 0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1 `
  --value <REMAINING_BALANCE_WEI> `
  --private-key $env:PRIVATE_KEY `
  --rpc-url https://rpc.igralabs.com:8545 `
  --legacy --gas-price 1100000000000

# Clear from shell
Remove-Item env:PRIVATE_KEY
Remove-Item env:INS_TREASURY
Remove-Item env:DAO_ADDRESS
Remove-Item env:DAO_BPS
```

Or just close the PowerShell window — env vars die with the shell.

---

## 🏛 First real-world drain — how it works going forward

This is FYI / pattern reference. You don't need to do this on deploy day unless you also want to trigger the first split.

The flow once splitter exists:

```
              ┌────────────────┐
              │ V2 Registry     │  (collects 4000 iKAS forever mint fees, etc)
              │  balance: X iKAS│
              └─────┬──────────┘
                    │
        Safe tx ──> │  Registry.withdraw(splitter)
                    │
                    ▼
              ┌────────────────┐
              │  Splitter       │  (now holds X iKAS)
              │  balance: X iKAS│
              └─────┬──────────┘
                    │
       Anyone ───>  │  splitter.flush()
                    │
            ┌───────┴───────┐
            ▼               ▼
       80% to Safe     20% to DAO
       (0x7447…07aA1)  (0x9087…A2c2)
```

The Safe tx to drain the V2 Registry into the splitter is:

- **To:** V2 Registry `0x7E7018959bf44045F01D176D8db1594894CBf4E9`
- **Value:** `0`
- **Data:** `cast calldata "withdraw(address)" $SPLITTER`  *(fill in splitter address)*
- **Operation:** 0 (call)

Then anyone (you, a keeper, even a random caller — `flush()` is permissionless) calls:

- **To:** Splitter
- **Function:** `flush()`
- **Value:** `0`
- **Data:** `0x53d5cc34` (the `flush()` selector)

After flush, the splitter balance is 0, treasury gained 80%, DAO gained 20%.

---

## 📢 Announce (15 min — pick what you want to do)

Three independent comms; pick one or all:

### A. /about page update (auto — I'll commit + deploy after deploy lands)

The /about page currently says nothing about DAO split. After deploy I'll add a tile:

> **20% of all INS fees → Igra DAO**
> Every Registry / Marketplace withdrawal automatically routes 20% to
> the Igra DAO multisig via [TreasurySplitter](https://explorer.igralabs.com/address/<SPLITTER>).
> Governance live. Aligned incentives.

### B. Tweet draft (paste-ready)

```
🏛 Governance milestone for INS:

20% of every fee → Igra DAO multisig.
80% → INS Treasury Safe.

Automatic, on-chain, no human in the loop.

Powered by our open-source TreasurySplitter on Igra L2:
explorer.igralabs.com/address/<SPLITTER>

Aligned with @IgraLabs from day one. 🟣
```

(280 char limit — confirm it fits before posting)

### C. DM Pavel

```
Splitter deployed at <SPLITTER>. DAO multisig you sent (0x9087…A2c2) 
is now hardwired as a 20% recipient on every future fee withdrawal — 
no further coordination needed. Permissionless `flush()`, owned by 
our Treasury Safe so we can tune the split if your DAO ever decides 
20% should be different.

First withdrawal through it goes through this week. I'll DM the 
splitter Etherscan link + the first flush tx hash when it lands so 
you can verify the DAO multisig received its share.

🫡
```

---

## 🛟 If something goes wrong

| Failure | Likely cause | Recovery |
|---|---|---|
| `forge script` errors with "INS_TREASURY must be set" | Env var wasn't exported in the same shell | Re-export, re-run |
| Deploy reverts with "BpsTooHigh" | DAO_BPS > 10000 | You set wrong value; should be `2000` |
| Deploy succeeds but `treasury()` returns wrong address | Wrong INS_TREASURY env value | Redeploy with correct env |
| `Insufficient funds` on deploy | Deployer needs more gas | Send another iKAS or two |
| `verify-contract` fails | Igra Blockscout flaky | Skip verification — non-critical, can do later via the dApp /admin page |
| Forgot to capture splitter address from output | The deploy tx receipt has it | `cast tx <DEPLOY_TX_HASH> --rpc-url https://rpc.igralabs.com:8545` then look at the `contractAddress` field of the receipt |

---

## ✅ Done state

After all steps:
- [ ] TreasurySplitter deployed at `0x...` on Igra L2 mainnet
- [ ] All 6 `cast call` verifications return expected values
- [ ] `NEXT_PUBLIC_INS_TREASURY_SPLITTER` env var on VPS, ins-dapp restarted, service `active`
- [ ] Deployer drained back to Treasury, key wiped
- [ ] /about page updated (auto — commit goes in once you ping me with the splitter address)
- [ ] Tweet posted
- [ ] Pavel DM'd

When checked, the Igra DAO governance loop is **live**. Every future iKAS that hits the Registry/Marketplace is automatically destined to be split 80/20 once the Safe drains.

---

## 📚 References

- TreasurySplitter source: `contracts/src/TreasurySplitter.sol`
- Deploy script: `contracts/script/DeployTreasurySplitter.s.sol`
- Tests (35+ cases incl. fuzz): `contracts/test/TreasurySplitter.t.sol`
- Igra DAO multisig: https://explorer.igralabs.com/address/0x90870B1017f3FcbB11647BF563F3c2333EA8a2c2
- INS Treasury Safe: https://explorer.igralabs.com/address/0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1
