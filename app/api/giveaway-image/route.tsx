import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#0a0a0a";

/**
 * GET /api/giveaway-image?size=hd|qhd|4k
 *
 * On-brand giveaway card for social pushes: "win a premium .igra name, free".
 * Code-rendered (next/og) so the text is always pixel-accurate and on-brand —
 * no Canva text-mangling. Reusable for any follow/like/repost giveaway.
 *
 *   hd  (default) — 1920×1080 (best on X / Telegram)
 *   qhd          — 2560×1440
 *   4k           — 3840×2160
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd: { w: 1920, h: 1080, scale: 1.0 },
  qhd: { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const STEPS = [
    { n: "1", t: "Follow", accent: CYAN },
    { n: "2", t: "Like", accent: PLUM },
    { n: "3", t: "Repost", accent: "#34d399" },
    { n: "4", t: "Join TG", accent: "#fb7185" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(${s(900)}px ${s(700)}px at 90% 110%, rgba(168,85,247,0.32), transparent 70%), radial-gradient(${s(820)}px ${s(700)}px at 0% -10%, rgba(0,240,255,0.24), transparent 70%), radial-gradient(${s(600)}px ${s(520)}px at 50% 40%, rgba(0,240,255,0.05), transparent 70%)`,
          padding: `${s(76)}px ${s(96)}px`,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, letterSpacing: s(6), color: "rgba(255,255,255,0.7)" }}>
              IGRA NAME SERVICE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(14),
              padding: `${s(12)}px ${s(26)}px`,
              borderRadius: 999,
              border: `1px solid ${PLUM}66`,
              background: `${PLUM}1f`,
              fontSize: s(24),
              fontWeight: 900,
              letterSpacing: s(4),
              color: "#e9d5ff",
            }}
          >
            🎁 GIVEAWAY
          </div>
        </div>

        {/* Center hero */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", marginTop: s(20) }}>
          <div style={{ display: "flex", fontSize: s(46), fontWeight: 800, letterSpacing: s(2), color: "rgba(255,255,255,0.85)" }}>
            WIN A PREMIUM
          </div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: s(6) }}>
            <div
              style={{
                display: "flex",
                fontSize: s(168),
                fontWeight: 900,
                letterSpacing: s(-4),
                backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                backgroundClip: "text",
                color: "transparent",
                lineHeight: 1.02,
              }}
            >
              yourname
            </div>
            <div style={{ display: "flex", fontSize: s(104), fontWeight: 700, color: PLUM, letterSpacing: s(-2) }}>
              .igra
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(16),
              marginTop: s(22),
              fontSize: s(34),
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            <span style={{ display: "flex", color: "#34d399" }}>FREE</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.4)" }}>·</span>
            <span style={{ display: "flex" }}>1 random winner</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.4)" }}>·</span>
            <span style={{ display: "flex" }}>pay once, own forever</span>
          </div>
        </div>

        {/* Entry steps */}
        <div style={{ display: "flex", gap: s(20), marginTop: s(20) }}>
          {STEPS.map((step) => (
            <div
              key={step.n}
              style={{
                display: "flex",
                alignItems: "center",
                gap: s(16),
                flex: 1,
                padding: `${s(22)}px ${s(24)}px`,
                borderRadius: s(20),
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: s(48),
                  height: s(48),
                  borderRadius: 999,
                  background: step.accent,
                  color: "#000",
                  fontSize: s(26),
                  fontWeight: 900,
                  boxShadow: `0 0 ${s(20)}px ${step.accent}80`,
                }}
              >
                {step.n}
              </div>
              <div style={{ display: "flex", fontSize: s(30), fontWeight: 800, color: "#fff" }}>{step.t}</div>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: s(40),
            paddingTop: s(32),
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", fontSize: s(40), fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>
            insdomains.org
          </div>
          <div style={{ display: "flex", gap: s(24), fontSize: s(22), fontWeight: 700, letterSpacing: s(2), color: "rgba(255,255,255,0.55)" }}>
            <div style={{ display: "flex" }}>@IgraNameService</div>
            <div style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</div>
            <div style={{ display: "flex" }}>Live on Igra L2</div>
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      headers: {
        "Cache-Control": "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
