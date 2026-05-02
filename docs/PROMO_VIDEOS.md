# INS V2 — Promo Video Pack

Marketing assets generated 2026-05-02 for the V2 launch push. Includes 2 polished MP4 videos (auto-generated via Canva), 5 ready-to-post static images (pulled live from the dApp routes), and a screen-record shot list for capturing real wallet flows.

All assets live at `~/Desktop/INS-promo-videos/` on Liam's machine.

---

## 🎬 Asset 1 — Vertical Story video (1080×1920, MP4)

**File:** `~/Desktop/INS-promo-videos/01-launch-vertical-1080p.mp4` · 829 KB · ~12 sec
**Source:** Canva design [`DAHIilISoR0`](https://www.canva.com/d/56YpD26QO8z25vX) (4 pages)
**Best for:** Instagram Stories · Instagram Reels · TikTok · X vertical posts · Telegram Stories

Vertical promo card with brand mark, "forever.igra" hero text, "Permanent on-chain identity. Pay once. Own forever." tagline, LIVE pill badge, four value prop accents, and the URL footer. Loops cleanly for stories.

**Caption suggestions (paste under the video):**
- "INS V2 is live on @IgraNetwork. Permanent .igra names — Forever or Annual. 🟣 insdomains.org"
- "Your wallet has a name now. forever.igra → 0x… 🟣 V2 live on Igra L2. insdomains.org"

---

## 🎥 Asset 2 — Horizontal walkthrough video (1920×1080, MP4)

**File:** `~/Desktop/INS-promo-videos/02-walkthrough-horizontal-1080p.mp4` · 2.4 MB · ~21 sec
**Source:** Canva design [`DAHIins9le4`](https://www.canva.com/d/w7Ikj7OcEEVzQIF) (7 slides)
**Best for:** YouTube · X horizontal posts · LinkedIn · Twitter Spaces visual aid · embedded on landing pages

7-slide walkthrough that covers: hook ("What if your wallet had a name?") → reveal ("forever.igra") → dual-tier pricing table → 4 feature tiles → V1 holder migration ("gas only") → CTA. Each slide ~3s for a clean ~21s total.

**Caption suggestions:**
- "INS V2 explained in 21 seconds. .igra names, dual-tier pricing, free V1 migration — all live on @IgraNetwork. 🟣 insdomains.org"
- "Permanent on-chain identity for Igra. Forever (pay once) or Annual (1y renewable). Built on @IgraNetwork. 🟣"

---

## 🎬 Asset 3 — Wallet flow screen-record (DIY shot list)

The most authentic crypto-Twitter content is a real wallet doing the flow on-chain. Auto-capture via the Chrome extension hit a permissions wall this session, so this one's a 5-minute screen record you do yourself with OBS / ScreenStudio / CapCut.

### Shot list (~30s total)

Record at **1280×720** (16:9, fits all major platforms). Use OBS / Loom / ScreenStudio. **Don't show your wallet address publicly** — use a fresh wallet OR mask the address area in post.

| # | Action | Duration | What it shows |
|---|---|---|---|
| 1 | Open `https://insdomains.org/app` | 2s | Brand intro + search bar |
| 2 | Type `<your test name>` | 2s | Live availability check (V2 on chain) |
| 3 | Wait for the V2 row to load with both Forever + Annual tiles | 2s | Dual-tier UI — the V2 differentiator |
| 4 | Click `Forever · 500 iKAS` (don't sign yet) | 1s | Wallet popup |
| 5 | Sign in wallet — wait for tx mined | ~10s | Real on-chain action |
| 6 | Auto-popup of Share-to-X modal with rendered NFT | 3s | The reveal — your name as an NFT |
| 7 | Cut to `https://insdomains.org/domains` | 2s | Show your new V2 NFT card with V2 badge |
| 8 | (Optional) Hover the "+1 year" / "Lock Forever" buttons if Annual | 2s | Renewal UX |

### Caption suggestions

- "Just minted my .igra forever 🟣 V2 live on @IgraNetwork. Insdomains.org"
- "0xF9d0…125c → goonboy.igra. One name. Forever. 🟣 insdomains.org"
- (For Annual mint) "Tried the new Annual tier — 50 iKAS for 1 year. 30-day grace if you forget to renew. 🟣 V2 live."

### Editing tips

- **Music:** something synthwave / minimal techno works. CapCut + Epidemic Sound have good "tech reveal" tracks.
- **Title card:** open with a 1.5s black slide that fades to "INS V2" in cyan, just to brand the start.
- **End card:** static 2s of the 4K promo image (`images/promo-card-4k.png` below) with `insdomains.org` overlay.
- **Subtitles:** burn them in (X auto-mutes videos in feed). Tools like Submagic auto-generate from your screen text.
- **Aspect cuts:** make a 9:16 vertical cut for IG/TikTok and a 16:9 master for X/YouTube. Same content, different crops.

---

## 🖼️ Asset 4-8 — Static images (ready to post)

5 standalone images pulled live from the dApp routes (always reflect current on-chain state). Pair with text-only X posts when video is overkill.

All in `~/Desktop/INS-promo-videos/images/`.

| File | Size | Source route | Best for |
|---|---|---|---|
| `promo-card-4k.png` | 770 KB · 3840×2160 | `/api/promo-image?size=4k` | X header image · landing page hero · YouTube thumbnail base · pitch deck cover |
| `og-card-1200x630.png` | 156 KB · 1200×630 | `/opengraph-image` | X link preview · LinkedIn card · OG-meta scrape |
| `v2-nft-goonboy-1200.png` | 195 KB · 1200×1200 | `/api/nft-image/2?size=1200&v=2` | X post — actual V2 NFT card (Forever) |
| `v2-nft-foreverigra-1200.png` | 186 KB · 1200×1200 | `/api/nft-image/3?size=1200&v=2` | Same — alternate name |
| `v2-nft-oioisavaloy-annual-1200.png` | 188 KB · 1200×1200 | `/api/nft-image/1?size=1200&v=2` | X post — V2 Annual card with "Annual · exp May 2027" pill |

---

## 📅 Posting calendar — recommended cadence

Spread the assets across 5-7 days for compounding reach. A reasonable plan:

| Day | Slot | Asset | Channel | Tweet/copy ref |
|---|---|---|---|---|
| **T-3** | 14:00–16:00 UTC | Asset 4 (promo-card-4k.png) | X | Tweet 1 from `LAUNCH_TWEETS.md` (incoming hype) |
| **T-2** | 19:00 UTC | Asset 1 (vertical MP4) | X + IG Story | Caption: "What if your wallet had a name?" + hook |
| **T-1** | 14:00 UTC | Asset 2 (horizontal MP4) | X + LinkedIn + YouTube short | Tweet 2 from LAUNCH_TWEETS.md (preview) |
| **T-1** | 19:00 UTC | Asset 5-7 (V2 NFT cards) | X | Caption: "your name, on-chain" + NFT showcase |
| **Launch day** | 14:00 UTC | Asset 1 + asset 2 | X + IG | Modified Tweet 1 with "🟣 LIVE NOW" framing |
| **Launch day** | 18:00 UTC | Asset 3 (your screen-record) | X | Caption: "I just minted on V2 →" with the recording |
| **Launch +1d** | 14:00 UTC | Asset 5 (V2 NFT card) | X | "First mint of the day — yours next?" |

The 3-tweet copy bank lives in [`docs/LAUNCH_TWEETS.md`](./LAUNCH_TWEETS.md).

---

## 🎨 Brand consistency across all assets

- **Always 🟣** as the visual anchor — matches the brand mark + V2 NFT card accent
- **Always tag `@IgraNetwork`** (not `@IgraLabs`) for ecosystem discovery
- **Always link `insdomains.org`** (not GitHub, not igralabs.com/ins)
- **Hashtags:** `#KASPA` `#Igra` (real ecosystem audiences). Skip `#crypto` `#NFT` (too generic)
- **Avoid lead links** — X demotes link-first posts. Always lead with the hook
- **Never put text smaller than 24pt** on the vertical video — TikTok/IG truncate small text

---

## 🔁 Regenerating

If you want a different vibe / spin / message:

### Re-export the MP4s (already-generated designs)

```bash
# Both designs live in your Canva account — open + edit any text/image, then re-export:
# Vertical:    https://www.canva.com/d/56YpD26QO8z25vX
# Horizontal:  https://www.canva.com/d/w7Ikj7OcEEVzQIF
```

Right side of Canva editor → Share → Download → MP4 video → 1080p.

### Generate a fresh batch via Claude

Same prompt path I used today — ask Claude:
> Generate a `<vertical|horizontal>` Canva promo for INS V2 with `<your new angle>`. Use cyan/plum brand colors, dual-tier framing, link to insdomains.org.

Claude has the Canva MCP wired so it'll generate 3-4 candidates, you pick, it exports MP4. ~5 min round-trip.

### Pull fresh static images

The dApp routes always reflect on-chain reality. To regenerate any image:

```bash
# 4K promo card
curl -o latest-promo.png "https://insdomains.org/api/promo-image?size=4k&v=$(date +%s)"

# Specific V2 NFT (any tokenId)
curl -o my-name.png "https://insdomains.org/api/nft-image/<tokenId>?size=1200&v=2"

# OG card (1200×630)
curl -o latest-og.png "https://insdomains.org/opengraph-image?v=$(date +%s)"
```

The `?v=<cachebuster>` query bumps prevent X / Discord from showing a stale CDN preview.

---

## 📝 Notes on this session

- **2 polished MP4s** were auto-generated via Canva MCP (your_story for vertical, presentation for horizontal). Each took ~3 minutes from prompt to downloadable MP4 file.
- **Chrome extension's gif_creator** was unreliable for live dApp capture this session (returned "Tab not in MCP group" even on freshly created tabs in the group — likely a Chrome extension permission state issue). Pivoted to a screen-record shot list since real wallet flows are more authentic for crypto Twitter anyway.
- **Static images** all pull live from dApp routes — they're always current as long as the chain state is current.
- All assets are MIT-licensed by extension of the repo. Use freely for INS marketing.
