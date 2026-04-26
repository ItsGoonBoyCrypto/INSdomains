# INS — Igra Name Service

**Permanent `.igra` names on the Igra Network.** Pay once, own forever. **0 renewal fees, ever.**

Live at **[insdomains.org](https://insdomains.org)** · [sslip fallback](https://ins.178-104-105-0.sslip.io)

Built with Next.js 15, React 19, Tailwind v3, wagmi 2 + RainbowKit, viem, Claude Haiku 4.5, Solidity 0.8.24 (Foundry).

## Active contracts on Igra mainnet (chain 38833)

| | Address |
|---|---|
| **Registry (.igra)**        | `0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c` |
| **Marketplace (.igra)**     | `0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a` |
| **ReverseResolver (.igra)** | `0x1bbd46aec04330a90832faf1da91889dee67d931` |
| **Resolver (shared, namehash-keyed)** | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` |
| **Owner / Treasury**        | Safe `0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` |

### Legacy contracts (paused 2026-04-26)

Earlier this year we shipped sister TLDs `.ins` and `.ikas`. Their Registries + ReverseResolvers remain on chain forever (existing holders' NFTs are permanent, by design). Their Marketplaces are paused. The platform now focuses on `.igra` as the canonical Igra TLD. See `deployments/README.md` for legacy addresses.

## Highlights

- **Tiered pricing** in native iKAS — baked into the contract:
  | Length | Price      | Tag              |
  |--------|------------|------------------|
  | 1-char | 1,000 iKAS | ultra-premium    |
  | 2-char | 500 iKAS   | premium          |
  | 3-char | 250 iKAS   | rare             |
  | 4-char | 50 iKAS    | uncommon         |
  | 5–32   | 30 iKAS    | standard         |
- **On-chain SVG artwork** (Base64 data URI — no IPFS dependency)
- **Reserved names** for ecosystem partners (admin batch-set)
- **Reverse resolution** — opt-in `setPrimary(tokenId)` lets wallets + explorers render `foo.igra` for an address.
- **Zero-custody marketplace** — `setApprovalForAll` once, NFT stays in your wallet until the moment of sale; 2% seller fee + optional 1% featured promotion; buyer pays 0%.
- **Live activity feed** — `@insdomainsbot` in the [INS Telegram](https://t.me/IgraNameService) posts every mint, listing, and sale in real time.
- **Admin dashboard** (`/admin`) — wallet-gated via `NEXT_PUBLIC_ADMIN_WALLET`
  - Gift names (`adminMint` — bypasses payment + reservation)
  - Reserve / unreserve names
  - Tune length-tier prices and per-name premium overrides
  - Treasury withdraw + ownership transfer
  - Marketplace controls (fee bps, treasury, pause kill-switch)
- **Kaspa-native wallets first-class** — MetaMask, Rabby, **KasWare**, **Kastle**, WalletConnect (plus 9 more in "More")
- **AI name suggestions** (`/api/suggest`) via Claude Haiku 4.5

## Stack

- Next.js 15.1.4 · React 19 · TypeScript · Tailwind v3
- wagmi 2.14 · RainbowKit 2.2 · viem 2.22 (chain = Igra `38833`, native `iKAS`)
- Foundry · Solidity 0.8.24
- `@anthropic-ai/sdk` for server-side name ideation

## Local dev

```bash
npm i
cp .env.example .env.local
# set ANTHROPIC_API_KEY for /api/suggest,
# set NEXT_PUBLIC_ADMIN_WALLET to unlock /admin
npm run dev  # http://localhost:3000
```

## Routes

- `/` — hero + live availability search + tiered-pricing feature cards
- `/app` — search & register (tier-aware rarity pill + AI suggestions)
- `/domains` — wallet dashboard (owned names, edit resolver target, set primary, list for sale, per-name history)
- `/marketplace` — zero-custody browse + buy, featured + regular sections, 2% seller fee
- `/admin` — wallet-gated registry + marketplace console (7 cards, wagmi-wired)
- `/about` — mission, tiered pricing explainer, stack, contract registry, roadmap
- `/api/suggest` — POST `{seed}` → JSON `{names: string[]}`
- `/api/reserved-labels` — walks on-chain `Reserved` events to return the full admin-set labels

## Contracts

Foundry project under `contracts/`. Four contracts:

1. **`INSRegistry.sol`** — ERC-721, native-iKAS payment, tiered pricing, reserved names, on-chain SVG tokenURI.
2. **`INSResolver.sol`** — namehash-keyed ENS-compatible `addr(bytes32)` + `text(bytes32, string)`.
3. **`INSReverseResolver.sol`** — opt-in `setPrimary(tokenId)` + stale-safe `primaryName(address)`.
4. **`INSMarketplace.sol`** — zero-custody listings, 2% seller fee + 1% featured upfront, pause kill-switch, fee-cap 500 bps, nonReentrant-guarded.

```bash
cd contracts
forge test                    # 110 tests across 3 suites, 3 fuzz × 256 runs, 0 failures
forge script script/Deploy.s.sol           --rpc-url $IGRA_RPC --broadcast   # Registry + Resolver
forge script script/DeployReverseResolver.s.sol --rpc-url $IGRA_RPC --broadcast
forge script script/DeployMarketplace.s.sol     --rpc-url $IGRA_RPC --broadcast
```

See `contracts/README.md` for the per-contract surface + deploy order.

## Deploy the dApp

VPS pattern: port 3105 behind systemd (`ins-dapp.service`) + Caddy reverse proxy with auto-TLS.

```bash
# on VPS:
cd /home/ins-dapp && git pull && npm ci && npm run build
systemctl restart ins-dapp
```

Caddy block (in `/etc/caddy/Caddyfile`):

```caddyfile
insdomains.org, www.insdomains.org, ins.178-104-105-0.sslip.io {
    reverse_proxy 127.0.0.1:3105
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

## Env vars

See `.env.example`. `NEXT_PUBLIC_*` are baked in at build time — always rebuild after an env change.

## Public resolver API

Open, CORS-enabled HTTP endpoints for resolving names without reading contracts yourself. Full guide in [`docs/API.md`](./docs/API.md).

```bash
curl https://insdomains.org/api/resolve?name=alice.igra
curl https://insdomains.org/api/reverse?address=0xF9d065b70C9357098dc7854D7A28B1498f6d125c
```

Returns JSON with the resolved address / primary name. Integrators needing name resolution in wallets, explorers, or dApps can wire it up with a single `fetch()` — no on-chain-read plumbing required.

## Security & review

Internal audit passes ahead of mainnet:

- **INSRegistry** — 55 Foundry tests (incl. fuzz), standalone deploy verified on-chain 2026-04-23.
- **INSReverseResolver** — 12 Foundry tests, deployed 2026-04-23, stale-safe reads.
- **INSMarketplace** — 43 Foundry tests (3 fuzz × 256 runs) covering happy + sad paths on every external, plus:
  - `nonReentrant` guard on `createListing` + `buyListing` (defence-in-depth vs. a future Registry with receiver hooks)
  - Seller-revokes-approval after listing → fill reverts cleanly
  - Buyer is a contract without `onERC721Received` → fill reverts (+ test for the receiver happy path)
  - `cancelListing` must stay available while paused (tested)
  - Nested-reentry attack via `onERC721Received` → guard fires (tested)
  - Revert-path featured-fee rollback → refund guaranteed by EVM, locked in by test
  - Fee math fuzzed across bps + price ranges
- **Admin blast radius** is capped: fee bps hard-ceiling 500 (5%), zero-custody (no user funds ever held), pausing doesn't trap seller positions.
- All three core addresses are (or will be) owned by the [Igra Safe](https://safe.igralabs.com/), so every admin action requires multisig consent.

## License

MIT.
