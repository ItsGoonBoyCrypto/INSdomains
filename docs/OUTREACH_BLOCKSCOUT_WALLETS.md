# Wallet outreach DMs — post-Blockscout integration

> **Context:** Pavel's Igra Blockscout fork now displays `.igra` names natively (live on staging, mainnet imminent). That gives wallet teams TWO integration paths — the lazy one (read Blockscout's `ens_domain_name` field) or the direct one (read INS contracts). These DMs are written to make BOTH paths trivial.
>
> Tone: founder-to-founder, personal, no hard sell. Lead with the news.
> Length: ~120-160 words per DM. Short enough to actually read on mobile.

---

## 🧠 Kasware — `[name]`

> Hey [name] 👋
>
> Big news for the Kaspa/Igra side: **the Igra Blockscout explorer now natively displays `.igra` names** alongside addresses — live on staging, mainnet imminent. So `0x7447…7aA1` now reads as `insdomains.igra` everywhere Pavel's explorer renders an address (tx lists, holder tables, internal txs).
>
> Easiest path for **Kasware** to show `.igra` names in-wallet: pull from Blockscout's API — addresses now come back with an `ens_domain_name` field populated by INS. Zero contract-call code on your side. Demo: try `/api/v2/addresses/0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1` once mainnet's pushed.
>
> If you'd rather read direct from chain (more sovereign, no Blockscout dependency), it's 2 contracts on Igra L2 — pasted below ⬇️. Either way, ~3-hour integration.
>
> Reciprocal: I'll feature Kasware on the insdomains.org Integrations row + amplify on the @IgraNameService launch posts. Want to be the first wallet to ship `.igra` display?
>
> Happy to walk through it — 15-min call or DM, whichever's easier.
>
> 🟣 Liam

---

## 🛡️ Kastle — `[name]`

> Hey [name] 👋
>
> Quick heads-up — **the Igra Blockscout explorer now displays `.igra` names natively** (live on staging this week, mainnet shortly after). Every address shows its `.igra` reverse-resolution where the holder has set one. So `0x7447…7aA1` reads as `insdomains.igra` across the explorer.
>
> Two paths for **Kastle** to surface names in-wallet:
>
> 1. **Lazy path** — pull from Blockscout. The address API now returns `ens_domain_name` populated by INS. No contract-call code, no SDK, ~30-min wiring.
> 2. **Sovereign path** — read direct from chain. 2 contracts on Igra L2, 2 function signatures (pasted below ⬇️). ~3-hour integration. Doesn't depend on Blockscout being up.
>
> Reciprocal: featured on insdomains.org Integrations + a shout-out on the @IgraNameService launch. Kastle being first to ship `.igra` rendering would be a great Kaspa-ecosystem first.
>
> Repo's private during launch but I'll add your GH handle. Happy to walk it through whenever — DM here works.
>
> 🟣 Liam ([insdomains.org](https://insdomains.org))

---

## ⚡ Kasperia — `[name]`

> Hey [name] 👋
>
> Quick INS update worth a minute of your time — **Pavel just shipped `.igra` name resolution into the Igra Blockscout explorer**. Live on staging, mainnet about to follow. Every Igra-L2 address that has a primary `.igra` set now displays its name across the explorer (tx lists, holder pages, internal txs).
>
> Means **Kasperia** can show `.igra` names in two ways:
>
> 1. **Easy:** pull from Blockscout's address API — `ens_domain_name` is now populated by INS. No contract-call code, no SDK. ~30-min wiring.
> 2. **Direct:** read from the 2 INS V2 contracts on Igra L2. Function sigs + addresses below ⬇️. ~3-hour integration, no Blockscout dependency.
>
> Reciprocal: I'll add Kasperia to the insdomains.org Integrations row + name-check you in the launch tweets. Being early on `.igra` rendering = great differentiation as the namespace fills up.
>
> Happy to jump on a call or just DM-debug. Repo access on request.
>
> 🟣 Liam

---

## 📎 The "XYZ" — contract details to paste at the bottom of any DM

> **If you want to read direct from chain (skip the Blockscout dependency):**
>
> Chain: Igra L2 (38833) · RPC: `https://rpc.igralabs.com:8545`
>
> **Reverse — address → name (for displaying `.igra` next to any address in your UI):**
> - Contract: `INSReverseResolver V2` at `0xef449f577255ee1d6df37d982da086a7e22a6853`
> - Call: `primaryName(address user) returns (string)`
> - Returns `""` if no primary set or the holder no longer owns the token (stale-safe, no extra liveness check needed).
>
> **Forward — name → address (for the address-input box where users type `alice.igra`):**
> - Contract: `INSRegistryIgraV2` at `0x7E7018959bf44045F01D176D8db1594894CBf4E9`
> - Call: `resolve(string label) returns (address)` — strip `.igra` from the input first
>
> Full TS + Python snippets: [github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md](https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md)
>
> Or use the free REST API (zero contract code): `https://insdomains.org/api/reverse?address=0x…` returns `{primary, primary_version, primaries}` unioning V1 + V2.

---

## 🎯 DM strategy notes

**Where to send each:**
- **Kasware** — Telegram is best (their team is active there). X DM as backup.
- **Kastle** — Twitter/X DM works well, they're active there.
- **Kasperia** — Telegram if you have it; otherwise X DM. They're newer so a slightly warmer intro helps.

**Tweaks per recipient before sending:**
- **`[name]`** → their actual first name or handle. Personal touch matters.
- **If you have a prior interaction** (e.g. you've already chatted in a TG group, Kasware retweeted you, etc.) — add a one-liner referencing it at the top.
- **If they're already an INS holder** — name-check their name (e.g. "since you're already a `kasware.igra` holder you'll see your own name show up everywhere").

**Reply triage:**
- **"Sounds good, send me the docs"** → reply with the INTEGRATION.md link + add their GH handle to the private repo
- **"Can we get on a call?"** → use Telegram voice or Google Meet, 15-30 min walk-through with screen share
- **"Will you open a PR?"** → yes; ask for their repo, fork it, build the integration following their existing patterns

**Don't forget:**
- Once any wallet ships, add their logo to `lib/integrations.ts` so it auto-renders on the homepage Integrations row + the /about Partners section
- Tweet a quick "X just shipped `.igra` support" from @IgraNameService — reciprocity earned
- Update `docs/IGRA_UPDATE_*.md` so the next Pavel meeting has the wallet-adoption win baked in

---

## ⏳ Timing

Send these the moment Pavel pushes staging → mainnet (probably this week). Until then, the DMs reference staging — slightly weaker hook than "live on mainnet". So:

- **If Pavel ships mainnet today/tomorrow:** send the DMs as drafted above (mention staging → mainnet imminent)
- **If Pavel ships mainnet later this week:** wait for the cutover, then send "live on mainnet now" version. The single-word change ("staging → mainnet") in the hook line makes the DM ~3x stronger.

I can pre-draft the "live on mainnet" variants if you want me to keep this fully ready-to-fire when Pavel pushes.
