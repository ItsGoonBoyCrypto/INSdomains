import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
const LIME = "#a3e635";

/**
 * GET /api/dao-splitter-image?size=hd|qhd|4k
 *
 * Governance-milestone scroll-stop for the TreasurySplitter launch.
 * Big "80 | 20" split treatment with INS Treasury (plum/cyan) on the
 * left and Igra DAO (lime, matching the Igra brand mark) on the right.
 * Subtitle reinforces "automatic, on-chain". Splitter address mono-
 * footer for verifiability.
 *
 * Sizes follow the snap-launch-image / engagement-image scheme:
 * hd 1920x1080, qhd 2560x1440, 4k 3840x2160.
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd: { w: 1920, h: 1080, scale: 1.0 },
  qhd: { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

const SPLITTER = "0x6Da215700aca9F35714Dce20b0c09735d92282E2";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const SPARKS: [number, number, number, number, number][] = [
    [4, 6, 14, 45, 0.4], [96, 8, 12, 30, 0.35],
    [92, 92, 16, 45, 0.45], [3, 90, 11, 20, 0.35],
    [22, 30, 9, 45, 0.3], [80, 70, 10, 30, 0.3],
    [42, 12, 8, 45, 0.25], [60, 90, 9, 20, 0.3],
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
          backgroundImage: `radial-gradient(${s(900)}px ${s(700)}px at 30% 50%, rgba(0,240,255,0.20), transparent 70%), radial-gradient(${s(900)}px ${s(700)}px at 70% 50%, rgba(163,230,53,0.18), transparent 70%), radial-gradient(${s(700)}px ${s(580)}px at 50% 100%, rgba(168,85,247,0.16), transparent 64%), radial-gradient(${s(1400)}px ${s(1000)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
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
              background: i % 3 === 0 ? CYAN : i % 3 === 1 ? PLUM : LIME,
              opacity: op,
              boxShadow: `0 0 ${s(20)}px ${i % 3 === 0 ? CYAN : i % 3 === 1 ? PLUM : LIME}`,
            }}
          />
        ))}

        {/* Top brand chip + LIVE pill */}
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
            GOVERNANCE LIVE
          </div>
        </div>

        {/* Hero — kicker */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: s(46),
            fontSize: s(26),
            fontWeight: 700,
            letterSpacing: s(8),
            color: "rgba(255,255,255,0.55)",
          }}
        >
          EVERY FEE · AUTOMATIC · ON-CHAIN
        </div>

        {/* Big 80 / 20 stack */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: s(60),
            marginTop: s(36),
          }}
        >
          {/* LEFT — 80% INS */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              gap: s(8),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(22),
                fontWeight: 800,
                letterSpacing: s(6),
                color: "rgba(255,255,255,0.5)",
              }}
            >
              INS TREASURY
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: s(280),
                fontWeight: 900,
                letterSpacing: s(-10),
                lineHeight: 1.0,
                backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
                backgroundClip: "text",
                color: "transparent",
                padding: `0 ${s(10)}px`,
              }}
            >
              80
              <span style={{ display: "flex", fontSize: s(120) }}>%</span>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "monospace",
                fontSize: s(20),
                color: "rgba(255,255,255,0.55)",
                marginTop: s(4),
              }}
            >
              0x7447…07aA1
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: s(2),
              height: s(360),
              background: "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.25) 70%, transparent 100%)",
            }}
          />

          {/* RIGHT — 20% DAO */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              gap: s(8),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(22),
                fontWeight: 800,
                letterSpacing: s(6),
                color: "rgba(255,255,255,0.5)",
              }}
            >
              IGRA DAO
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                fontSize: s(280),
                fontWeight: 900,
                letterSpacing: s(-10),
                lineHeight: 1.0,
                backgroundImage: `linear-gradient(110deg, ${LIME} 0%, ${EMERALD} 100%)`,
                backgroundClip: "text",
                color: "transparent",
                padding: `0 ${s(10)}px`,
              }}
            >
              20
              <span style={{ display: "flex", fontSize: s(120) }}>%</span>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "monospace",
                fontSize: s(20),
                color: "rgba(255,255,255,0.55)",
                marginTop: s(4),
              }}
            >
              0x9087…A2c2
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Splitter address pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: s(20), gap: s(16) }}>
          <div
            style={{
              display: "flex",
              fontSize: s(16),
              fontWeight: 700,
              letterSpacing: s(3),
              color: "rgba(255,255,255,0.5)",
            }}
          >
            TREASURYSPLITTER ·
          </div>
          <div
            style={{
              display: "flex",
              padding: `${s(8)}px ${s(20)}px`,
              borderRadius: s(10),
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.14)",
              fontFamily: "monospace",
              fontSize: s(18),
              fontWeight: 700,
              color: CYAN,
            }}
          >
            {SPLITTER}
          </div>
        </div>

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
            paddingTop: s(14),
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex" }}>insdomains.org</div>
          <div style={{ display: "flex", gap: s(14) }}>
            <span style={{ display: "flex" }}>@IgraNameService</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
            <span style={{ display: "flex" }}>Aligned with @IgraLabs</span>
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
