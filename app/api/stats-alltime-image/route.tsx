import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/stats-alltime-image?size=hd|qhd|4k
 *
 * All-time stats card — big-number gallery. Different visual hierarchy
 * from the tick-list "SHIPPED" cards (which use pillar labels + rows
 * of checkmarks): this one leads with SIX BIG NUMBERS in a 3x2 grid,
 * so the takeaway from a thumbnail glance is the numbers themselves,
 * not the categories.
 *
 * Numbers are hard-coded from the live chain state at commit time —
 * update these before firing the tweet if the batch is > 24h stale.
 *
 *   hd  1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd:   { w: 1920, h: 1080, scale: 1.0 },
  qhd:  { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

type StatTile = {
  big: string;         // the hero number
  bigSub?: string;     // small suffix next to the number (e.g. '/356' or 'k')
  label: string;       // uppercase category label
  detail: string;      // one-line context under the label
};

const TILES: StatTile[] = [
  { big: "321",     label: "NAMES REGISTERED",    detail: "307 on V2 · 14 grandfathered from V1" },
  { big: "66",      label: "UNIQUE HOLDERS",      detail: "distinct wallets that minted .igra" },
  { big: "42",      label: "ACTIVE LISTINGS",     detail: "live on the INS marketplace" },
  { big: "28.9",    bigSub: "k iKAS", label: "TREASURY ACCRUED", detail: "safe balance + V2 pending withdrawal" },
  { big: "6",       label: "WALLET INTEGRATIONS", detail: "MetaMask (LIVE) + 5 Kaspa-native rolling" },
  { big: "356",     bigSub: "/356", label: "FOUNDRY TESTS",  detail: "0 fail · 5 verified contracts on chain" },
];

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
          backgroundImage: `radial-gradient(${s(1200)}px ${s(880)}px at 50% 30%, rgba(0,240,255,0.28), transparent 66%), radial-gradient(${s(900)}px ${s(760)}px at 88% 96%, rgba(168,85,247,0.30), transparent 64%), radial-gradient(${s(820)}px ${s(700)}px at 4% 4%, rgba(52,211,153,0.16), transparent 62%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(48)}px ${s(72)}px ${s(42)}px ${s(72)}px`,
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
            STATE OF INS · ALL-TIME
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: s(26),
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: s(24),
              fontWeight: 800,
              letterSpacing: s(8),
              color: "rgba(255,255,255,0.7)",
            }}
          >
            SINCE LAUNCH
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(96),
              fontWeight: 900,
              letterSpacing: s(-2),
              lineHeight: 1,
              marginTop: s(4),
              backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 60%, #ff5fa2 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            .igra by the numbers
          </div>
        </div>

        {/* 3x2 big-number grid */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: s(14),
            marginTop: s(28),
          }}
        >
          {TILES.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                width: s(540),
                height: s(260),
                padding: `${s(24)}px ${s(28)}px`,
                borderRadius: s(20),
                border: "1px solid rgba(255,255,255,0.10)",
                background: "linear-gradient(155deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: s(6),
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: s(112),
                    fontWeight: 900,
                    letterSpacing: s(-4),
                    lineHeight: 1,
                    backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
                    backgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  {t.big}
                </div>
                {t.bigSub && (
                  <div
                    style={{
                      display: "flex",
                      fontSize: s(38),
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {t.bigSub}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: s(4) }}>
                <div
                  style={{
                    display: "flex",
                    fontSize: s(16),
                    fontWeight: 800,
                    letterSpacing: s(3),
                    color: CYAN,
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: s(16),
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {t.detail}
                </div>
              </div>
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
        "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
