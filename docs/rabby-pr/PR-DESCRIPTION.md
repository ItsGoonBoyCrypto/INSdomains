# Add `.igra` (INS — Igra Name Service) resolution to the send flow

## Description

This PR adds Igra Name Service (`.igra`) resolution to Rabby's send screen.
On the address input, type any registered `.igra` name (e.g. `alice.igra`)
and wait ~300ms — Rabby will resolve it to the linked wallet address.

Same pattern as PR #3544 (RNS / Rootstock) — mirrors the existing
`BlockscoutService` architecture exactly: a small REST-API client in
`src/background/service/`, registered in the barrel export, wired through
the wallet controller, and called as a resolution fallback in the
`EnterAddress` component.

## Why

INS is the canonical name service for Igra Network — an EVM-equivalent L2
(chain ID 38833) built on Kaspa BlockDAG. Over 150 names registered to date.
We've shipped:

- **MetaMask Snap** (live on npm: `ins-snap-resolver`, directory submission
  filed) — works in MetaMask Flask today
- **CCIP-Read on Ethereum L1** via `*.insdomains.eth` wildcard (works in
  MetaMask, but **not in Rabby** because Rabby's ENS resolver doesn't
  follow `OffchainLookup` reverts)
- **Public REST API** at `https://insdomains.org/api` (1.3 KB resolver
  bundle, sub-300ms p95)

Rabby users currently have to copy-paste full 0x addresses for `.igra`
recipients, which is exactly the friction this PR removes.

## How it works

1. User types `alice.igra` in the recipient field of the send screen.
2. Rabby's existing ENS resolution returns null (not a `.eth` name).
3. New INS service hits `https://insdomains.org/api/resolve?name=alice.igra`.
4. API returns the linked address from the on-chain INS V2 Registry.
5. Rabby displays the tag `INS: alice.igra` and stores the resolved
   address — same UX as `ENS:` / `RNS:` today.

If the name doesn't end in `.igra`, doesn't exist on-chain, or the API
is unreachable, the service returns null and the resolution chain falls
through to RNS (matching the existing pattern). Zero impact on the
existing ENS/RNS flow.

## Security

- **Read-only API call** — no signing, no key access, no state modification
- **One HTTPS endpoint** — hard-coded to `insdomains.org/api/resolve`
- **No private keys ever touched** — the service has no access to user wallet state
- **Fails closed** — any error returns null, falling through to whatever
  resolution path Rabby already supports
- INS source code is MIT, fully open: https://github.com/ItsGoonBoyCrypto/INSdomains
- INS Snap security review: https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/snap/SECURITY.md

## Test plan

Manual test in the send screen:

| Input | Expected |
|---|---|
| `igranetwork.igra` | Resolves to `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1`, tag shows "INS: igranetwork.igra" |
| `insdomains.igra` | Resolves to same wallet, tag shows "INS: insdomains.igra" |
| `claudeai.igra` | Resolves to `0x7da206f0634Fa30C68279A0EA4E1b8750217e914`, tag shows "INS: claudeai.igra" |
| `doesnotexist.igra` | No resolution, falls back to invalid-address state |
| `vitalik.eth` | Resolves via existing ENS path (no regression) |
| `alice.rsk` | Resolves via existing RNS path (no regression) |
| `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` | Direct address, no resolution attempted |

## Files changed (4 files, ~80 lines)

| File | Change |
|---|---|
| `src/background/service/insService.ts` | **NEW** — 50 lines. INS REST API client following the BlockscoutService pattern. |
| `src/background/service/index.ts` | **+1 line** — export the new service. |
| `src/background/controller/wallet.ts` | **+1 import + 8 lines** — `getInsAddressByName` method. |
| `src/ui/views/SelectToAddress/components/EnterAddress.tsx` | **+12 lines** — INS tag + INS resolution fallback. |

## Related

- INS public install page (MetaMask Snap): https://insdomains.org/snap
- INS user help / KB: https://insdomains.org/snap-help
- INS npm package: https://www.npmjs.com/package/ins-snap-resolver
- INS source: https://github.com/ItsGoonBoyCrypto/INSdomains/tree/main/snap
- Igra Network: https://igralabs.com
- Submission to MetaMask Snap Directory: filed 2026-05-30 (pending review)

CC @vvvvvv1vvvvvv @cs1707 — happy to address any feedback.
