import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
const LIME = "#a3e635";

/**
 * GET /api/dao-only-image?size=hd|qhd|4k
 *
 * The "DAO-only" variant of the governance-milestone promo: drops the
 * 80% INS Treasury half and goes ALL IN on the 20% → Igra DAO story.
 *
 * Why: the original 80/20 image gave away half its real estate to the
 * thing we keep. Liam asked to refocus on the differentiator — no
 * other name service shares fees with their host chain's DAO, no
 * other Igra builder shares fees with the DAO. Visually leaning into
 * the lime/emerald palette that matches Igra Labs' actual brand mark
 * makes the "with Igra" framing read in one beat.
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
          backgroundImage: `radial-gradient(${s(1100)}px ${s(820)}px at 50% 50%, rgba(163,230,53,0.22), transparent 70%), radial-gradient(${s(800)}px ${s(680)}px at 100% 100%, rgba(52,211,153,0.18), transparent 66%), radial-gradient(${s(700)}px ${s(580)}px at 0% 0%, rgba(168,85,247,0.10), transparent 64%), radial-gradient(${s(1400)}px ${s(1000)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
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
              background: i % 2 === 0 ? LIME : EMERALD,
              opacity: op,
              boxShadow: `0 0 ${s(20)}px ${i % 2 === 0 ? LIME : EMERALD}`,
            }}
          />
        ))}

        {/* Top brand chip + GOVERNANCE LIVE pill */}
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

        {/* Hero stack — centered, vertically balanced */}
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
            padding: `0 ${s(80)}px`,
          }}
        >
          {/* THE BIG 20% */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: s(380),
              fontWeight: 900,
              letterSpacing: s(-14),
              lineHeight: 1.0,
              backgroundImage: `linear-gradient(110deg, ${LIME} 0%, ${EMERALD} 100%)`,
              backgroundClip: "text",
              color: "transparent",
              padding: `0 ${s(20)}px`,
            }}
          >
            20
            <span style={{ display: "flex", fontSize: s(180) }}>%</span>
          </div>

          {/* Hero subtitle */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: s(48),
              fontWeight: 800,
              letterSpacing: s(-1),
              marginTop: s(8),
              color: "#fff",
            }}
          >
            of every fee, back to
            <span
              style={{
                display: "flex",
                marginLeft: s(14),
                fontWeight: 900,
                color: LIME,
              }}
            >
              @IgraLabs
            </span>
            <span style={{ display: "flex", marginLeft: s(12), fontWeight: 900, color: "#fff" }}>DAO</span>
          </div>

          {/* Two-line differentiator */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: s(8),
              marginTop: s(40),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(28),
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: s(1),
              }}
            >
              No other name service does this.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(28),
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                letterSpacing: s(1),
              }}
            >
              No other Igra builder does this.
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Splitter address pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: s(20),
            gap: s(16),
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: s(15),
              fontWeight: 700,
              letterSpacing: s(3),
              color: "rgba(255,255,255,0.45)",
            }}
          >
            VERIFIABLE ON-CHAIN ·
          </div>
          <div
            style={{
              display: "flex",
              padding: `${s(8)}px ${s(20)}px`,
              borderRadius: s(10),
              background: "rgba(163,230,53,0.06)",
              border: `1px solid ${LIME}55`,
              fontFamily: "monospace",
              fontSize: s(18),
              fontWeight: 700,
              color: LIME,
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
            <span style={{ display: "flex" }}>Not just on Igra — with Igra</span>
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
