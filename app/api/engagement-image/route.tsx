import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/engagement-image?size=hd|qhd|4k
 *
 * Engagement / scroll-stop image for X posts that ask people to drop a
 * `.igra` name they have or would grab. Big centred question with
 * floating example name pills as visual decoration — no specific CTA,
 * the post text drives the action.
 *
 * Sizes follow the same scheme as snap-launch-image: hd 1920x1080,
 * qhd 2560x1440, 4k 3840x2160.
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd: { w: 1920, h: 1080, scale: 1.0 },
  qhd: { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

// Floating name pills — chosen for variety: short / category / number / ENS-style
// — to spark ideas in viewers (rather than monoculture vibes).
const NAME_PILLS: { name: string; x: number; y: number; size: number; rot: number; tint: "cyan" | "plum" | "emerald" }[] = [
  { name: "vip",        x: 8,  y: 18, size: 1.0, rot: -6, tint: "cyan" },
  { name: "gm",         x: 78, y: 14, size: 1.1, rot:  4, tint: "plum" },
  { name: "dao",        x: 14, y: 78, size: 0.95, rot: 3, tint: "emerald" },
  { name: "satoshi",    x: 70, y: 80, size: 0.9, rot: -3, tint: "cyan" },
  { name: "kaspa",      x: 5,  y: 50, size: 0.85, rot: -2, tint: "plum" },
  { name: "btc",        x: 88, y: 50, size: 1.0, rot:  5, tint: "cyan" },
  { name: "claudeai",   x: 36, y: 13, size: 0.85, rot: -3, tint: "emerald" },
  { name: "moon",       x: 62, y: 86, size: 0.9, rot:  2, tint: "plum" },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const tintMap = {
    cyan:    { border: `${CYAN}55`, bg: "rgba(0,240,255,0.08)", text: CYAN, suffix: PLUM },
    plum:    { border: `${PLUM}55`, bg: "rgba(168,85,247,0.08)", text: PLUM, suffix: CYAN },
    emerald: { border: `${EMERALD}55`, bg: "rgba(52,211,153,0.08)", text: EMERALD, suffix: CYAN },
  };

  // Decorative sparkles for the corners.
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
        {/* Sparkles */}
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

        {/* Floating name pills (decorative) */}
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

        {/* Center stack — question */}
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
            QUESTION FOR YOU
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(170),
              fontWeight: 900,
              letterSpacing: s(-5),
              lineHeight: 1.0,
              marginTop: s(14),
              backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
              backgroundClip: "text",
              color: "transparent",
              padding: `0 ${s(20)}px`,
            }}
          >
            What&rsquo;s your
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: s(170),
              fontWeight: 900,
              letterSpacing: s(-5),
              lineHeight: 1.0,
              marginTop: s(-10),
              padding: `0 ${s(20)}px`,
            }}
          >
            <span
              style={{
                display: "flex",
                color: "#fff",
              }}
            >
              .
            </span>
            <span
              style={{
                display: "flex",
                fontFamily: "monospace",
                color: CYAN,
              }}
            >
              igra
            </span>
            <span
              style={{
                display: "flex",
                color: "#fff",
              }}
            >
              ?
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(28),
              fontWeight: 600,
              color: "rgba(255,255,255,0.68)",
              marginTop: s(24),
              letterSpacing: s(1),
            }}
          >
            Have one? Drop it. Don&rsquo;t? Drop the one you&rsquo;d grab.
          </div>
        </div>

        {/* Spacer */}
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
