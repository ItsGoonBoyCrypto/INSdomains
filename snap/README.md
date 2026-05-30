# INS Snap — Native `.igra` name resolution in MetaMask

[![npm version](https://img.shields.io/npm/v/ins-snap-resolver.svg?color=00f0ff)](https://www.npmjs.com/package/ins-snap-resolver)
[![bundle size](https://img.shields.io/badge/bundle-1.3KB-a855f7)](https://www.npmjs.com/package/ins-snap-resolver)
[![license](https://img.shields.io/badge/license-MIT-67e8f9)](#license)

Resolve `.igra` names natively in MetaMask's send field. No copy-paste, no extension switching, no `.eth` name required.

> **Snap ID:** `npm:ins-snap-resolver` &nbsp;&nbsp;&nbsp;&nbsp; **Website:** [insdomains.org/snap](https://insdomains.org/snap)

## Quick install

Open https://insdomains.org/snap in a browser with [MetaMask Flask](https://metamask.io/flask) installed, click **Install INS Snap**, approve the popup. That's it.

> **Why Flask?** Regular MetaMask only loads snaps from the official [Snap Directory](https://snaps.metamask.io). Our directory submission is pending — once approved, the snap will install one-click in regular MetaMask as well. Flask is MetaMask's developer build and runs side-by-side with regular MetaMask in the same browser.

## What it does

| Direction | Trigger | Effect |
|---|---|---|
| **Forward** | User types `alice.igra` in any send field | MetaMask resolves it to the linked wallet address before showing the confirmation screen |
| **Reverse** | MetaMask wants to display a wallet address | If that address has a primary `.igra` name set, MetaMask shows the name instead of the long `0x…` |

Works on `eip155:1` (Ethereum Mainnet) and `eip155:38833` (Igra L2).

## How it works

```
                            ┌──────────────────────────────┐
   user types "alice.igra"  │   MetaMask                   │
   in send field      ───>  │   • dispatches onNameLookup  │
                            └──────────────┬───────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │   ins-snap-resolver          │
                            │   • filters for .igra suffix │
                            │   • 5s timeout on fetch      │
                            │   • no keys, no signing      │
                            └──────────────┬───────────────┘
                                           │
                                           ▼ HTTPS
                            ┌──────────────────────────────┐
                            │ insdomains.org/api/resolve   │
                            │   • unions V1 + V2 registry  │
                            │   • cached + rate-limited    │
                            └──────────────┬───────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────────┐
                            │   Igra L2 (chain id 38833)   │
                            │   INSRegistryIgraV2.resolve  │
                            └──────────────────────────────┘
```

## Security

INS Snap is a **read-only name resolver**:

- ✅ No signing permissions
- ✅ No key access (`snap_getBip*` / `snap_manageAccounts` never requested)
- ✅ No persistent storage
- ✅ Single network destination: `https://insdomains.org`
- ✅ 1.3 KB minified bundle, auditable in ~2 minutes
- ✅ Deterministic builds — npm tarball matches git HEAD byte-for-byte

Full threat model: [SECURITY.md](./SECURITY.md).

## For wallet / dapp developers

Trigger a snap install from your own dapp:

```ts
await window.ethereum.request({
  method: 'wallet_requestSnaps',
  params: { 'npm:ins-snap-resolver': {} },
});
```

Or skip the snap entirely and call our public REST API directly:

```bash
curl https://insdomains.org/api/resolve?name=igranetwork.igra
# {"exists":true,"address":"0xA55E44b6...6506","name":"igranetwork.igra"}

curl https://insdomains.org/api/reverse?address=0xA55E...6506
# {"primary":"insdomains.igra"}
```

Full API reference: [docs/API.md](../docs/API.md).

## Local development

```bash
cd snap
npm install
npm run build      # bundles src/index.ts → dist/snap.js
npm run serve      # local server on http://localhost:8080
```

**Windows build note:** snaps-cli 8.x has a path-encoding bug on Windows paths containing spaces (`Claude%20Code` URL-encoded → ENOENT on the SES eval-worker). Build in a space-free temp directory and copy artifacts back:

```bash
cp -r snap /c/temp/ins-snap-build
cd /c/temp/ins-snap-build
npm install && npm run build
cp dist/snap.js path/to/repo/snap/dist/
cp snap.manifest.json path/to/repo/snap/
```

## Project layout

```
snap/
├── package.json              — npm metadata + build scripts
├── snap.manifest.json        — Snap permissions + npm location + shasum
├── snap.config.ts            — snaps-cli config (webpack bundler)
├── tsconfig.json
├── images/
│   └── icon.svg              — INS gradient mark (cyan→purple)
├── src/
│   └── index.ts              — onNameLookup handler (forward + reverse)
├── dist/                     — built artifacts (gitignored, generated by npm run build)
├── dev-installer.html        — local install + EIP-6963 wallet picker for testing
├── README.md                 — this file
└── SECURITY.md               — full threat model + permission justification
```

## Publishing

The snap is published to npm as [`ins-snap-resolver`](https://www.npmjs.com/package/ins-snap-resolver). To release a new version:

1. Bump `version` in both `package.json` and `snap.manifest.json` (must match)
2. `npm run build` to regenerate `dist/snap.js` and the manifest shasum
3. `npm publish --access public`
4. Submit a [directory update request](https://go.metamask.io/snaps-directory-update-request) so the new version reaches regular MetaMask users

## License

MIT — see [LICENSE](../LICENSE) in the repo root.

## Links

- 🌐 Website: https://insdomains.org/snap
- 📦 npm: https://www.npmjs.com/package/ins-snap-resolver
- 🔧 Source: https://github.com/ItsGoonBoyCrypto/INSdomains/tree/main/snap
- 🐛 Issues: https://github.com/ItsGoonBoyCrypto/INSdomains/issues
- 𝕏 Updates: https://x.com/IgraNameService
- 📨 Contact: GoonBoyCrypto@gmail.com
