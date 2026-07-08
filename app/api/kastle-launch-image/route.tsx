import { ImageResponse } from "next/og";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
// Kastle brand palette, sampled from their in-app UI (cyan buttons + name cards)
const KASTLE_CYAN = "#00d4ff";
const KASTLE_CYAN_SOFT = "#4ce0ff";
const KASTLE_NAVY = "#0d1929";
const KASTLE_NAVY_DEEP = "#08111c";

/**
 * GET /api/kastle-launch-image?size=hd|qhd|4k
 *
 * Prep card for the Kastle native .igra integration launch tweet.
 * Kastle is mobile-first and Kaspa-native — the mock UI here uses
 * their real brand cyan (#00d4ff) + dark navy (#0d1929) sampled from
 * their in-app screenshots + their live logo asset from public/.
 *
 *   hd  1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

// Inline Kastle's logo as a data URL so ImageResponse doesn't network-fetch
function logoDataUrl(filename: string, mime: string): string {
  const p = path.join(process.cwd(), "public", "wallet-logos", filename);
  return `data:${mime};base64,${fs.readFileSync(p).toString("base64")}`;
}
const KASTLE_LOGO = logoDataUrl("kastle.png", "image/png");

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

  const SPARKS: [number, number, number, number, number][] = [
    [8, 16, 14, 45, 0.45], [22, 78, 11, 30, 0.4], [38, 10, 13, 45, 0.4],
    [60, 88, 9, 20, 0.35], [78, 24, 18, 45, 0.45], [88, 70, 12, 30, 0.4],
    [70, 50, 8, 45, 0.5], [33, 86, 10, 20, 0.3], [93, 14, 9, 45, 0.4],
    [5, 52, 9, 45, 0.35], [16, 38, 7, 20, 0.3], [50, 18, 6, 45, 0.3],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(${s(900)}px ${s(680)}px at 50% 30%, rgba(0,212,255,0.26), transparent 64%), radial-gradient(${s(950)}px ${s(780)}px at 100% 100%, rgba(168,85,247,0.30), transparent 66%), radial-gradient(${s(760)}px ${s(640)}px at 0% 100%, rgba(0,240,255,0.14), transparent 64%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.66) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
        }}
      >
        {/* sparkles — teal / cyan / plum */}
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
              background: i % 3 === 0 ? CYAN : i % 3 === 1 ? KASTLE_CYAN : PLUM,
              opacity: op,
              boxShadow: `0 0 ${s(18)}px ${i % 3 === 0 ? CYAN : i % 3 === 1 ? KASTLE_CYAN : PLUM}`,
            }}
          />
        ))}

        {/* content */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: `${s(54)}px ${s(80)}px` }}>
          {/* top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: s(18) }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: s(62),
                  height: s(62),
                  borderRadius: s(17),
                  background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                  color: "#000",
                  fontSize: s(40),
                  fontWeight: 900,
                  boxShadow: `0 0 ${s(40)}px rgba(0,240,255,0.5)`,
                }}
              >
                i
              </div>
              <div style={{ display: "flex", fontSize: s(26), fontWeight: 800, letterSpacing: s(6), color: "rgba(255,255,255,0.72)" }}>
                IGRA NAME SERVICE
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: s(12),
                padding: `${s(10)}px ${s(24)}px`,
                borderRadius: 999,
                border: `1px solid ${EMERALD}66`,
                background: `${EMERALD}1c`,
                fontSize: s(22),
                fontWeight: 900,
                letterSpacing: s(5),
                color: "#bbf7d0",
                boxShadow: `0 0 ${s(40)}px ${EMERALD}55`,
              }}
            >
              🚀 SHIPPED · NATIVE IN KASTLE
            </div>
          </div>

          {/* hero */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: s(28) }}>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, letterSpacing: s(8), color: "rgba(255,255,255,0.58)" }}>
              NATIVE .IGRA RESOLUTION
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(140),
                fontWeight: 900,
                letterSpacing: s(-4),
                lineHeight: 1.0,
                marginTop: s(6),
                backgroundImage: `linear-gradient(110deg, ${KASTLE_CYAN} 0%, ${KASTLE_CYAN_SOFT} 45%, ${PLUM} 100%)`,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              INS × Kastle
            </div>
            <div style={{ display: "flex", fontSize: s(26), fontWeight: 600, color: "rgba(255,255,255,0.66)", marginTop: s(8), letterSpacing: s(1) }}>
              Type a name → resolves in Kastle. Mobile-native. First-class .igra tab.
            </div>
          </div>

          {/* Kastle Send mockup — mobile app styled */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: s(28),
              padding: s(22),
              borderRadius: s(22),
              background: `linear-gradient(180deg, ${KASTLE_NAVY} 0%, ${KASTLE_NAVY_DEEP} 100%)`,
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: `0 ${s(30)}px ${s(60)}px rgba(0,0,0,0.5), 0 0 ${s(80)}px rgba(0,212,255,0.12)`,
              gap: s(14),
            }}
          >
            {/* mock window header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: s(10), borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: s(10) }}>
                <div
                  style={{
                    display: "flex",
                    width: s(34),
                    height: s(34),
                    borderRadius: s(9),
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.04)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={KASTLE_LOGO}
                    alt="Kastle"
                    width={s(34)}
                    height={s(34)}
                    style={{ display: "block", objectFit: "cover" }}
                  />
                </div>
                <div style={{ display: "flex", fontSize: s(20), fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>Kastle</div>
                <div style={{ display: "flex", padding: `${s(3)}px ${s(10)}px`, borderRadius: 999, background: `${KASTLE_CYAN}22`, border: `1px solid ${KASTLE_CYAN}66`, fontSize: s(13), fontWeight: 700, color: KASTLE_CYAN_SOFT, marginLeft: s(8) }}>Igra L2</div>
              </div>
              <div style={{ display: "flex", fontSize: s(15), fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: s(2) }}>SEND TO</div>
            </div>

            {/* recipient field */}
            <div style={{ display: "flex", flexDirection: "column", gap: s(8) }}>
              <div style={{ display: "flex", fontSize: s(15), color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>To</div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: s(12),
                padding: `${s(16)}px ${s(20)}px`,
                borderRadius: s(14),
                background: "rgba(0,0,0,0.4)",
                border: `2px solid ${KASTLE_CYAN}88`,
                boxShadow: `0 0 ${s(30)}px rgba(0,212,255,0.20) inset`,
                fontSize: s(36),
                fontFamily: "monospace",
                color: "#fff",
                fontWeight: 700,
              }}>
                <span style={{ display: "flex", color: KASTLE_CYAN_SOFT }}>|</span>
                <span style={{ display: "flex" }}>kastlewallet.</span>
                <span style={{ display: "flex", color: PLUM }}>igra</span>
                <span
                  style={{
                    display: "flex",
                    marginLeft: "auto",
                    padding: `${s(3)}px ${s(10)}px`,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    fontFamily: "sans-serif",
                    fontSize: s(13),
                    fontWeight: 700,
                    letterSpacing: s(2),
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  INS
                </span>
              </div>
            </div>

            {/* resolution result — real address from Liam's Kastle screenshot */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              padding: `${s(14)}px ${s(20)}px`,
              borderRadius: s(14),
              background: "linear-gradient(120deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.04) 100%)",
              border: `1px solid ${EMERALD}66`,
              gap: s(6),
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: s(10) }}>
                <div style={{ display: "flex", width: s(18), height: s(18), borderRadius: 999, background: EMERALD, boxShadow: `0 0 ${s(14)}px ${EMERALD}` }} />
                <div style={{ display: "flex", fontSize: s(15), fontWeight: 800, color: "#86efac", letterSpacing: s(2) }}>RESOLVED VIA INS · IGRA L2 · V2</div>
              </div>
              <div style={{ display: "flex", fontSize: s(26), fontFamily: "monospace", color: "rgba(255,255,255,0.92)", fontWeight: 600, marginTop: s(2) }}>
                0x151e641337…f91634a06BA
              </div>
            </div>
          </div>

          {/* spacer */}
          <div style={{ display: "flex", flex: 1 }} />

          {/* attribution / thanks */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: s(18), gap: s(18) }}>
            <div style={{ display: "flex", fontSize: s(20), fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: s(2) }}>
              INS RESOLUTION · WIRED BY
            </div>
            <div style={{
              display: "flex",
              padding: `${s(12)}px ${s(22)}px`,
              borderRadius: s(12),
              background: `${KASTLE_CYAN}22`,
              border: `1px solid ${KASTLE_CYAN}66`,
              fontSize: s(26),
              fontWeight: 900,
              color: KASTLE_CYAN_SOFT,
              letterSpacing: s(1),
              boxShadow: `0 0 ${s(30)}px rgba(0,212,255,0.20)`,
            }}>
              @KastleWallet
            </div>
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: s(20), marginTop: s(18), borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>insdomains.org</div>
            <div style={{ display: "flex", gap: s(18), fontSize: s(20), fontWeight: 700, letterSpacing: s(2), color: "rgba(255,255,255,0.55)" }}>
              <div style={{ display: "flex" }}>@IgraNameService</div>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</div>
              <div style={{ display: "flex" }}>Native on Igra L2</div>
            </div>
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
