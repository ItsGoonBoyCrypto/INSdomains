# INS — 48-hour update for Igra (2026-05-01 → 2026-05-03)

Hey Pavel — quick rundown of what's shipped on **insdomains.org** in the
last 48 hours, plus one ask.

---

## 1. INS V2 is live on Igra mainnet 🟣

Full V2 contract suite deployed yesterday (2026-05-02), all source-verified
on the Igra Blockscout explorer. Same Treasury Safe (`0x7447…7aA1`) owns
every contract.

| Contract                  | Address                                      |
|---------------------------|----------------------------------------------|
| INSRegistryIgraV2         | `0x7E7018959bf44045F01D176D8db1594894CBf4E9` |
| INSMarketplace V2         | `0xd641dadd503d8beba2395cd72367cf4edaf4674f` |
| INSReverseResolver V2     | `0xef449f577255ee1d6df37d982da086a7e22a6853` |
| INSSubnameExtension V2    | `0x7E103668E40aeA3d3698f8D72cD6A8847FcCf280` |

**What's new in V2:**
- **Dual tenure:** users pick Forever (pay once) OR Annual (1y renewable, 30-day grace). Forever 4000/2000/1200/800/500 iKAS by length; Annual 1000/800/500/250/50 iKAS/year by length.
- **V1 → V2 free migration:** existing .igra V1 holders can claim their V2 Forever NFT for gas only via `claimV1Forever(v1TokenId, target)`. V1 NFTs stay valid forever.
- **Subnames** (e.g. `pay.alice.igra`): contract deployed, off until v1.1 activation (~3-4 weeks post-launch). Single Safe `setEnabled(true)` to flip on.
- **107 ecosystem labels reserved** on both V1 + V2 Registries — covers Kaspa/Igra projects, brands, and notable community handles. Reserved names can be DM-claimed free by their rightful owner via the ClaimReservedModal.

**Tests:** 314 / 314 across 10 contracts (4× 256-run fuzz on critical surfaces).

**dApp:** Every V2 NFT operation works first-class — register, resolve, set primary, list for sale, renew, extend-to-Forever, claim-V1-Forever. `/domains` unions V1+V2. `/api/*` REST endpoints union V1+V2 with `registry_version` / `tenure` / `expires_at` fields. Activity bot `@insdomainsbot` watches V2 events in `@IgraNameService` TG group.

---

## 2. Igra DAO revenue split — ready, waiting on multisig address 🤝

Built today: a `TreasurySplitter` contract that sits between the Registry/Marketplace and the recipients, so a configurable % of every withdrawal routes to the Igra DAO automatically.

- **Planned default: 20% to Igra DAO / 80% to INS Treasury Safe.**
- Treasury Safe owns the splitter; split % + recipients are tunable via Safe txs (no redeploy needed).
- `flush()` is permissionless (no funds at rest) and atomically sends both shares.
- Hardened against the typical multisig footguns: **OpenZeppelin Ownable2Step** so a typo'd Safe address can't brick admin, and treasury is paid first so a malicious DAO `receive()` can't gas-grief and starve treasury's share.
- Independently audited (no Critical / High findings); 41 tests + 4 fuzz suites passing.

**Ask:** can you send me the Igra DAO multisig address (or whichever wallet you want INS revenue routed to)? Once I have that, deployment is 1 forge command + 1 env var on the VPS — no downtime. Spec + runbook: `docs/TREASURY_SPLITTER.md` in the repo.

If the DAO doesn't have a multisig yet, no rush — happy to deploy with `dao=0x0` and `bps=0` first as a no-op passthrough so the wiring is in place, then 2 Safe txs (`setDao` + `setSplit(2000)`) flip it on later.

---

## 3. Marketing pack ready for the public push

- 2 polished MP4s (vertical 1080×1920 + horizontal 1920×1080)
- 5 static images (4K promo card, OG card, 3 V2 NFT cards pulled live from `/api/nft-image`)
- 3-tweet copy bank for T-3 / T-1 / launch (`docs/LAUNCH_TWEETS.md`)
- Posting calendar T-3 → Launch+1d
- All assets tag `@IgraNetwork` (not @IgraLabs) for ecosystem reach

---

## 4. Cleanup + polish

- `.ins` / `.ikas` UI references purged across admin + /domains + homepage marquee — platform now visually .igra-only across the board (legacy contracts stay deployed forever, just paused for new mints)
- Admin page dropped ~700 lines of dead multi-TLD scaffolding (lighter, faster, less confusing for ops)
- `/about` has a "Want to partner? DM `@IgraNameService`" CTA
- `/faq` refreshed end-to-end for V2 dual-tier framing

---

## TL;DR for an X post or DM

> INS V2 is live on Igra mainnet. Forever or Annual .igra names, dual-tier pricing, free V1 migration, 107 reserved ecosystem labels, 314 tests passing. **Built a treasury splitter that routes 20% of every INS withdrawal to the Igra DAO** — just need the DAO multisig address from Pavel to flip it on.

---

## Useful links

- **Live:** https://insdomains.org
- **Contracts (Blockscout):** https://explorer.igralabs.com/address/0x7E7018959bf44045F01D176D8db1594894CBf4E9
- **Repo:** https://github.com/ItsGoonBoyCrypto/INSdomains
- **Integration guide for wallets/explorers:** `docs/INTEGRATION.md`
- **REST API:** `docs/API.md`
- **Treasury splitter spec + runbook:** `docs/TREASURY_SPLITTER.md`

Activity bot: [@insdomainsbot](https://t.me/insdomainsbot) posting every mint / listing / sale to [@IgraNameService](https://t.me/IgraNameService).
