# Outreach templates — wallet & explorer integrators

Copy-paste these into Telegram DMs / X DMs / email when reaching out to wallet teams (KasWare, Kastle, OKX, etc.) or explorer teams (Igra Labs, Kasplex, Blockscout BENS).

Pick the version that fits your channel — long for email, medium for TG DM, short for X DM.

---

## 📧 Long version — email / cold outreach (~250 words)

> **Subject:** Adding `.igra` name resolution to [Wallet Name] — 5-min integration
>
> Hey [name],
>
> I'm Liam, builder of **INS (Igra Name Service)** — a permanent ENS-style name service native to Igra L2. Names are ERC-721 NFTs with on-chain SVG art, paid once in $Igra, and have no expiry or renewals.
>
> Since launch we've had **13 mints** on chain, **2 sales settled**, and organic registrations from Igra core devs (e.g. `emdin.igra`). It's live + verified at [insdomains.org](https://insdomains.org).
>
> I built it specifically to make wallet integration trivial — there's a free public REST API at `https://insdomains.org/api/*` so you don't need to write contract-call or event-scan code. One `fetch()` resolves a name → address. Same for reverse, owned-names list, and marketplace listings.
>
> **The two artefacts you probably want first:**
>
> - 📘 **Integration guide** — [docs/INTEGRATION.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md) (TS + Python snippets, contract addresses, three integration paths in order of effort)
> - 🧪 **Test report** — [contracts/test/TEST_REPORT.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md) (170 Foundry tests, 0 fails, 1024-run fuzz soak clean, full coverage table)
>
> The repo is private right now (private just for security ergonomics during launch — happy to grant read access; just send me your GitHub handle). All four contracts are explorer-verified on Igra mainnet and owned by an Igra Safe multisig.
>
> Happy to do a 15-min integration walk-through if helpful, debug specific calls against the live RPC, or open a PR into your repo.
>
> Cheers,
> Liam (@GoonBoyCrypto on Telegram)

---

## 💬 Medium version — Telegram DM (~150 words)

> Hey [name] 👋
>
> Liam here, builder of **INS (Igra Name Service)** — permanent `.igra` names on Igra L2 (ENS-style, ERC-721, on-chain SVG art, no renewals). Live at [insdomains.org](https://insdomains.org).
>
> Built it specifically for wallet integration: there's a free public REST API at `insdomains.org/api/*` — one `fetch()` resolves a name → address. No SDK, no auth, no contract-call code on your side.
>
> Two links worth your time:
>
> 📘 **Integration guide** (TS + Python snippets, 3 integration paths) — [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md)
>
> 🧪 **Test report** (170 Foundry tests, 0 fails, 1024-run fuzz clean) — [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md)
>
> 13 names already minted incl. `igranetwork.igra` and `emdin.igra` (Igra dev). Repo is private during launch — happy to add you, just send your GitHub handle.
>
> Happy to walk through it whenever — DM here works, or quick call if you prefer.

---

## 📱 Short version — X DM / first-touch (~70 words)

> Hey, just shipped **INS** — permanent `.igra` names on Igra L2. ENS-style, on-chain SVG, no renewals.
>
> Built a free public REST API for wallet integration: one `fetch()` resolves any name → address. No SDK, no auth.
>
> Integration guide: [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md)
>
> Test suite (170 tests, 0 fails): [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md)
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
