# INS Submission Packet — Every Form Pre-Filled

**One document, every registry, copy-paste ready.** Each section has the URL, the action type (PR / form / DM), exact text to paste, and estimated time.

**Strategic order:** GitHub PRs first (highest signal-to-noise, public artifacts), then forms (need accounts), then DMs (relationship-building).

---

## 1️⃣ `Kasbah-commons/awesome-kaspa` — PR (5 min web UI)

**Why:** The canonical Kaspa awesome list. Has Igra Network entry already; INS would slot in next to KNS in the KRC-20 & NFT section.

**Steps:**

1. Go to https://github.com/Kasbah-commons/awesome-kaspa/blob/main/README.md
2. Click pencil ✏️ top-right → GitHub auto-forks
3. Use `Ctrl+F` → search `[KNS]` to find the existing KNS entry
4. Add this row **directly below** the KNS row (still in "### KRC-20 & NFT Marketplaces" section):

```markdown
| [INS — Igra Name Service](https://insdomains.org) | Native `.igra` name service on Igra L2 with MetaMask Snap + CCIP-Read across 8+ wallets | Forward + reverse resolution, MetaMask Snap (`npm:ins-snap-resolver`), `.insdomains.eth` CCIP-Read wildcard, REST API, V1+V2 registries, 150+ names | [MIT](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/LICENSE) | [X](https://x.com/IgraNameService)<br>[Telegram](https://t.me/IgraNameService) |
```

5. Commit message: `Add INS (Igra Name Service) to KRC-20 & NFT Marketplaces`
6. Description:
   ```
   Adds Igra Name Service — the canonical name service for Igra Network.
   - 150+ .igra names registered on V2 mainnet
   - MetaMask Snap live on npm (Directory submission filed)
   - CCIP-Read wildcard at *.insdomains.eth works in Rabby/MM/Uniswap/Coinbase Wallet/Frame/Brave/Trust/Rainbow
   - Public REST API at insdomains.org/api
   - MIT-licensed open source
   ```
7. Create PR, paste same description as PR body.

**Done.** Maintainer typically merges within 1-2 weeks.

---

## 2️⃣ `piotr-roslaniec/awesome-metamask-snaps` — PR (5 min web UI)

See dedicated doc: `docs/awesome-snaps-pr.md`. Already prepared with the exact line + step-by-step.

---

## 3️⃣ Rabby — PR (~30 min web UI)

See `docs/rabby-pr/`. Drop-in files + PR description + X DM template ready.

---

## 4️⃣ KaspaHub — Discord / email outreach (10 min)

**Why:** kaspahub.org has an ecosystem page. They accept submissions via Discord, GitHub issue, or email — not a self-serve PR.

**Path A — Discord** (fastest, gets you Kaspa community visibility):

Join https://discord.gg/7umFvjcANE → introduce in `#projects` or `#general` channel. Paste:

```
👋 Hey Kaspa Hub team — we just shipped INS (Igra Name Service), the 
canonical name service for Igra Network L2.

Would love to be added to the Kaspa Hub ecosystem page under Utilities 
or as a new "Names & Identity" category. Quick facts:

🌐 Website:   https://insdomains.org
📦 MetaMask Snap: https://snaps.metamask.io/snap/npm/ins-snap-resolver/  (LIVE in the Directory)
🛠 Source:    https://github.com/ItsGoonBoyCrypto/INSdomains  (MIT)
📚 Docs:      https://insdomains.org/snap-help
🐦 X:         https://x.com/IgraNameService
💬 TG:        https://t.me/IgraNameService

150+ names registered, REST API live, plus CCIP-Read in 8+ ENS-aware 
wallets via *.insdomains.eth wildcard.

Happy to drop more details or open a PR if you have a repo structure 
for ecosystem contributions. Cheers!

— @GoonBoyCrypto
```

**Path B — Email** (more formal, paper trail):

To: `mail@kaspahub.org`
Subject: `Ecosystem listing request — INS (Igra Name Service)`
Body: (paste the Discord message above)

---

## 5️⃣ DappRadar — Submission form (10 min, requires account)

**URL:** https://dappradar.com/dapp-submission-form (requires login — create free account if you don't have one)

**Pre-filled fields:**

