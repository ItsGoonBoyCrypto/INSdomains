# Contributing to INS

Thanks for caring about INS! This repo contains:

- The **dApp** (Next.js 15, App Router) — `app/`, `components/`, `lib/`
- The **smart contracts** (Foundry / Solidity) — `contracts/`
- The **MetaMask Snap** — `snap/`
- **Docs** — `docs/`

## Quick setup

```bash
git clone https://github.com/ItsGoonBoyCrypto/INSdomains
cd INSdomains
npm install                    # dApp
cd snap && npm install && cd .. # snap
cd contracts && forge install   # contracts
```

Node 20+ required.

## Running

```bash
# dApp dev server (http://localhost:3000)
npm run dev

# Contract tests (170+ Foundry tests, ~3s)
cd contracts && forge test

# Snap local dev server (http://localhost:8080)
cd snap && npm run serve
```

## Project conventions

- **TypeScript everywhere** in dApp + snap code. No JS files in `app/` or `components/`.
- **Tailwind** for styling. No inline `<style>` in React components.
- **Server components by default** — `"use client"` only where you actually need state / browser APIs.
- **No `console.log` in committed code** — use the structured logger in `lib/log.ts` if you genuinely need diagnostics.
- **Tests for new validation / pricing / fee logic** — see `lib/parity.test.ts` for how we mirror contract logic in TS.
- **Conventional commit messages.** Prefer `feat:`, `fix:`, `chore:`, `docs:` prefixes.

## Submitting a change

1. Open an issue first if you're proposing a non-trivial feature — saves you wasted work if the direction doesn't fit.
2. Fork → branch → commit → PR against `main`.
3. CI must be green. The snap CI workflow (`.github/workflows/snap-ci.yml`) verifies the snap bundle builds reproducibly and the manifest shasum matches.
4. For contract changes: add Foundry tests covering both happy + sad paths. We expect ≥95% line coverage in `src/`.
5. For Snap changes: bump `version` in **both** `snap/package.json` and `snap/snap.manifest.json` (they MUST match), rerun `npm run build` so the manifest shasum updates, and append a Changelog entry in `snap/CHANGELOG.md`.

## Releasing a new Snap version

1. Bump `version` in `snap/package.json` and `snap/snap.manifest.json` to the same value.
2. From `snap/`: `npm run build` — this regenerates `dist/snap.js` and writes the new shasum into `snap.manifest.json`.
3. Commit (`feat(snap): release vX.Y.Z`) → PR → merge.
4. `cd snap && npm publish --access public`.
5. Submit a [directory update request](https://go.metamask.io/snaps-directory-update-request) so the new version reaches regular MetaMask users.

> **Windows build quirk:** `@metamask/snaps-cli@^8` has a path-encoding bug that ENOENTs the SES eval-worker if the project path contains spaces (e.g. `C:\Users\Liam\Claude Code\…`). Build in a space-free temp directory and copy `dist/snap.js` + `snap.manifest.json` back. The repo's main CI runs on Ubuntu so this isn't a CI issue, only local Windows.

## Reporting bugs

Open an issue using the templates at https://github.com/ItsGoonBoyCrypto/INSdomains/issues/new/choose. For **security** issues, please use a private advisory (https://github.com/ItsGoonBoyCrypto/INSdomains/security/advisories/new) rather than a public issue — see [snap/SECURITY.md](./snap/SECURITY.md).

## Code of conduct

Be kind, technical, and direct. Disagree on substance, not people. We follow the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/) — bad-faith / abusive behavior gets you banned without a second warning.

## License

By contributing you agree your contributions are MIT-licensed under [LICENSE](./LICENSE).
