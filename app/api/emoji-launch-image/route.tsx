import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/emoji-launch-image?size=hd|qhd|4k
 *
 * Emoji-names launch hero. Big punchy "EMOJI NAMES LIVE" + a row of
 * example emoji .igra names + price + CTA. Uses next/og's built-in
 * twemoji rendering so the emoji glyphs render with full fidelity
 * (ZWJ sequences, skin tones, regional indicator flag pairs).
 *
 *   hd  1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd:   { w: 1920, h: 1080, scale: 1.0 },
  qhd:  { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const SHOWCASE: [string, string][] = [
    ["🔥", "fire"],
    ["🚀", "rocket"],
    ["💎", "diamond"],
    ["⚽", "soccer"],
    ["🌙", "moon"],
    ["🎯", "target"],
  ];

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
          backgroundImage: `radial-gradient(${s(1200)}px ${s(880)}px at 50% 38%, rgba(0,240,255,0.28), transparent 66%), radial-gradient(${s(900)}px ${s(760)}px at 88% 96%, rgba(168,85,247,0.30), transparent 64%), radial-gradient(${s(820)}px ${s(700)}px at 4% 4%, rgba(52,211,153,0.18), transparent 62%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(60)}px ${s(80)}px`,
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
            JUST SHIPPED
          </div>
        </div>

        {/* Title block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: s(48),
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: s(36),
              fontWeight: 800,
              letterSpacing: s(8),
              color: "rgba(255,255,255,0.78)",
            }}
          >
            EMOJI NAMES ARE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(180),
              fontWeight: 900,
              letterSpacing: s(-4),
              lineHeight: 1,
              marginTop: s(6),
              backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 65%, #ff5fa2 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            LIVE
          </div>
        </div>

        {/* Showcase row */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: s(18),
            marginTop: s(60),
            flexWrap: "wrap",
          }}
        >
          {SHOWCASE.map(([emoji, key]) => (
            <div
              key={key}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: `${s(20)}px ${s(28)}px`,
                borderRadius: s(20),
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                gap: s(6),
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline" }}>
                <div style={{ display: "flex", fontSize: s(70), lineHeight: 1 }}>{emoji}</div>
                <div style={{ display: "flex", fontSize: s(34), fontWeight: 800, color: PLUM, marginLeft: s(2) }}>.igra</div>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing subline */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: s(20),
            marginTop: s(60),
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: s(56),
              fontWeight: 900,
              letterSpacing: s(-1),
              color: "#fff",
            }}
          >
            From&nbsp;
            <span style={{ display: "flex", color: EMERALD }}>500 iKAS</span>
            &nbsp;Forever
          </div>
        </div>

        {/* Sub-subline — what you get */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: s(20),
            marginTop: s(20),
            fontSize: s(24),
            fontWeight: 600,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: s(1),
          }}
        >
          ENSIP-15 normalized · Homograph-safe · Resolves in every INS-integrated wallet
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
            paddingTop: s(20),
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
