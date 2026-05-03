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

# When Igra DAO multisig is known and you want to deploy with the
# production split baked in, set DAO_ADDRESS to their address and
# DAO_BPS=2000 (= 20% to DAO / 80% to Treasury Safe — the planned
# production split for INS V2).

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
splitter.setSplit(2000)         # 2000 bps = 20% to DAO (production split)
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
| `transferOwnership(address)`    | Step 1 of 2-step handoff — sets `pendingOwner`. Owner does NOT change yet. Pass `0x0` to cancel a pending transfer. |
| `acceptOwnership()`             | Step 2 — must be called by the address `transferOwnership` was directed at. Atomically rotates `owner` and clears `pendingOwner`. |

The dApp UI does NOT expose admin writes — admin-only paths live in the
Safe to keep the trust boundary clean.

### Trust model — what the Safe can do

The Treasury Safe owns the splitter and can socially / contractually
override the DAO's share at any time. Specifically, the Safe can:

- `setSplit(0)` to send 100% to treasury on the next flush
- `setDao(<arbitrary address>)` to redirect the DAO's share elsewhere
- `setTreasury(<arbitrary address>)` to redirect treasury's share

This is the SAME trust model that already governs the Registry (which
the Safe also owns). The "20% to DAO" commitment is therefore SOCIAL,
backed by the Safe's transparent on-chain history rather than a timelock
or immutable parameter. If the Igra DAO needs a stronger guarantee, the
options are:

1. **Hand splitter ownership to the DAO multisig** via `transferOwnership`
   + `acceptOwnership` (the 2-step pattern lets the DAO sign-and-confirm
   atomically, no risk of the Safe sending to a typo'd address).
2. **Wrap the Safe in a TimelockController** (OpenZeppelin) so any
   `setSplit/setDao/setTreasury` waits N hours before execution — gives
   the DAO time to react if the Safe behaves adversarially.
3. **Burn ownership** (`transferOwnership(0x0)` + accept by 0x0 — not
   currently possible since `acceptOwnership` requires `msg.sender == pendingOwner`,
   intentionally — leave config locked at the current settings forever).

For launch we ship as-is (Safe-owned, no timelock) — same risk surface
as the Registry, no net-new trust assumption.

---

## Tests

`contracts/test/TreasurySplitter.t.sol` — **41 tests, 4 fuzz suites at 256
runs each, all passing**:

- Constructor input validation (zero-address, bps cap, zero-DAO is OK)
- Happy-path flush at 20/80 (production), 0/100, 100/0 splits
- Rounding (DAO rounds DOWN, treasury keeps the residual)
- Permissionless flush
- Admin (`setSplit`, `setDao`, `setTreasury`)
- Two-step ownership: `transferOwnership` doesn't rotate, `acceptOwnership`
  atomically rotates + clears pending, non-pending caller reverts, can
  cancel by passing `0x0` to `transferOwnership`
- Revert paths (`DaoUnsetButShareNonZero`, `SendFailed`, `BpsTooHigh`,
  `ZeroAddress`, `NotOwner`, `NotPendingOwner`)
- `receive()` emits `Funded`
- Audit-extra coverage:
  - Reentrancy attempt — malicious DAO calls `flush()` from receive(),
    treasury still gets paid in full, no double-spend
  - Send-order — gas-griefing DAO recipient burns 5_000-iteration loop
    in receive(), treasury still gets paid (because treasury is sent FIRST)
  - Force-balance via `selfdestruct` is handled cleanly when DAO unset + bps=0
  - `setTreasury(splitter)` self-loop returns funds to splitter (no loss,
    next flush after a fix-up recovers them)
- Fuzz: split correctness, full-route fallback when `daoBps == 0`,
  rounding never overpays DAO, non-owner writes always revert

```bash
cd contracts
forge test --match-contract TreasurySplitter -vvv
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
