import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/shipped-today-image?size=hd|qhd|4k&date=YYYY-MM-DD
 *
 * Daily wrap-up card — six pillars covering everything landed in the
 * current session. Same visual template as /api/shipped-image, swaps
 * the eyebrow from "EVERYTHING DELIVERED" to "SHIPPED · <date>" and
 * points the tick items at today's concrete wins rather than the
 * cumulative product state.
 *
 *   hd  1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd:   { w: 1920, h: 1080, scale: 1.0 },
  qhd:  { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

const PILLARS: { label: string; items: string[] }[] = [
  { label: "METAMASK",  items: ["LIVE in the Snap Directory", "First real .igra send tx on-chain", "One-click install, no warnings"] },
  { label: "WALLETS",   items: ["MetaMask · Kastle · Kasware", "Kurncy · Kasperia", "5-of-5 confirmed today"] },
  { label: "WEBSITE",   items: ["New /snap landing page", "Full FAQ · LIVE-state answers", "Zero Flask copy site-wide"] },
  { label: "INFRA",     items: ["3-signal registry watcher v2", "TG alert on each state change", "platformVersion 11.0 compat fix"] },
  { label: "BUILDERS",  items: ["RustyKaspa explorer resolves .igra", "1.3KB bundle · ENS-compatible", "Free public REST API forever"] },
  { label: "CONTENT",   items: ["State-of-INS recap card", "RustyKaspa builder spotlight", "Multitude ecosystem post"] },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const dateStr = url.searchParams.get("date") ?? "2026-07-01";
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const SPARKS: [number, number, number, number, number][] = [
    [4, 6, 14, 45, 0.4], [96, 8, 12, 30, 0.35],
    [92, 92, 16, 45, 0.45], [3, 90, 11, 20, 0.35],
    [22, 30, 9, 45, 0.3], [80, 70, 10, 30, 0.3],
    [42, 12, 8, 45, 0.25], [60, 88, 9, 20, 0.3],
    [12, 60, 7, 45, 0.3], [88, 30, 8, 20, 0.3],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(${s(1200)}px ${s(880)}px at 50% 34%, rgba(0,240,255,0.28), transparent 66%), radial-gradient(${s(900)}px ${s(760)}px at 88% 96%, rgba(168,85,247,0.30), transparent 64%), radial-gradient(${s(820)}px ${s(700)}px at 4% 4%, rgba(52,211,153,0.16), transparent 62%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(52)}px ${s(72)}px ${s(46)}px ${s(72)}px`,
        }}
      >
        {SPARKS.map(([x, y, sz, rot, op], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              display: "flex",
              width: s(sz),
              height: s(sz),
              borderRadius: s(3),
              transform: `rotate(${rot}deg)`,
              background: i % 2 === 0 ? CYAN : PLUM,
              opacity: op,
              boxShadow: `0 0 ${s(20)}px ${i % 2 === 0 ? CYAN : PLUM}`,
            }}
          />
        ))}

        {/* Top brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: s(14) }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: s(54),
                height: s(54),
                borderRadius: s(14),
                background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                color: "#000",
                fontSize: s(34),
                fontWeight: 900,
                boxShadow: `0 0 ${s(30)}px rgba(0,240,255,0.5)`,
              }}
            >
              i
            </div>
            <div style={{ display: "flex", fontSize: s(20), fontWeight: 800, letterSpacing: s(5), color: "rgba(255,255,255,0.78)" }}>
              IGRA NAME SERVICE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(12),
              padding: `${s(10)}px ${s(22)}px`,
              borderRadius: 999,
              border: `1px solid ${EMERALD}66`,
              background: `${EMERALD}1a`,
              fontSize: s(20),
              fontWeight: 900,
              letterSpacing: s(4),
              color: "#86efac",
              boxShadow: `0 0 ${s(30)}px ${EMERALD}40`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: s(14),
                height: s(14),
                borderRadius: 999,
                background: EMERALD,
                boxShadow: `0 0 ${s(16)}px ${EMERALD}`,
              }}
            />
            SHIPPED · {dateStr}
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: s(34),
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: s(28),
              fontWeight: 800,
              letterSpacing: s(8),
              color: "rgba(255,255,255,0.7)",
            }}
          >
            TODAY AT INS
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(140),
              fontWeight: 900,
              letterSpacing: s(-4),
              lineHeight: 1,
              marginTop: s(4),
              backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 60%, #ff5fa2 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            SHIPPED.
          </div>
        </div>

        {/* Pillars grid — 3 columns × 2 rows */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: s(14),
            marginTop: s(36),
          }}
        >
          {PILLARS.map((pillar) => (
            <div
              key={pillar.label}
              style={{
                display: "flex",
                flexDirection: "column",
                width: s(540),
                padding: `${s(18)}px ${s(22)}px`,
                borderRadius: s(18),
                border: "1px solid rgba(255,255,255,0.10)",
                background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: s(14),
                  fontWeight: 800,
                  letterSpacing: s(4),
                  color: CYAN,
                  marginBottom: s(10),
                }}
              >
                {pillar.label}
              </div>
              {pillar.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: s(10),
                    marginTop: i === 0 ? 0 : s(4),
                    fontSize: s(18),
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.88)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: s(20),
                      height: s(20),
                      borderRadius: 999,
                      background: EMERALD,
                      color: "#0a0a0a",
                      fontSize: s(14),
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </div>
                  <span style={{ display: "flex" }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: s(20),
            fontWeight: 700,
            letterSpacing: s(2),
            color: "rgba(255,255,255,0.55)",
            paddingTop: s(18),
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex" }}>insdomains.org</div>
          <div style={{ display: "flex", gap: s(14) }}>
            <span style={{ display: "flex" }}>@IgraNameService</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
            <span style={{ display: "flex" }}>Native on Igra L2</span>
          </div>
        </div>
      </div>
    ),
    {
      width: w,
      height: h,
      emoji: "twemoji",
      headers: {
        "Cache-Control": "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
