# Security Model — INS MetaMask Snap (`ins-snap-resolver`)

## TL;DR

INS Snap is a **read-only name resolver**. It cannot move funds, sign transactions, see private keys, or modify any MetaMask state. The worst-case compromise is returning a wrong address for a `.igra` name — which is still bounded because MetaMask always shows the resolved address to the user before they confirm a transaction.

## Permission surface

| Permission | Why we request it | Scope |
|---|---|---|
| `endowment:name-lookup` | Required for MetaMask to invoke the snap when the user types a name in the send field. This is the only mechanism by which the snap is called. | Limited to chains `eip155:1` (Ethereum Mainnet) and `eip155:38833` (Igra L2) per `snap.manifest.json` |
| `endowment:network-access` | The snap makes HTTPS calls to our public REST API for resolution. | Hard-coded to `https://insdomains.org/api` — no other origins reachable |

## What the snap **does not** request

| Permission | Not requested because |
|---|---|
| `snap_getBip32Entropy` | We don't derive or use any private keys |
| `snap_getBip44Entropy` | Same |
| `snap_getEntropy` | We don't need entropy — resolution is deterministic |
| `snap_manageAccounts` | We don't manage accounts |
| `snap_dialog` | We don't render UI; MetaMask handles all UX |
| `snap_manageState` | We don't persist any client-side state |
| `endowment:transaction-insight` | We don't inspect transactions |
| `endowment:rpc` | We don't expose RPC methods to dapps |
| `endowment:lifecycle-hooks` | We don't run on install / update / shutdown |
| `endowment:webassembly` | No WASM in the bundle |

## Threat model

### What an attacker controlling the snap could do

| Capability | Impact | Mitigation |
|---|---|---|
| Return a different address for a `.igra` name | User could send funds to attacker's address | MetaMask always shows the resolved address in the send confirmation — user can verify before signing. Plus the snap is open-source on GitHub at a fixed version + pinned shasum in the manifest, so users can audit the exact bytes they install. |
| Exfiltrate the name being looked up | Attacker learns who you're sending to | Low impact — only the name you type, not balances / private state. Mitigated further by the fact that the only network destination is `insdomains.org`, which is already getting that lookup anyway. |
| Return failure to deny lookups | User has to type the raw `0x…` address | Fail-closed by design — MetaMask doesn't fall back to dangerous defaults. |

### What an attacker **cannot** do

- Cannot sign or broadcast transactions (no signing permissions)
- Cannot access wallet private keys (no entropy permissions)
- Cannot modify wallet state (no `snap_manageState`)
- Cannot read other dapp data (snaps are sandboxed)
- Cannot move funds (snap doesn't touch any address book / approval state)

## Code surface area

- **1 file:** `src/index.ts` (121 lines TypeScript, no dependencies beyond `@metamask/snaps-sdk` types)
- **1.3 KB minified bundle** — entire snap is auditable in ~2 minutes
- **2 network calls:** `GET https://insdomains.org/api/resolve?name=<name>` and `GET https://insdomains.org/api/reverse?address=<addr>`
- **No external dependencies at runtime** (snaps-sdk types are erased at compile time; bundle uses only browser globals `fetch` + `AbortController`)

## Network call hardening

- All fetches use `AbortController` with a 5-second timeout — the snap cannot hang the wallet UI
- Both endpoints return small JSON payloads with a fixed schema; we ignore any unexpected fields
- Hard-coded to HTTPS (no plain HTTP allowed)
- No request bodies (GET-only), so there's nothing the snap can leak from MetaMask state

## Reproducible builds

The snap bundle is deterministic — building from the same git commit with the same toolchain produces the identical `dist/snap.js` and the identical shasum recorded in `snap.manifest.json`. To verify:

```bash
git clone https://github.com/ItsGoonBoyCrypto/INSdomains
cd INSdomains/snap
npm install
npm run build
diff <(cat dist/snap.js) <(curl -sS https://registry.npmjs.org/ins-snap-resolver/-/ins-snap-resolver-0.1.0.tgz | tar -xzO package/dist/snap.js)
```

If those match (and they should), the published npm tarball contains the same code as this repo at HEAD.

## Reporting a vulnerability

Open a security advisory at https://github.com/ItsGoonBoyCrypto/INSdomains/security/advisories/new or DM `@GoonBoyCrypto` on X. We commit to acknowledging within 48 hours and shipping a fix within 7 days for any critical issue.

## Audit history

| Date | Auditor | Scope | Findings | Report |
|---|---|---|---|---|
| 2026-05-30 | Self-review | Permission scope + threat model | Documented in this file | — |

No third-party audit has been commissioned. Per the MetaMask Snap Directory guidelines, third-party audits are required only for snaps using key-management methods (`snap_getBip*`, `snap_manageAccounts`, etc.). `ins-snap-resolver` uses none of those.