| Field | Value |
|---|---|
| Name | `INS — Igra Name Service` |
| URL | `https://insdomains.org` |
| Smart contract address | `0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A` (V2 Registry on Igra) |
| Chain | `Igra Network` (chain 38833 — they may not have it pre-populated; if not, select "Other" + note Igra L2) |
| Category | Primary: `Other` or `Utilities` — Secondary: `Identity` |
| Logo | https://insdomains.org/snap-icon.svg (or use the 4K launch image) |
| Cover/banner | https://insdomains.org/api/snap-launch-image?size=4k |
| Short description | `Permanent .igra names on Igra L2 with native MetaMask resolution.` |
| Full description | (see below) |
| GitHub | `https://github.com/ItsGoonBoyCrypto/INSdomains` |
| Twitter | `https://x.com/IgraNameService` |
| Telegram | `https://t.me/IgraNameService` |
| Docs | `https://insdomains.org/snap-help` |
| Contact email | `GoonBoyCrypto@gmail.com` |

**Full description** (copy-paste):

```
INS (Igra Name Service) is the canonical name service for Igra Network, 
an EVM-equivalent L2 (chain ID 38833) built on the Kaspa BlockDAG. Users 
register permanent on-chain .igra names that resolve to wallet addresses 
across multiple wallets.

Two distribution channels: (1) MetaMask Snap published to npm as 
ins-snap-resolver and LIVE in the official MetaMask Snap Directory,
enabling one-click install and native .igra resolution in regular MetaMask.
(2) CCIP-Read wildcard resolver at insdomains.eth, which makes 
*.insdomains.eth subdomain resolution work in every ENS-aware wallet 
including Rabby, Coinbase Wallet, Frame, Rainbow, Brave, Trust, Uniswap 
interface — no snap install required.

150+ names registered to date. 1-char names cost 4000 iKAS (Ultra-Premium), 
2-char 2000 iKAS, 3-char 1200 iKAS, scaling down. MIT-licensed open 
source. Smart contracts deployed + verified on Igra mainnet. Treasury 
held in Safe multisig. 356 Foundry tests across 12 suites.
```

---

## 6️⃣ Dapp.com — Submission form (10 min)

**URL:** https://www.dapp.com/dapp_submit

Uses the same content as DappRadar above. Submit identical info.

---

## 7️⃣ Alchemy Dapp Store — Submission (10 min)

**URL:** https://www.alchemy.com/dapps — scroll to find "Submit your dApp" link, OR DM @AlchemyPlatform on X.

Same content packet as DappRadar. Alchemy is more curated — they tend to feature dApps with significant traction or grant alignment. INS qualifies as both an INFRASTRUCTURE primitive (name service) and a USER-facing app.

---

## 8️⃣ Bonus — Tier 2 listings (when you have a quiet hour)

These are smaller-reach but easy wins:

| Platform | URL | Type |
|---|---|---|
| **DappReview** | https://dapp.review/submit | Form |
| **DefiPrime** | https://www.defiprime.com/submit | Form (DeFi-focused — may not fit name service) |
| **Web3Index** | https://web3index.org | Open-source, accepts PRs |
| **awesome-web3** (`b3rwn/awesome-web3`) | https://github.com/b3rwn/awesome-web3 | GitHub PR — add INS under Identity or Naming |
| **awesome-ens** (search github for active forks) | varies | GitHub PR |

---

## 📊 Suggested execution order (highest leverage first)

| # | Task | Time | Where |
|---|---|---|---|
| 1 | awesome-kaspa PR | 5 min | Kasbah-commons GitHub |
| 2 | awesome-metamask-snaps PR | 5 min | piotr-roslaniec GitHub |
| 3 | KaspaHub Discord intro | 5 min | discord.gg/7umFvjcANE |
| 4 | DappRadar form | 10 min | dappradar.com |
| 5 | Rabby PR | 30 min | RabbyHub GitHub |
| 6 | Kasware + Kasperia DMs | 10 min | X / TG |
| 7 | Dapp.com + Alchemy | 20 min | their forms |

**Total: ~85 minutes to land everything.** Can split across 2-3 sittings over the week.

---

## 🎬 After everything is filed — the promo post

Wait until at least 3 of these confirm (you'll see merged PRs / replies in your inbox) before posting. Then use the template in `docs/PLATFORM_LISTINGS.md` (bottom of file) — it'll list the most recently-confirmed channels, giving the post maximum credibility.

If MetaMask Snap Directory PR lands in the same week, combine the two into a single "INS is everywhere" anniversary tweet that absolutely dominates timeline.
