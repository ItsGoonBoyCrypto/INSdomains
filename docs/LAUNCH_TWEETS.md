# INS launch tweets — drafts for @IgraNameService

3 tweets queued for the V2 launch push. **Tweets 1 and 2 are launch-week ready;** Tweet 3 is a template you can paste once you've locked an exact launch date.

Each tweet is sized for X's 280-char limit + works without any external link preview (the image carries the message). I've included the recommended image source for each.

---

## 📣 Tweet 1 — "Incoming launch" hype post (2-3 days before)

**Suggested image:** the 4K promo card — fetch fresh from `https://insdomains.org/api/promo-image?size=4k&v=launchweek` (or download once + reuse). 3840×2160 PNG, ~330 KB, brand gradient + "forever.igra" hero + 4 value props + Live-on-Igra-L2 badge.

```
🟣 Something permanent is coming to @IgraNetwork.

.igra names. ENS-style. On-chain SVG.
Pay once for Forever, or 1-year Annual.
~5x cheaper than ENS for standard names.

V2 launches this week.

🔗 insdomains.org

#KASPA #Igra
```

**Why this works:** mystery-then-reveal (line 1), credibility (ENS-style, established mental model), the 3-line product summary, dual-tier framing (which is the V2 differentiator), price flex against ENS (concrete comparison readers can verify), CTA, hashtags for KAS/Igra discovery. 268 chars.

**Image pull:**

```bash
# Download the 4K card to disk (one-shot)
curl -o ~/Desktop/ins-launch-4k.png "https://insdomains.org/api/promo-image?size=4k&v=launchweek"

# Or 2K if you want a smaller upload
curl -o ~/Desktop/ins-launch-2k.png "https://insdomains.org/api/promo-image?size=qhd&v=launchweek"
```

---

## 🎯 Tweet 2 — "Preview / what & why" (1-2 days before)

**Suggested image:** an actual minted NFT card — pick your favourite test mint. `https://insdomains.org/api/nft-image/2?size=1200&v=2` is `goonboy.igra` (Forever) at 1200px. Or `?v=2&size=1200` on the V2 token id of your choice. Swap to whatever brand name reads best.

```
A name that's actually yours.

🟣 alice.igra — instead of 0xF9d0…125c
🎨 On-chain SVG NFT (no IPFS, ever)
🔓 ENS-compatible namehash
∞ Forever tier — pay once, no renewals
📅 Annual tier — 1y renewable, 30-day grace

Built for @IgraNetwork. Native iKAS.

insdomains.org
```

**Why this works:** opens with the user benefit (replaces 0x for normies), 5 punchy product points each on their own line (X formatter likes line breaks), explicit comparison-to-ENS positioning ("namehash-compatible"), tag, CTA. 273 chars.

**Image pull:**

```bash
# A clean Forever V2 card — adjust tokenId for whichever you'd rather show
curl -o ~/Desktop/ins-preview.png "https://insdomains.org/api/nft-image/2?size=1200&v=2"
```

---

## ⏳ Tweet 3 — "X days countdown" (template, pin or post daily)

**Suggested image:** mix between Tweet 1's 4K card and a custom countdown overlay if you want — but the plain promo image works too. Keep it visually consistent with Tweet 1 to anchor the brand.

```
T-{N} days until INS V2 ships on @IgraNetwork.

🟣 Permanent .igra names — Forever or 1-year Annual.
🔓 ENS-compatible. On-chain SVG. ~5x cheaper than ENS.
🎁 V1 holders migrate FREE (gas only).

🗓️ Launch: {DATE}
🔗 insdomains.org
```

**Replace `{N}` and `{DATE}` each post.** E.g. `T-3 days` … `T-2 days` … `T-1 day` → final morning post: "🟣 INS V2 is LIVE on @IgraNetwork. Mint now → insdomains.org".

**Why this works:** countdown drives daily engagement on X without feeling repetitive (the substance changes if you tweak the bullet emphasis each day), three crisp differentiators, CTA, calendar anchor. 267 chars + variable.

---

## 📅 Post timing recommendation

Best engagement windows for a Kaspa/Igra audience (US + EU split, mostly Western users):

| | UTC | London | New York | Audience peak |
|---|---|---|---|---|
| Best | 14:00–17:00 | 14:00–17:00 | 09:00–12:00 | EU evening + US morning crossover |
| Backup | 19:00–22:00 | 19:00–22:00 | 14:00–17:00 | EU late evening + US afternoon |
| Worst | 02:00–08:00 UTC | overnight in both | overnight | dead window |

A reasonable cadence:
- **T-3 days** — Tweet 1 (incoming hype), 14:00–16:00 UTC
- **T-2 days** — Tweet 3 (countdown), late afternoon
- **T-1 day** — Tweet 2 (preview / product walkthrough), mid afternoon
- **Launch morning** — modified Tweet 1 with "🟣 LIVE NOW" framing
- **Launch +1h** — link to a freshly minted name as social proof, plus retweet anyone who's minted

---

## 🟣 Brand consistency notes

- Always 🟣 (purple circle) as the visual anchor — matches the brand mark + the V2 NFT card accent
- Always tag `@IgraNetwork` (not `@IgraLabs`) for ecosystem discovery
- Always link `insdomains.org` (not `igralabs.com/ins` or similar)
- Avoid `#crypto` / `#NFT` hashtags — too generic. Use `#KASPA` and `#Igra` (real ecosystem audiences)
- Don't put the link in the first line of the tweet — X demotes link-first posts. Lead with the product / hook.

---

## 🔁 Post-launch evergreen tweets (bonus, optional)

After the launch dust settles, these are reusable any time:

```
"alice.igra" → 0xF9d0…125c

That's INS. Live on Igra L2. Pay once for Forever. Free V1 → V2 migration.

🟣 insdomains.org
```

```
Why pay $5/year on .eth when Igra L2 has permanent .igra names from 500 iKAS?

ENS-compatible namehash. On-chain SVG. No renewals (Forever) or 1y Annual.

🟣 insdomains.org
```

```
Wallet devs: integrate .igra resolution in 5 minutes.

📘 docs.insdomains.org/INTEGRATION
🧪 273 Foundry tests, 0 fails
🔓 Free public REST API, no auth

🟣 insdomains.org
```

(Note: the last one references `docs.insdomains.org` — currently those docs live under github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/. If you ever spin up a docs subdomain, swap to that.)
