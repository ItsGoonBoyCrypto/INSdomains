# Changelog

All notable changes to `ins-snap-resolver` are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — 2026-05-30

Initial public release. Published to npm at https://www.npmjs.com/package/ins-snap-resolver.

### Added
- `onNameLookup` handler that forwards `.igra` name queries to the public INS REST API at `https://insdomains.org/api/resolve` (forward resolution: name → address) and `/api/reverse` (reverse resolution: address → primary `.igra` name).
- 5-second `AbortController` timeout on every fetch so the Snap can never hang MetaMask's send-flow UI.
- Client-side filter (`looksLikeIgraName`) that short-circuits forward lookups for anything that doesn't end in `.igra`, keeping ENS / other-TLD lookups out of our path entirely.
- Public install page at https://insdomains.org/snap with EIP-6963 multi-wallet discovery routed at MetaMask.
- Full threat model in [`SECURITY.md`](./SECURITY.md).

### Permissions requested

| Permission | Why |
|---|---|
| `endowment:name-lookup` | The only mechanism by which MetaMask invokes this Snap |
| `endowment:network-access` | Hard-coded calls to `https://insdomains.org/api/*` |

No key management methods (`snap_getBip*`, `snap_manageAccounts`, etc.) are requested.

### Supported chains

- `eip155:1` (Ethereum Mainnet)
- `eip155:38833` (Igra L2)

### Build metadata

| | |
|---|---|
| Bundle size | 1.3 KB minified |
| Bundler | webpack via `@metamask/snaps-cli@^8.4.1` |
| SDK | `@metamask/snaps-sdk@^11.1.1` |
| Manifest version | `0.1` |
| Platform version | `11.1.1` |
| Shasum | `eR30Sd3707bsrGo7O99TXs/qdpreDwxy8BgmT54ShnE=` |

[0.1.0]: https://www.npmjs.com/package/ins-snap-resolver/v/0.1.0
