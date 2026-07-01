# Platform Listings — Master Promo Tracker for Igra + INS

**Last audited:** 2026-05-30

Single source of truth for every aggregator / registry / list where Igra Network or INS appears, with status + action items. Use the "Already listed" section for the promo post.

---

## ✅ Already listed (use for the promo post)

### Igra Network (chain itself)

| Platform | Where | Notes |
|---|---|---|
| **chainlist.org** | https://chainlist.org/chain/38833 | Mainnet 38833 + Testnet 38836. Full entry: icon, RPC, native currency (iKAS), explorer link. Auto-feeds wallets' Add-Network UIs. |
| **ethereum-lists/chains** | https://github.com/ethereum-lists/chains/blob/master/_data/chains/eip155-38833.json | Canonical upstream. Submitted by Igra Labs pre-launch. |
| **DeFiLlama Chains** | https://defillama.com/chain/Igra | $1.95M TVL tracked. Chain page live with `gecko_id: igra`. |
| **CoinGecko** | gecko_id `igra` exists | (Confirm specifics — token IGRA may be tracked separately from the chain) |

### INS (the name service)

| Platform | Where | Notes |
|---|---|---|
| **npm registry** | https://www.npmjs.com/package/ins-snap-resolver | Published 2026-05-30. v0.1.0. MIT. |
| **MetaMask Snap Directory** | Submission filed 2026-05-30 at https://go.metamask.io/snaps-directory-request | Pending review (5-14 days). Watcher polls `MetaMask/snaps-registry` PRs 4×/day. |
| **insdomains.org/snap** | https://insdomains.org/snap | Our own install page with EIP-6963 wallet discovery. |
| **insdomains.org/snap-help** | https://insdomains.org/snap-help | 14-section knowledge base for users. |

### Live distribution channels

| Channel | Coverage |
|---|---|
| **MetaMask + INS Snap** | `.igra` direct resolution — LIVE in the official [MetaMask Snap Directory](https://snaps.metamask.io/snap/npm/ins-snap-resolver/), one-click install |
| **CCIP-Read via `*.insdomains.eth`** | Resolves in **Coinbase Wallet, Frame, Rainbow, Brave, Trust, Uniswap, others** — every ENS-aware wallet |

---

## 🟡 In progress

| Platform | Status | Action |
|---|---|---|
| **MetaMask Snap Directory listing** | ✅ LIVE (0.1.1, PR #1504 merged 2026-06-25) | — |
| **awesome-metamask-snaps PR** | 📝 Ready to file | Drop-in instructions: `docs/awesome-snaps-pr.md` |
| **Rabby native PR** | 📝 Ready to file | Drop-in: `docs/rabby-pr/` |

---

## ⏳ TODO — Easy submissions (worth filing this week)

| Platform | Type | Action |
|---|---|---|
| **`piotr-roslaniec/awesome-metamask-snaps`** (94⭐) | Awesome list | One-line PR. See `docs/awesome-snaps-pr.md`. ~5 min via web UI. |
| **DappRadar** | DApp registry | Submit `insdomains.org` as a dApp at https://dappradar.com/dapp-submission-form. ~10 min. |
| **State of the DApps** | DApp registry | Submit at https://www.stateofthedapps.com — older but still indexed. |
| **ChainBroker** | Chain analytics | Their site has a submit page. ~5 min. |
| **`@ensdomains/ensjs`** docs page | ENS official docs | Reach out to ENS DAO devs about adding INS to their "ENS-compatible name services" list if such exists. |
| **CoinMarketCap chain page** | Aggregator | Submit Igra chain entry at https://coinmarketcap.com/request — if a separate chain page isn't there yet. |

---

## 🔴 Selective / partnership-required (longer cycle)

| Platform | Notes |
|---|---|
| **L2Beat** | Selective — focused on Ethereum L2s with native bridge. Igra is a Kaspa L2, may not fit their criteria. Worth applying anyway via https://l2beat.com/contact. |
| **Etherscan-style explorers** | Igra has its own explorer; cross-listing on others requires partnership. |
| **ENS DAO grants / public goods** | Could apply for ENS DAO recognition as a CCIP-Read pioneer. https://ensdao.org |
| **Kaspa ecosystem hubs** | Already integrated where it counts (Kastle wallet). Consider docs.kaspa.org listing if not there. |

---

## 📣 Promo post draft (for X / TG / LinkedIn)

Use this once the awesome-snaps PR is merged and the Snap Directory approval lands:

```
🟣 INS distribution update — where you can find us:

✅ MetaMask — INS Snap LIVE in the official Snap Directory (npm:ins-snap-resolver)
✅ Rabby, Coinbase Wallet, Frame, Rainbow, Brave, Trust (via *.insdomains.eth CCIP-Read)
✅ chainlist.org (Igra Mainnet + Testnet)
✅ DeFiLlama ($1.95M TVL on Igra)
✅ CoinGecko
✅ npm (ins-snap-resolver, MIT)
✅ awesome-metamask-snaps directory

Type `alice.igra` in any wallet's send field → resolves natively.

Built on @IgraLabs L2. Native UX for Kaspa-ecosystem names.

📦 insdomains.org/snap
📚 insdomains.org/snap-help
🛠 github.com/ItsGoonBoyCrypto/INSdomains
```

Char count: ~340. Trim or thread the list. Strongest single line for X: the bullet stack of platforms.

---

## Update cadence

- Re-audit this file each time we land a new listing
- TG bot already monitors MetaMask Snap Directory PRs (4×/day)
- Manually re-check L2Beat / DappRadar quarterly
