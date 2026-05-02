# Outreach templates — wallet & explorer integrators

Copy-paste these into Telegram DMs / X DMs / email when reaching out to wallet teams (KasWare, Kastle, OKX, etc.) or explorer teams (Igra Labs, Kasplex, Blockscout BENS).

Pick the version that fits your channel — long for email, medium for TG DM, short for X DM.

---

## 📧 Long version — email / cold outreach (~250 words)

> **Subject:** Adding `.igra` name resolution to [Wallet Name] — 5-min integration
>
> Hey [name],
>
> I'm Liam, builder of **INS (Igra Name Service)** — the name service native to Igra L2. **V2 just shipped** with a dual tenure model: pick **Forever** (pay once, no renewals — the brand promise) or **Annual** (1-year renewable, 30-day grace period, cheaper entry). Every name is an ERC-721 NFT with on-chain SVG art and a native ENS-compatible namehash surface.
>
> Live state: 17+ names minted across V1 + V2, real sales settled, and organic registrations from Igra core devs (e.g. `emdin.igra`). The dApp is at [insdomains.org](https://insdomains.org), V2 Registry verified at `0x7E70…f4E9`.
>
> I built it specifically to make wallet integration trivial — there's a free public REST API at `https://insdomains.org/api/*` that **unions V1 + V2 reads transparently**, no flags. One `fetch()` resolves a name → address with the new `tenure` and `expires_at` fields surfaced for renewal-reminder UX. Same for reverse, owned-names list, and marketplace listings.
>
> **The two artefacts you probably want first:**
>
> - 📘 **Integration guide** — [docs/INTEGRATION.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md) (TS + Python snippets, V1 + V2 contract addresses, three integration paths in order of effort)
> - 🧪 **Test report** — [contracts/test/TEST_REPORT.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md) (273 Foundry tests across V1 + V2 + Marketplace + Subnames + Resolver, 0 fails, 1024-run fuzz soak across 15 fuzz tests, full coverage table)
>
> The repo is private right now (private just for security ergonomics during launch — happy to grant read access; just send me your GitHub handle). Every contract is explorer-verified on Igra mainnet and owned by the Igra Safe multisig.
>
> Happy to do a 15-min integration walk-through if helpful, debug specific calls against the live RPC, or open a PR into your repo.
>
> Cheers,
> Liam (@GoonBoyCrypto on Telegram, @IgraNameService on X)

---

## 💬 Medium version — Telegram DM (~150 words)

> Hey [name] 👋
>
> Liam here, builder of **INS (Igra Name Service)** — `.igra` names native to Igra L2. **V2 just shipped** with dual tenure: **Forever** (pay once) or **Annual** (1y renewable, 30-day grace). ENS-style, ERC-721, on-chain SVG art. Live at [insdomains.org](https://insdomains.org).
>
> Built specifically for wallet integration: there's a free public REST API at `insdomains.org/api/*` — one `fetch()` resolves a name → address with `tenure` + `expires_at` fields for Annual renewal-reminder UX. No SDK, no auth, no contract-call code on your side.
>
> Two links worth your time:
>
> 📘 **Integration guide** (TS + Python snippets, V1 + V2 contracts, 3 integration paths) — [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md)
>
> 🧪 **Test report** (273 Foundry tests across V1 + V2, 0 fails, 1024-run fuzz clean) — [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md)
>
> 17+ names minted incl. `igranetwork.igra` and `emdin.igra` (Igra dev). Repo is private during launch — happy to add you, just send your GitHub handle.
>
> Happy to walk through it whenever — DM here works, or quick call if you prefer.

---

## 📱 Short version — X DM / first-touch (~70 words)

> Hey, just shipped **INS V2** — `.igra` names on Igra L2 with dual tenure: Forever (pay once) or Annual (1y renewable, 30-day grace). ENS-compatible, on-chain SVG.
>
> Free public REST API for wallets: one `fetch()` resolves any name → address with `tenure` + `expires_at` fields. No SDK, no auth.
>
> Integration guide: [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md)
>
> Tests (273 across V1 + V2, 0 fails): [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md)
>
> Live at [insdomains.org](https://insdomains.org). Happy to walk through it any time 🟣

---

## 🧪 Smoke-test reply — for when they ask "is it really live?"

> Yep, fully live + reproducible:
>
> ```bash
> curl https://insdomains.org/api/stats
> curl 'https://insdomains.org/api/names/recent?limit=5'
> curl 'https://insdomains.org/api/resolve?name=igranetwork.igra'
> ```
>
> All return real JSON with on-chain data. No auth needed.
>
> Or watch the live mint feed (next mint shows up within ~30 seconds): [@insdomainsbot](https://t.me/insdomainsbot)

---

## 🔧 Customisation tips

- **Wallet teams**: lead with the wallet-specific value props — "show `.igra` instead of `0x…`", "users see their identity on connect"
- **Explorer teams**: lead with `/api/names/recent` (newly minted feed) and the reverse-resolution use case (replace addresses with names in tx history)
- **Bridge / DEX teams**: lead with the resolution use case in send-flows + on receipt addresses
- **Replace `[name]`** with the recipient's actual handle — it's a small thing but matters for response rate

---

## Targets to reach out to (suggested first wave)

In order of value × ease-of-reach:

1. **emdin** (Igra dev) — they already own `emdin.igra`. Highest signal. Ask if they'd like an integration walk-through.
2. **KasWare team** — Kaspa-native EVM wallet, already supports Igra L2.
3. **Kastle team** — Same.
4. **Igra Labs core** — already has repo access; ask if they'd feature INS on igralabs.com or in their docs.
5. **Kasplex / Igra explorer maintainers** — `/api/names/recent` is a 1-day add to a "newly minted" feed.
6. **Kaspa Telegram dev groups** — share the integration guide link, soft pitch.

---

## What "yes" looks like

When a wallet team says yes, the typical scope is:

- Add INS resolver to their address-input component (forward resolve)
- Add reverse-resolve to their address-display component (any place they show `0x…`)
- Optionally: "My INS names" panel via `/api/names/by-owner`

Total wallet-side work: a few hours for an experienced dev. We can offer to open a PR into their repo if they prefer that to building it themselves.

When an explorer says yes:

- "Newly minted .igra names" feed using `/api/names/recent`
- Reverse-resolve in tx history (replace seller/buyer addresses with `.igra` names where set)
- Marketplace activity feed using `/api/marketplace/listings`

---

## Contact (for the contact line in your DM/email)

- Telegram: [@GoonBoyCrypto](https://t.me/GoonBoyCrypto)
- Site: [insdomains.org](https://insdomains.org)
- Repo: [github.com/ItsGoonBoyCrypto/INSdomains](https://github.com/ItsGoonBoyCrypto/INSdomains)
- Live mint feed: [@insdomainsbot](https://t.me/insdomainsbot)
