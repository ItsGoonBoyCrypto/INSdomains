# EVM Wallet Outreach List — Igra L2 + INS

**Goal:** distribution-maximize. Get Igra Network (chain ID 38833) on every EVM wallet's chain list, then native `.igra` name resolution on top.

**Status legend:**
- ✅ Done
- 🟢 Easy win (custom RPC + chainlist.org submission)
- 🟡 Medium (PR or formal partnership ask)
- 🔴 Hard (closed source, gatekept)
- 📨 Filed (awaiting response)

---

## Tier 1: Kaspa-native wallets (highest fit, lowest friction)

These are the most natural targets — Kaspa community already trusts them, they have direct incentive to add Igra L2 support.

| Wallet | Type | INS Status | Igra L2 Status | Action |
|---|---|---|---|---|
| **Kastle** | Chrome ext | ✅ **INTEGRATED** (per project memory) | ✅ via Igra explorer | Maintain relationship. DM about INS Snap launch — they can add a one-click promo for it. |
| **Kasware** | Chrome ext | 🟢 Custom RPC | 🟢 Custom RPC | DM @KaswareWallet on X with INS API + Igra chain config. They've already shown willingness. |
| **Kasperia** | Mobile | 🟢 Custom RPC | 🟢 Custom RPC | Lower priority (mobile users smaller subset). DM their team via TG. |
| **KSPR Bot** | TG bot wallet | N/A bot | 🟡 server-side RPC | Talk to KSPR team about adding `.igra` resolution to send-by-name. |

**Action this week:** DM all 4 with the launch tweet + INS API docs + offer to send Igra chain JSON for one-click add.

---

## Tier 2: Mainstream EVM wallets — open-source PR path

These accept community PRs. Best leverage = file a PR ourselves. Same difficulty as the Rabby PR (~4 files, ~80 lines).

| Wallet | Stack | Approach |
|---|---|---|
| **Frame** (`floating/frame`) | ethers v5 | Open issue: enable CCIP-Read (probably already works). Test first. |
| **Rainbow** (`rainbow-me/rainbow`) | ethers v5 | Same as Frame — likely already works. Test first. |
| **Trust Wallet** | Mostly closed, some open repos (e.g. `trustwallet/assets`) | DM on X/Twitter. Has @TrustWallet support handle. |
| **Uniswap Interface** (`Uniswap/interface`) | wagmi/viem | Open issue if CCIP-Read isn't enabled in their wagmi config. 1-line fix. |
| **Aave Wallet UI** | wagmi/viem | Same as Uniswap |
| **1inch Wallet** | Closed | DM @1inch on X |
| **Phantom (EVM)** | Closed | DM @phantom team — they're aggressively adding chains, low resistance |

**Action this week:**
1. Quick CCIP test on Frame + Rainbow (paste `igranetwork.insdomains.eth` in send field). If they work → no action needed, just document.
2. File Rabby PR (see `docs/rabby-pr/`).
3. Open issues on Uniswap + Aave wallet UI repos asking them to enable `ccipRead: true` in their wagmi setup.

---

## Tier 3: Chain-list integrations (gets Igra L2 in dozens of wallets at once)

These are aggregator pipelines — getting Igra into them auto-adds it to dozens of wallets.

| Service | Reach | Action |
|---|---|---|
| **chainlist.org** | Used by every wallet's "Add Network" flow | Submit PR adding Igra L2 to `eth-chains-org/chains`. ~30 min effort. |
| **chainid.network** | Canonical chain registry | Same as chainlist (same upstream repo). |
| **Particle Network** | Multi-chain wallet SDK | Email partnerships@particle.network |
| **DappRadar Chain List** | Drives discovery | Submit at dappradar.com |
| **DeBank** | Portfolio tracker + Rabby parent | DM @DebankDeFi — Rabby integration + Debank chain list. |

**Action this week:** Submit Igra to `ethereum-lists/chains` GitHub repo (the canonical upstream that chainlist.org reads from). One PR adds Igra to every wallet that uses the "Search Network" feature.

---

## Tier 4: Hardware wallet companions

| Wallet | Notes |
|---|---|
| **Ledger Live** | Already supports custom chains via WalletConnect. Test with Ledger + MetaMask first. |
| **Trezor Suite** | Same — works via MetaMask connection. |
| **GridPlus Lattice** | Per Rabby's docs they support GridPlus — same path. |
| **Safe (Gnosis)** | ✅ Already deployed our Treasury on Safe Igra. Good test case. |

**Action:** Document a "Use INS Snap with [hardware wallet]" guide in `/snap-help`. Hardware wallet users care about this more than retail.

---

## Tier 5: Snap-compatible wallets (post-MetaMask Directory approval)

Currently only MetaMask runs Snaps. But the architecture is being studied by:
- **OKX Wallet** — has plugin system (closed)
- **Sub Wallet** (Polkadot ecosystem) — exploring Snaps
- **Frame** — discussion in their GitHub about Snaps-like extensions

Once MetaMask approves our Snap, document the "we're snap-native" story for future cross-wallet expansion.

---

## Prioritized 30-day action plan

| Week | Action | Effort | Impact |
|---|---|---|---|
| **Week 1** | Submit Igra to `ethereum-lists/chains` (chainlist.org upstream) | 30 min | 🔥🔥🔥 — dozens of wallets auto-pick up |
| **Week 1** | DM Kasware + Kasperia about INS integration | 15 min | 🔥🔥 — Kaspa community alignment |
| **Week 1** | File Rabby PR + DM (docs/rabby-pr/) | 0 (done) → submit | 🔥 — direct one-wallet win |
| **Week 1** | Manual test Frame + Rainbow + Uniswap with `.insdomains.eth` | 15 min | 🔥 — verify existing CCIP coverage |
| **Week 2** | DM @MetaMask team thanking for snap directory review (if PR not yet merged) | 5 min | 🔥 — relationship building |
| **Week 2** | DM @phantom + @TrustWallet about native `.igra` integration | 20 min | 🔥🔥 — high-reach mobile wallets |
| **Week 3** | If Snap approved → blast launch announcement, DM Brave Wallet + 1inch about ecosystem integration | 1 hr | 🔥🔥 — leverage MM credibility |
| **Week 4** | Hardware wallet docs (Ledger + Trezor walkthrough) | 1 hr | 🔥 — power-user audience |

---

## Why this works

By the end of 30 days you'll have:

1. **chainlist.org listing** → every wallet's "Add Network" search finds Igra → free distribution
2. **MetaMask** → INS Snap one-click install (post-directory approval)
3. **Rabby** → direct `.igra` resolution via our PR
4. **CCIP-Read in 8+ ENS-aware wallets** → `.insdomains.eth` works everywhere ENS does
5. **Kaspa-native wallets** → first-class INS support as a Kaspa-ecosystem citizen

Three independent distribution channels (snap / CCIP / native PRs) means no single wallet's decisions can block adoption. That's the durable position.
