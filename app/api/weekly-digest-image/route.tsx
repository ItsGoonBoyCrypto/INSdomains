import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/weekly-digest-image?size=hd|qhd|4k&mints=108&emoji=3&ascii=105&buyers=24&total=285&week=2026-06-24
 *
 * Code-rendered weekly recap card — meant to be screenshotted/dragged into
 * tweets when the week was a good one. All numbers come in via query params
 * so the same route serves every future week (the weekly-ins-digest.sh
 * script can curl it with up-to-date values).
 *
 * Sizes match the rest of the promo set:
 *   hd (default) 1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd:   { w: 1920, h: 1080, scale: 1.0 },
  qhd:  { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

const SPARKS: [number, number, number, number, number][] = [
  [5, 8, 14, 45, 0.4], [94, 10, 12, 30, 0.35],
  [92, 92, 16, 45, 0.45], [4, 88, 11, 20, 0.35],
  [24, 32, 9, 45, 0.3], [78, 68, 10, 30, 0.3],
  [44, 14, 8, 45, 0.25], [62, 86, 9, 20, 0.3],
  [14, 62, 7, 45, 0.3], [86, 32, 8, 20, 0.3],
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  // Pull stats from URL; defaults match current digest run so /api/weekly-digest-image
  // with no params renders the live week 1 numbers.
  const mints   = parseInt(url.searchParams.get("mints")   ?? "108", 10);
  const emoji   = parseInt(url.searchParams.get("emoji")   ?? "3",   10);
  const ascii   = parseInt(url.searchParams.get("ascii")   ?? "105", 10);
  const buyers  = parseInt(url.searchParams.get("buyers")  ?? "24",  10);
  const total   = parseInt(url.searchParams.get("total")   ?? "285", 10);
  const week    =          url.searchParams.get("week")    ?? "2026-06-24";

  // Friendly per-buyer average
  const perBuyer = buyers > 0 ? (mints / buyers).toFixed(1) : "—";
  const emojiPct = mints > 0 ? Math.round((emoji / mints) * 100) : 0;

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
          backgroundImage: `radial-gradient(${s(1100)}px ${s(820)}px at 50% 38%, rgba(0,240,255,0.26), transparent 66%), radial-gradient(${s(900)}px ${s(760)}px at 88% 96%, rgba(168,85,247,0.32), transparent 64%), radial-gradient(${s(820)}px ${s(700)}px at 4% 4%, rgba(52,211,153,0.16), transparent 62%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(56)}px ${s(80)}px`,
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

        {/* Top row: brand + week date pill */}
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
              border: `1px solid ${CYAN}55`,
              background: `${CYAN}14`,
              fontSize: s(20),
              fontWeight: 800,
              letterSpacing: s(4),
              color: "#a8eff5",
              boxShadow: `0 0 ${s(30)}px rgba(0,240,255,0.25)`,
            }}
          >
            WEEKLY · {week}
          </div>
        </div>

        {/* Hero — big mint number */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: s(60),
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
            NEW MINTS THIS WEEK
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(240),
              fontWeight: 900,
              letterSpacing: s(-8),
              lineHeight: 1,
              marginTop: s(8),
              backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 60%, #ff5fa2 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            {mints.toLocaleString()}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontSize: s(28),
              fontWeight: 700,
              color: "rgba(255,255,255,0.6)",
              marginTop: s(6),
              gap: s(8),
            }}
          >
            <span style={{ display: "flex" }}>by</span>
            <span style={{ display: "flex", color: EMERALD, fontWeight: 900 }}>{buyers}</span>
            <span style={{ display: "flex" }}>unique buyers</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
            <span style={{ display: "flex" }}>avg</span>
            <span style={{ display: "flex", color: "#fff", fontWeight: 900 }}>{perBuyer}</span>
            <span style={{ display: "flex" }}>names each</span>
          </div>
        </div>

        {/* Two side-by-side cards: emoji + ascii */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: s(28),
            marginTop: s(60),
          }}
        >
          {/* Emoji card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: `${s(28)}px ${s(40)}px`,
              borderRadius: s(24),
              background: "linear-gradient(155deg, rgba(168,85,247,0.16) 0%, rgba(168,85,247,0.04) 100%)",
              border: `1px solid ${PLUM}44`,
              boxShadow: `0 0 ${s(40)}px rgba(168,85,247,0.20)`,
              minWidth: s(330),
            }}
          >
            <div style={{ display: "flex", fontSize: s(60) }}>🔥</div>
            <div
              style={{
                display: "flex",
                fontSize: s(92),
                fontWeight: 900,
                letterSpacing: s(-2),
                color: "#fff",
                marginTop: s(4),
                lineHeight: 1,
              }}
            >
              {emoji}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(20),
                fontWeight: 700,
                letterSpacing: s(3),
                color: PLUM,
                marginTop: s(6),
              }}
            >
              EMOJI MINTS
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(15),
                color: "rgba(255,255,255,0.45)",
                marginTop: s(3),
              }}
            >
              {emojiPct}% of the week
            </div>
          </div>

          {/* ASCII card */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: `${s(28)}px ${s(40)}px`,
              borderRadius: s(24),
              background: "linear-gradient(155deg, rgba(0,240,255,0.16) 0%, rgba(0,240,255,0.04) 100%)",
              border: `1px solid ${CYAN}44`,
              boxShadow: `0 0 ${s(40)}px rgba(0,240,255,0.20)`,
              minWidth: s(330),
            }}
          >
            <div style={{ display: "flex", fontSize: s(60) }}>📝</div>
            <div
              style={{
                display: "flex",
                fontSize: s(92),
                fontWeight: 900,
                letterSpacing: s(-2),
                color: "#fff",
                marginTop: s(4),
                lineHeight: 1,
              }}
            >
              {ascii}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(20),
                fontWeight: 700,
                letterSpacing: s(3),
                color: CYAN,
                marginTop: s(6),
              }}
            >
              ASCII MINTS
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(15),
                color: "rgba(255,255,255,0.45)",
                marginTop: s(3),
              }}
            >
              {100 - emojiPct}% of the week
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* Footer strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: s(20),
            borderTop: "1px solid rgba(255,255,255,0.08)",
            fontSize: s(20),
            fontWeight: 700,
            letterSpacing: s(2),
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: s(20) }}>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.85)" }}>insdomains.org</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.25)" }}>·</span>
            <span style={{ display: "flex" }}>{total.toLocaleString()} TOTAL .IGRA NAMES</span>
          </div>
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
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        "Content-Type": "image/png",
      },
    },
  );
}
