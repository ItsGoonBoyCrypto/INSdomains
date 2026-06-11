import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/count-image?count=229&size=hd|qhd|4k
 *
 * Mint-momentum promo image — big gradient count + "Be the next" hook.
 * Bump the ?count= param for each new post. Brand system shared with
 * engagement-image: same INK background, floating .igra pills,
 * sparkles, brand chip, footer.
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd: { w: 1920, h: 1080, scale: 1.0 },
  qhd: { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

const NAME_PILLS: { name: string; x: number; y: number; size: number; rot: number; tint: "cyan" | "plum" | "emerald" }[] = [
  { name: "vip",      x: 7,  y: 20, size: 1.0,  rot: -6, tint: "cyan" },
  { name: "gm",       x: 80, y: 16, size: 1.1,  rot:  4, tint: "plum" },
  { name: "dao",      x: 13, y: 78, size: 0.95, rot:  3, tint: "emerald" },
  { name: "satoshi",  x: 72, y: 82, size: 0.9,  rot: -3, tint: "cyan" },
  { name: "kaspa",    x: 4,  y: 50, size: 0.85, rot: -2, tint: "plum" },
  { name: "btc",      x: 89, y: 52, size: 1.0,  rot:  5, tint: "cyan" },
  { name: "moon",     x: 62, y: 88, size: 0.9,  rot:  2, tint: "plum" },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const countRaw = parseInt(url.searchParams.get("count") ?? "229", 10);
  const count = Number.isFinite(countRaw) && countRaw > 0 ? countRaw : 229;
  const next = count + 1;

  const tintMap = {
    cyan:    { border: `${CYAN}55`,    bg: "rgba(0,240,255,0.08)",   text: CYAN,    suffix: PLUM },
    plum:    { border: `${PLUM}55`,    bg: "rgba(168,85,247,0.08)",  text: PLUM,    suffix: CYAN },
    emerald: { border: `${EMERALD}55`, bg: "rgba(52,211,153,0.08)",  text: EMERALD, suffix: CYAN },
  };

  const SPARKS: [number, number, number, number, number][] = [
    [4, 4, 14, 45, 0.4], [96, 6, 12, 30, 0.35],
    [92, 94, 16, 45, 0.45], [3, 92, 11, 20, 0.35],
    [50, 4, 9, 45, 0.3], [50, 96, 10, 30, 0.3],
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
          backgroundImage: `radial-gradient(${s(900)}px ${s(700)}px at 50% 50%, rgba(0,240,255,0.18), transparent 70%), radial-gradient(${s(800)}px ${s(680)}px at 100% 100%, rgba(168,85,247,0.22), transparent 66%), radial-gradient(${s(700)}px ${s(580)}px at 0% 100%, rgba(0,240,255,0.12), transparent 64%), radial-gradient(${s(1400)}px ${s(1000)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(48)}px ${s(80)}px`,
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

        {NAME_PILLS.map((p, i) => {
          const t = tintMap[p.tint];
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${p.x}%`,
                top: `${p.y}%`,
                display: "flex",
                transform: `rotate(${p.rot}deg)`,
                padding: `${s(14 * p.size)}px ${s(28 * p.size)}px`,
                borderRadius: 999,
                background: t.bg,
                border: `1px solid ${t.border}`,
                fontFamily: "monospace",
                fontSize: s(36 * p.size),
                fontWeight: 800,
                color: t.text,
                opacity: 0.85,
                boxShadow: `0 ${s(8)}px ${s(24)}px rgba(0,0,0,0.4), 0 0 ${s(40)}px ${t.border}`,
              }}
            >
              {p.name}
              <span style={{ display: "flex", color: t.suffix }}>.igra</span>
            </div>
          );
        })}

        {/* Top brand chip */}
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
            <div
              style={{
                display: "flex",
                fontSize: s(20),
                fontWeight: 800,
                letterSpacing: s(5),
                color: "rgba(255,255,255,0.78)",
              }}
            >
              IGRA NAME SERVICE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(12),
              padding: `${s(10)}px ${s(20)}px`,
              borderRadius: 999,
              border: `1px solid ${CYAN}55`,
              background: `${CYAN}15`,
              fontSize: s(18),
              fontWeight: 800,
              letterSpacing: s(3),
              color: CYAN,
            }}
          >
            <div
              style={{
                display: "flex",
                width: s(12),
                height: s(12),
                borderRadius: 999,
                background: EMERALD,
                boxShadow: `0 0 ${s(14)}px ${EMERALD}`,
              }}
            />
            MINTING LIVE
          </div>
        </div>

        {/* Center stack */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: s(8),
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: s(26),
              fontWeight: 700,
              letterSpacing: s(8),
              color: "rgba(255,255,255,0.55)",
            }}
          >
            CLAIMED ON IGRA L2
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(360),
              fontWeight: 900,
              letterSpacing: s(-12),
              lineHeight: 1.0,
              marginTop: s(8),
              backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
              backgroundClip: "text",
              color: "transparent",
              padding: `0 ${s(20)}px`,
            }}
          >
            {count}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: s(56),
              fontWeight: 800,
              letterSpacing: s(-1),
              lineHeight: 1.0,
              marginTop: s(-8),
            }}
          >
            <span style={{ display: "flex", color: "#fff" }}>names live on</span>
            <span
              style={{
                display: "flex",
                fontFamily: "monospace",
                color: CYAN,
                marginLeft: s(14),
              }}
            >
              .igra
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(30),
              fontWeight: 600,
              color: "rgba(255,255,255,0.7)",
              marginTop: s(28),
              letterSpacing: s(1),
            }}
          >
            Be the
            <span
              style={{
                display: "flex",
                marginLeft: s(10),
                marginRight: s(10),
                fontWeight: 900,
                backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {next}
              <span style={{ display: "flex", color: PLUM }}>th</span>
            </span>
            — names mint once, never re-issued.
          </div>
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
          }}
        >
          <div style={{ display: "flex" }}>insdomains.org</div>
          <div style={{ display: "flex", gap: s(14) }}>
            <span style={{ display: "flex" }}>@IgraNameService</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
            <span style={{ display: "flex" }}>Built on Igra L2</span>
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
