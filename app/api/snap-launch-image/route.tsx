import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
const FOX = "#f6851b"; // MetaMask fox orange

/**
 * GET /api/snap-launch-image?size=hd|qhd|4k
 *
 * "INS Snap is LIVE" launch promo — mocked MetaMask Send screen showing
 * `alice.igra` resolving natively to a wallet address, with snap install
 * badge underneath. The "look ma, no extension" moment.
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
          backgroundImage: `radial-gradient(${s(900)}px ${s(680)}px at 50% 30%, rgba(0,240,255,0.28), transparent 64%), radial-gradient(${s(950)}px ${s(780)}px at 100% 100%, rgba(168,85,247,0.34), transparent 66%), radial-gradient(${s(760)}px ${s(640)}px at 0% 100%, rgba(0,240,255,0.16), transparent 64%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.66) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
        }}
      >
        {/* sparkles */}
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
              boxShadow: `0 0 ${s(18)}px ${i % 2 === 0 ? CYAN : PLUM}`,
            }}
          />
        ))}

        {/* content */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: `${s(54)}px ${s(80)}px` }}>
          {/* top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: s(18) }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: s(62), height: s(62), borderRadius: s(17), background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`, color: "#000", fontSize: s(40), fontWeight: 900, boxShadow: `0 0 ${s(40)}px rgba(0,240,255,0.5)` }}>i</div>
              <div style={{ display: "flex", fontSize: s(26), fontWeight: 800, letterSpacing: s(6), color: "rgba(255,255,255,0.72)" }}>IGRA NAME SERVICE</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: s(12), padding: `${s(10)}px ${s(24)}px`, borderRadius: 999, border: `1px solid ${EMERALD}66`, background: `${EMERALD}1c`, fontSize: s(22), fontWeight: 900, letterSpacing: s(5), color: "#bbf7d0", boxShadow: `0 0 ${s(40)}px ${EMERALD}55` }}>
              🚀 SHIPPED · METAMASK SNAP
            </div>
          </div>

          {/* hero */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: s(28) }}>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, letterSpacing: s(8), color: "rgba(255,255,255,0.58)" }}>
              NATIVE .IGRA RESOLUTION
            </div>
            <div style={{ display: "flex", fontSize: s(140), fontWeight: 900, letterSpacing: s(-4), lineHeight: 1.0, marginTop: s(6), backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`, backgroundClip: "text", color: "transparent" }}>
              INS Snap is LIVE
            </div>
            <div style={{ display: "flex", fontSize: s(26), fontWeight: 600, color: "rgba(255,255,255,0.66)", marginTop: s(8), letterSpacing: s(1) }}>
              Type a name → resolves in MetaMask. No copy-paste. No extension switching.
            </div>
          </div>

          {/* MetaMask Send mockup */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            marginTop: s(28),
            padding: s(22),
            borderRadius: s(22),
            background: "linear-gradient(180deg, #1a1a2e 0%, #14141f 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: `0 ${s(30)}px ${s(60)}px rgba(0,0,0,0.5), 0 0 ${s(80)}px rgba(0,240,255,0.08)`,
            gap: s(14),
          }}>
            {/* mock window header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: s(10), borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: s(10) }}>
                <div style={{ display: "flex", width: s(34), height: s(34), borderRadius: s(8), background: FOX, alignItems: "center", justifyContent: "center", fontSize: s(20) }}>🦊</div>
                <div style={{ display: "flex", fontSize: s(20), fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>MetaMask Flask</div>
                <div style={{ display: "flex", padding: `${s(3)}px ${s(10)}px`, borderRadius: 999, background: "rgba(98,179,253,0.18)", border: "1px solid rgba(98,179,253,0.4)", fontSize: s(13), fontWeight: 700, color: "#93c5fd", marginLeft: s(8) }}>Ethereum Mainnet</div>
              </div>
              <div style={{ display: "flex", fontSize: s(15), fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: s(2) }}>SEND</div>
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
                border: `2px solid ${CYAN}88`,
                boxShadow: `0 0 ${s(30)}px rgba(0,240,255,0.18) inset`,
                fontSize: s(36),
                fontFamily: "monospace",
                color: "#fff",
                fontWeight: 700,
              }}>
                <span style={{ display: "flex", color: CYAN }}>|</span>
                <span style={{ display: "flex" }}>igranetwork.</span>
                <span style={{ display: "flex", color: PLUM }}>igra</span>
              </div>
            </div>

            {/* resolution result — what the snap returns */}
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
                <div style={{ display: "flex", fontSize: s(15), fontWeight: 800, color: "#86efac", letterSpacing: s(2) }}>RESOLVED VIA INS · IGRA L2</div>
              </div>
              <div style={{ display: "flex", fontSize: s(26), fontFamily: "monospace", color: "rgba(255,255,255,0.92)", fontWeight: 600, marginTop: s(2) }}>
                0x7447F0e5...07aA1
              </div>
            </div>
          </div>

          {/* spacer */}
          <div style={{ display: "flex", flex: 1 }} />

          {/* install badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: s(18), gap: s(18) }}>
            <div style={{ display: "flex", fontSize: s(20), fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: s(2) }}>
              INSTALL · SNAP ID
            </div>
            <div style={{
              display: "flex",
              padding: `${s(12)}px ${s(22)}px`,
              borderRadius: s(12),
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.14)",
              fontFamily: "monospace",
              fontSize: s(26),
              fontWeight: 800,
              color: CYAN,
              letterSpacing: s(1),
            }}>
              npm:ins-snap-resolver
            </div>
          </div>

          {/* footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: s(20), marginTop: s(18), borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>insdomains.org</div>
            <div style={{ display: "flex", gap: s(18), fontSize: s(20), fontWeight: 700, letterSpacing: s(2), color: "rgba(255,255,255,0.55)" }}>
              <div style={{ display: "flex" }}>@IgraNameService</div>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</div>
              <div style={{ display: "flex" }}>Built on Igra L2</div>
            </div>
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
