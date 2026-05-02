import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#0a0a0a";

/**
 * GET /api/promo-image?size=hd|qhd|4k
 *
 * High-resolution promotional image for marketing / outreach to wallet
 * & explorer integrators. Designed to be readable at any scale —
 * platforms compress 4K aggressively, so 1920×1080 (default) renders
 * sharper on-feed than a 3840×2160 source.
 *
 * Sizes:
 *   hd  (default) — 1920×1080. Best for X / Telegram / LinkedIn.
 *   qhd          — 2560×1440. Crisp on retina monitors.
 *   4k           — 3840×2160. True 4K for landing-page heroes / pitch decks.
 *
 * Cached at the edge for 6h since the content is static (no live state).
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd:  { w: 1920, h: 1080, scale: 1.0 },
  qhd: { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

/** V2 pricing — Annual (1-year renewable) + Forever (pay once). All in iKAS.
 *  Mirrors the table on /about + the OG card so all three stay in sync. */
const TIERS = [
  { len: "1-char", annual: "1,000", forever: "4,000" },
  { len: "2-char", annual: "800",   forever: "2,000" },
  { len: "3-char", annual: "500",   forever: "1,200" },
  { len: "4-char", annual: "250",   forever: "800"   },
  { len: "5–32",   annual: "50",    forever: "500"   },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;

  /** Helper — scale a 1920-baseline pixel value to the chosen size. */
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(${s(900)}px ${s(700)}px at 90% 110%, rgba(168,85,247,0.30), transparent 70%), radial-gradient(${s(800)}px ${s(700)}px at 0% -10%, rgba(0,240,255,0.22), transparent 70%), radial-gradient(${s(600)}px ${s(500)}px at 50% 50%, rgba(0,240,255,0.05), transparent 70%)`,
          padding: `${s(80)}px ${s(96)}px`,
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* ── Top bar: brand mark left, LIVE badge right ─────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: s(20) }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: s(72),
                height: s(72),
                borderRadius: s(20),
                background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                color: "#000",
                fontSize: s(48),
                fontWeight: 900,
                boxShadow: `0 0 ${s(48)}px rgba(0,240,255,0.45)`,
              }}
            >
              i
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(28),
                fontWeight: 800,
                letterSpacing: s(6),
                color: "rgba(255,255,255,0.7)",
              }}
            >
              IGRA NAME SERVICE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(14),
              padding: `${s(12)}px ${s(24)}px`,
              borderRadius: 999,
              border: `1px solid ${CYAN}55`,
              background: `${CYAN}15`,
              fontSize: s(22),
              fontWeight: 800,
              letterSpacing: s(3),
              color: CYAN,
            }}
          >
            <div
              style={{
                display: "flex",
                width: s(14),
                height: s(14),
                borderRadius: 999,
                background: "#34d399",
                boxShadow: `0 0 ${s(16)}px #34d399`,
              }}
            />
            LIVE ON IGRA L2
          </div>
        </div>

        {/* ── Center split: hero name | value props ──────────────── */}
        <div
          style={{
            display: "flex",
            flex: 1,
            marginTop: s(60),
            gap: s(60),
          }}
        >
          {/* LEFT: hero NFT-style card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "flex-start",
              flex: 1.1,
              borderRadius: s(48),
              padding: s(72),
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              position: "relative",
              boxShadow: `0 0 ${s(120)}px rgba(0,240,255,0.10), 0 0 ${s(180)}px rgba(168,85,247,0.10)`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: s(180),
                  fontWeight: 900,
                  letterSpacing: s(-4),
                  backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                  backgroundClip: "text",
                  color: "transparent",
                  lineHeight: 1.05,
                  paddingRight: s(8),
                }}
              >
                forever
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: s(110),
                  fontWeight: 700,
                  color: PLUM,
                  letterSpacing: s(-2),
                }}
              >
                .igra
              </div>
            </div>
            <div
              style={{
                display: "flex",
                marginTop: s(36),
                fontSize: s(28),
                fontWeight: 600,
                color: "rgba(255,255,255,0.75)",
                letterSpacing: s(0.5),
              }}
            >
              Permanent on-chain identity. Pay once. Own forever.
            </div>
          </div>

          {/* RIGHT: value props for integrators */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 0.9,
              gap: s(28),
            }}
          >
            <ValueRow scale={scale} accent={CYAN} title="Free public REST API"
                      body="One fetch() resolves any name → address. Reverse, owner-list, listings, stats." />
            <ValueRow scale={scale} accent={PLUM} title="ENS-compatible namehash"
                      body="Drop-in for wallets that already speak addr(node) + text(node, key)." />
            <ValueRow scale={scale} accent="#34d399" title="On-chain SVG art"
                      body="No IPFS dependency. tokenURI() returns Base64 SVG inline." />
            <ValueRow scale={scale} accent="#fb7185" title="Audited, open source"
                      body="170 Foundry tests, 0 fails. 1024-run fuzz soak clean. MIT-licensed." />
          </div>
        </div>

        {/* ── Pricing strip — Annual / Forever per length tier ──── */}
        <div
          style={{
            display: "flex",
            marginTop: s(40),
            padding: `${s(22)}px ${s(28)}px`,
            borderRadius: s(28),
            border: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(120deg, rgba(0,240,255,0.05) 0%, rgba(168,85,247,0.06) 100%)",
            alignItems: "center",
            gap: s(20),
          }}
        >
          {/* Section label */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: s(180),
              flex: "0 0 auto",
              gap: s(4),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(11),
                fontWeight: 800,
                letterSpacing: s(3),
                color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase",
              }}
            >
              Pricing · iKAS
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(13),
                color: "rgba(255,255,255,0.55)",
              }}
            >
              Annual launches V2
            </div>
          </div>

          {/* Tier chips, one per length */}
          {TIERS.map((t, i) => (
            <div
              key={t.len}
              style={{
                display: "flex",
                flex: 1,
                flexDirection: "column",
                gap: s(4),
                padding: `${s(10)}px ${s(14)}px`,
                borderRadius: s(14),
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: s(11),
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.55)",
                  letterSpacing: s(1.5),
                  textTransform: "uppercase",
                }}
              >
                {t.len}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: s(5) }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: s(15),
                    fontWeight: 800,
                    color: "rgba(52,211,153,0.85)",
                  }}
                >
                  {t.annual}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: s(10),
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  /yr
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: s(5) }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: s(17),
                    fontWeight: 900,
                    color: CYAN,
                  }}
                >
                  {t.forever}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: s(10),
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  once
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Bottom strip: site / chain / handle ────────────────── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: s(28),
            paddingTop: s(24),
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: s(40),
              fontWeight: 800,
              letterSpacing: s(-0.5),
              color: "rgba(255,255,255,0.95)",
            }}
          >
            insdomains.org
          </div>
          <div
            style={{
              display: "flex",
              gap: s(28),
              fontSize: s(20),
              fontWeight: 600,
              letterSpacing: s(3),
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <div style={{ display: "flex" }}>Native on Igra L2</div>
            <div style={{ display: "flex" }}>·</div>
            <div style={{ display: "flex" }}>Kaspa-secured</div>
            <div style={{ display: "flex" }}>·</div>
            <div style={{ display: "flex" }}>No renewals</div>
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        // Long edge cache; content is static. Bumping the design = new
        // route response by version, so 6h staleness is fine.
        "Cache-Control": "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}

function ValueRow({
  scale,
  accent,
  title,
  body,
}: {
  scale: number;
  accent: string;
  title: string;
  body: string;
}) {
  const s = (n: number) => Math.round(n * scale * 100) / 100;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: s(20),
        padding: s(20),
        borderRadius: s(20),
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          width: s(8),
          height: s(60),
          borderRadius: s(4),
          background: accent,
          boxShadow: `0 0 ${s(16)}px ${accent}80`,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: s(6) }}>
        <div
          style={{
            display: "flex",
            fontSize: s(28),
            fontWeight: 800,
            color: "#fff",
            letterSpacing: s(-0.3),
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: s(20),
            fontWeight: 500,
            color: "rgba(255,255,255,0.65)",
            lineHeight: 1.4,
          }}
        >
          {body}
        </div>
      </div>
    </div>
  );
}
