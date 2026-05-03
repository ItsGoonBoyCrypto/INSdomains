# Treasury Splitter — INS / Igra DAO revenue split

A tiny single-purpose contract (`contracts/src/TreasurySplitter.sol`) that
sits between Registry / Marketplace withdrawals and the final recipients
(Treasury Safe + Igra DAO multisig). It receives iKAS, holds it briefly,
then atomically splits the balance per a Safe-tunable basis-points ratio.

> **Why a separate contract?** The Registry's `withdraw(to)` is hardcoded to
> send the full balance to a single address (line 508 of
> `INSRegistryIgraV2.sol`). The Registry is already deployed + immutable
> modulo owner-tunable params, so adding a split feature requires either
> a new Registry deploy (orphans existing state) or a thin sidecar like
> this. The sidecar wins.

---

## Lifecycle

```
            ┌───────────────────────────────────────────┐
            │  INSRegistryIgraV2 (or any contract       │
            │  that holds iKAS revenue)                 │
            └───────┬───────────────────────────────────┘
                    │   step 1: Safe-signed
                    │   Registry.withdraw(splitter)
                    ▼
            ┌───────────────────────────────────────────┐
            │  TreasurySplitter (this contract)         │
            │  - holds iKAS until flushed               │
            │  - knows daoBps + treasury + dao          │
            └───────┬───────────────────────────────────┘
                    │   step 2: permissionless
                    │   splitter.flush()
        ┌───────────┴───────────┐
        ▼                       ▼
   Treasury Safe           Igra DAO multisig
   (treasuryBps share)     (daoBps share)
```

`flush()` is permissionless — anyone (operator, keeper bot, even a random
caller) can trigger the distribution. There are no funds at rest in normal
operation, so making it permissioned would only add a footgun (operator
forgets to flush) without reducing attack surface.

---

## Activation runbook

The splitter is designed to be deployed BEFORE Igra DAO has provided their
multisig address. Two-phase activation:

### Phase 1 — deploy the splitter (any time after Igra agrees on a split)

```bash
cd contracts

# Throwaway funded EOA pattern (same as Marketplace V2 deploy):
# 1. cast wallet new   # generate, fund 1-2 iKAS, export key
# 2. set in your shell:
export PRIVATE_KEY=0x<deployer key>
export INS_TREASURY=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1   # Treasury Safe
export DAO_ADDRESS=0x0000000000000000000000000000000000000000    # 0x0 OK pre-DAO
export DAO_BPS=0                                                  # 0 OK pre-DAO

forge script script/DeployTreasurySplitter.s.sol \
  --rpc-url https://rpc.igralabs.com:8545 \
  --broadcast \
  --legacy --slow --with-gas-price 1100000000000

# Drain deployer back to Safe:
cast send $INS_TREASURY --value $(cast balance $(cast wallet address $PRIVATE_KEY)) \
  --private-key $PRIVATE_KEY \
  --rpc-url https://rpc.igralabs.com:8545 \
  --legacy --gas-price 1100000000000
```

Then on the VPS:

```bash
# /home/insdapp/ins-dapp/.env.local
NEXT_PUBLIC_INS_TREASURY_SPLITTER=0x<deployed splitter address>

systemctl restart ins-dapp
```

After restart, the admin Treasury card surfaces a new "Split withdraw"
panel showing the live ratio + recipients + per-step buttons. With
`DAO_BPS=0` and `DAO_ADDRESS=0x0`, the splitter is a 100%-to-Treasury
passthrough — useful for verifying the wiring before Igra provides
their multisig.

### Phase 2 — wire in the Igra DAO multisig (when Igra provides it)

Two Safe txs from `0x7447…7aA1` (Treasury Safe), targeting the splitter:

```text
splitter.setDao(<igra dao multisig address>)
splitter.setSplit(<bps>)        # e.g. 3000 = 30% to DAO
```

Both reads update live in the dApp — no rebuild needed. The split-withdraw
panel will then show the new ratio + DAO address before any flush.

### Phase 3 — actually use it

