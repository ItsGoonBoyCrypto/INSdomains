# INS — Igra Name Service

**Permanent `.ins` names on the Igra Network.** Pay once, own forever. No renewals.

Live at **[ins.klaudeonkas.xyz](https://ins.klaudeonkas.xyz)** · **[insdomains.org](https://insdomains.org)** (DNS-propagating) · [sslip fallback](https://ins.178-104-105-0.sslip.io)

Built with Next.js 15, React 19, Tailwind v3, wagmi 2 + RainbowKit, viem, Claude Haiku 4.5, Solidity 0.8.24 (Foundry).

## Highlights

- **Tiered pricing** in native iKAS — baked into the contract:
  | Length | Price      | Tag         |
  |--------|------------|-------------|
  | 1-char | reserved   | DAO auction |
  | 2-char | 5,000 iKAS | ultra-rare  |
  | 3-char | 500 iKAS   | rare        |
  | 4-char | 50 iKAS    | uncommon    |
  | 5–32   | 10 iKAS    | standard    |
- **On-chain SVG artwork** (Base64 data URI — no IPFS dependency)
- **Reserved names** for ecosystem partners (26-name seed list + admin batch-set)
- **Admin dashboard** (`/admin`) — wallet-gated via `NEXT_PUBLIC_ADMIN_WALLET`
  - Gift names (`adminMint` — bypasses payment + reservation)
  - Reserve / unreserve names
  - Tune length-tier prices and per-name premium overrides
  - Treasury withdraw + ownership transfer
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
- `/domains` — wallet dashboard (owned names, edit resolver target, activity)
- `/marketplace` — secondary-market listings
- `/admin` — wallet-gated registry console (all 6 admin cards wired via wagmi)
- `/docs` — developer docs + pricing explainer + Registry API table
- `/api/suggest` — POST `{seed}` → JSON `{names: string[]}`

## Contracts

Foundry project under `contracts/`.

```bash
cd contracts
forge test           # 55 tests, incl. 256-run fuzz
forge script script/Deploy.s.sol --rpc-url $IGRA_RPC --broadcast
```

See `contracts/README.md` for deploy steps + pricing / admin surface detail.

## Deploy the dApp

VPS pattern: port 3105 behind systemd (`ins-dapp.service`) + Caddy reverse proxy with auto-TLS.

```bash
# on VPS:
cd /home/ins-dapp && git pull && npm ci && npm run build
systemctl restart ins-dapp
```

Caddy block (in `/etc/caddy/Caddyfile`):

```caddyfile
insdomains.org, www.insdomains.org, ins.klaudeonkas.xyz, ins.178-104-105-0.sslip.io {
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

## License

MIT.
