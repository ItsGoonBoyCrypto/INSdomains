# INS — MetaMask Snap

Native `.igra` name resolution inside MetaMask, with **zero on-chain calls
from inside the snap** — we hit the public REST API at insdomains.org/api
which handles V1+V2 union, caching, and error fallbacks.

## What it does

| Direction | Trigger | What the user sees |
|-----------|---------|---------------------|
| **Forward** | User types `alice.igra` in send field | MetaMask resolves to the wallet's actual `0x…` address |
| **Reverse** | MetaMask wants to display an address | If the holder has a primary `.igra` set, MetaMask shows `alice.igra` instead of `0x…` |

Works on `eip155:1` (Ethereum mainnet) and `eip155:38833` (Igra L2). Expand
chains list in `snap.manifest.json` as integrations land elsewhere.

## Local development

```bash
cd snap
npm install
npm run build      # bundles src/index.ts → dist/snap.js
npm run serve      # local server at http://localhost:8080
```

Then install in [MetaMask Flask](https://metamask.io/flask):
1. Open Flask, open a dapp that calls `snap_requestPermissions` for our local URL
   (or use [the official tester](https://metamask.github.io/snap-template-template/latest/))
2. Approve the snap install
3. Try entering `igranetwork.igra` in any send field

## Publishing (when ready)

1. `npm publish` to npm under `@ins/snap-resolver` (requires npm account + scope perm)
2. Submit to the [MetaMask Snap directory](https://snaps.metamask.io) for listing
   - Review process is human, takes 1-4 weeks per current ENS-style snaps
   - Provide repo URL, security model, link to TEST_REPORT.md / audit posture

## Security model

- **No private key access** — snap doesn't request `snap_manageState` or any
  signing permissions
- **Network access only** to `insdomains.org` — never sees the user's keys
  or other tx contents; just receives a domain string or address from MetaMask
- **REST API is signed** server-side by our hardened resolver (the same one
  that powers the CCIP-Read wildcard at `insdomains.eth`); compromise of
  the snap can ONLY return wrong addresses (no theft), and that's mitigated
  by users always reviewing the resolved address in MetaMask's confirm screen

## Layout

```
snap/
├── package.json           — npm metadata + scripts
├── snap.manifest.json     — Snap permissions + npm location (shasum auto-filled at build)
├── snap.config.ts         — webpack bundler config
├── tsconfig.json
├── images/
│   └── icon.svg           — INS gradient mark
├── src/
│   └── index.ts           — onNameLookup handler (forward + reverse)
└── dist/                  — built artifacts (gitignored)
```