Two Safe txs (or one batched if your Safe supports it) targeting `Registry`
then `splitter`, OR just use the dApp admin Treasury card:

```text
1. Registry.withdraw(splitter)   # Safe-signed; pulls 100% to splitter
2. splitter.flush()              # anyone-callable; splits + distributes
```

The dApp surfaces both as buttons in order.

---

## Owner controls (Treasury Safe)

The splitter's `owner` is the Treasury Safe by default (set in the deploy
script). All admin functions are Safe-only:

| Function                        | What it does                                            |
|---------------------------------|---------------------------------------------------------|
| `setSplit(uint16 daoBps)`       | Change DAO's share (0–10_000 bps). Treasury gets rest.  |
| `setDao(address)`               | Update DAO recipient. `0x0` allowed (must set bps to 0). |
| `setTreasury(address)`          | Update Treasury recipient. `0x0` rejected.               |
| `transferOwnership(address)`    | Hand admin to a different wallet/Safe.                   |

The dApp UI does NOT expose admin writes — admin-only paths live in the
Safe to keep the trust boundary clean.

---

## Tests

`contracts/test/TreasurySplitter.t.sol` — **35 tests, 4 fuzz suites at 256
runs each, all passing**:

- Constructor input validation (zero-address, bps cap, zero-DAO is OK)
- Happy-path flush at 30/70, 0/100, 100/0 splits
- Rounding (DAO rounds DOWN, treasury keeps the residual)
- Permissionless flush
- Admin (`setSplit`, `setDao`, `setTreasury`, `transferOwnership`)
- Revert paths (`DaoUnsetButShareNonZero`, `SendFailed`, `BpsTooHigh`,
  `ZeroAddress`, `NotOwner`)
- `receive()` emits `Funded`
- Fuzz: split correctness, full-route fallback when `daoBps == 0`,
  rounding never overpays DAO, non-owner writes always revert

```bash
cd contracts
forge test --match-contract TreasurySplitterTest -vvv
```

---

## Trust + safety notes

- **Permissionless flush** is intentional. The splitter holds no state
  worth protecting at rest; the only inputs to `flush()` are
  `address(this).balance` and the immutable-modulo-owner config. A keeper
  bot can flush automatically on a schedule if the team prefers.
- **Reentrancy.** `flush()` reads balance once, makes two cold sends, and
  doesn't mutate state in between. A reentrant inbound call would just
  see balance == 0 and emit a zero-amount `Flushed`. The contract has no
  other state to drain.
- **Rounding** always rounds DOWN on the DAO side. Treasury keeps the
  residual (1 wei in the worst case). Tested + fuzz-asserted.
- **Owner-only writes** revert with `NotOwner` — fuzz-tested across
  arbitrary callers.
- **DAO unset.** If `dao == 0x0` and `daoBps > 0`, `flush()` reverts with
  `DaoUnsetButShareNonZero`. Either set the DAO address or set bps to 0
  before flushing.

---

## When it's NOT needed

- If Igra DAO opts to receive zero share, leave `NEXT_PUBLIC_INS_TREASURY_SPLITTER`
  unset and the dApp behaves exactly as before — single-recipient
  `Registry.withdraw(safe)` directly into the Treasury Safe.
- If you want to manually split off-chain (Safe → Treasury, then a separate
  Safe tx to DAO), that also works with no contract changes. The splitter
  just makes it a one-click flow.

---

## File map

| Path                                            | What                                          |
|-------------------------------------------------|-----------------------------------------------|
| `contracts/src/TreasurySplitter.sol`            | Splitter contract                             |
| `contracts/test/TreasurySplitter.t.sol`         | 35 tests + 4 fuzz suites                      |
| `contracts/script/DeployTreasurySplitter.s.sol` | Deploy script (Treasury Safe = owner)         |
| `lib/contracts.ts`                              | `TREASURY_SPLITTER_ADDRESS` + ABI exports     |
| `app/admin/page.tsx`                            | `SplitterWithdrawSection` (env-gated UI)      |
| `docs/TREASURY_SPLITTER.md`                     | This file                                     |
