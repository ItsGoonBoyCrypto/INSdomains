import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
const AMBER = "#fbbf24";

/**
 * GET /api/marketplace-filters-image?size=hd|qhd|4k
 *
 * "Marketplace filters shipped" promo — shows a mocked filter bar with
 * sample active filters + 3 sample result cards below so the upgrade is
 * visible at a glance.
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
    [10, 18, 14, 45, 0.45], [22, 78, 11, 30, 0.4], [40, 12, 13, 45, 0.4],
    [62, 86, 9, 20, 0.35], [78, 26, 18, 45, 0.45], [88, 70, 12, 30, 0.4],
    [70, 50, 8, 45, 0.5], [35, 88, 10, 20, 0.3], [92, 14, 9, 45, 0.4],
  ];

  // Sample "result cards" the filter would surface — 3 short premium-tier names.
  const RESULTS: { name: string; suffix: string; tier: string; tierColor: string; price: string }[] = [
    { name: "vip",  suffix: ".igra", tier: "RARE",    tierColor: AMBER,  price: "1,200" },
    { name: "gm",   suffix: ".igra", tier: "PREMIUM", tierColor: PLUM,   price: "2,000" },
    { name: "btc",  suffix: ".igra", tier: "RARE",    tierColor: AMBER,  price: "1,200" },
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
          backgroundImage: `radial-gradient(${s(900)}px ${s(680)}px at 50% 30%, rgba(0,240,255,0.26), transparent 64%), radial-gradient(${s(900)}px ${s(760)}px at 100% 100%, rgba(168,85,247,0.32), transparent 66%), radial-gradient(${s(760)}px ${s(640)}px at 0% 100%, rgba(0,240,255,0.16), transparent 64%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.66) 100%)`,
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
              🔧 NEW · MARKETPLACE
            </div>
          </div>

          {/* hero */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: s(34) }}>
            <div style={{ display: "flex", fontSize: s(30), fontWeight: 800, letterSpacing: s(7), color: "rgba(255,255,255,0.58)" }}>MARKETPLACE FILTERS · LIVE</div>
            <div style={{ display: "flex", fontSize: s(150), fontWeight: 900, letterSpacing: s(-4), lineHeight: 1.0, marginTop: s(6), backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`, backgroundClip: "text", color: "transparent" }}>
              Find it faster
            </div>
            <div style={{ display: "flex", fontSize: s(26), fontWeight: 600, color: "rgba(255,255,255,0.6)", marginTop: s(8), letterSpacing: s(1) }}>
              Search · Length tier · Price range · Sort
            </div>
          </div>

          {/* mocked filter bar */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            marginTop: s(30),
            padding: s(14),
            borderRadius: s(18),
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.10)",
            gap: s(10),
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: s(10) }}>
              {/* Search */}
              <div style={{ display: "flex", flex: 1.6, alignItems: "center", gap: s(10), padding: `${s(12)}px ${s(16)}px`, borderRadius: s(12), background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.10)", fontSize: s(22), color: "#fff" }}>
                <span style={{ display: "flex", color: CYAN, fontSize: s(22) }}>🔍</span>
                <span style={{ display: "flex" }}>vip</span>
              </div>
              {/* Length tier chip */}
              <div style={{ display: "flex", alignItems: "center", padding: `${s(12)}px ${s(16)}px`, borderRadius: s(12), background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.10)", fontSize: s(20), color: "#fff", fontWeight: 600 }}>
                3-char Rare ▾
              </div>
              {/* Price range */}
              <div style={{ display: "flex", alignItems: "center", gap: s(6), padding: `${s(12)}px ${s(16)}px`, borderRadius: s(12), background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.10)", fontSize: s(20), color: "#fff", fontWeight: 600 }}>
                <span style={{ display: "flex" }}>100</span>
                <span style={{ display: "flex", color: "rgba(255,255,255,0.4)" }}>–</span>
                <span style={{ display: "flex" }}>5,000</span>
                <span style={{ display: "flex", color: "rgba(255,255,255,0.45)", fontSize: s(16), marginLeft: s(4) }}>iKAS</span>
              </div>
              {/* Sort */}
              <div style={{ display: "flex", alignItems: "center", padding: `${s(12)}px ${s(16)}px`, borderRadius: s(12), background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.10)", fontSize: s(20), color: "#fff", fontWeight: 600 }}>
                Price ↑ ▾
              </div>
            </div>
            <div style={{ display: "flex", fontSize: s(16), color: "rgba(255,255,255,0.55)", letterSpacing: s(1) }}>
              Showing <span style={{ display: "flex", color: "#fff", margin: `0 ${s(5)}px`, fontWeight: 700 }}>8</span> of 47
            </div>
          </div>

          {/* sample result cards */}
          <div style={{ display: "flex", gap: s(14), marginTop: s(18) }}>
            {RESULTS.map((r, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: `${s(18)}px ${s(20)}px`,
                borderRadius: s(18),
                background: "linear-gradient(135deg, rgba(0,240,255,0.05) 0%, rgba(168,85,247,0.05) 100%)",
                border: "1px solid rgba(255,255,255,0.10)",
                gap: s(8),
                boxShadow: `0 ${s(20)}px ${s(40)}px rgba(0,0,0,0.35)`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", padding: `${s(4)}px ${s(10)}px`, borderRadius: 999, background: `${r.tierColor}22`, border: `1px solid ${r.tierColor}55`, fontSize: s(13), fontWeight: 800, letterSpacing: s(1), color: r.tierColor }}>
                    {r.tier}
                  </div>
                  <div style={{ display: "flex", fontSize: s(13), color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>★ FEATURED</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", marginTop: s(6) }}>
                  <div style={{
                    display: "flex",
                    fontSize: s(56),
                    fontWeight: 900,
                    letterSpacing: s(-1),
                    backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                    backgroundClip: "text",
                    color: "transparent",
                  }}>
                    {r.name}
                  </div>
                  <div style={{ display: "flex", fontSize: s(34), fontWeight: 700, color: PLUM }}>{r.suffix}</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: s(6), marginTop: s(4) }}>
                  <div style={{ display: "flex", fontSize: s(28), fontWeight: 900, color: "#fff" }}>{r.price}</div>
                  <div style={{ display: "flex", fontSize: s(16), color: "rgba(255,255,255,0.5)" }}>iKAS</div>
                </div>
              </div>
            ))}
          </div>

          {/* spacer + footer */}
          <div style={{ display: "flex", flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: s(18), borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>insdomains.org/marketplace</div>
            <div style={{ display: "flex", gap: s(18), fontSize: s(20), fontWeight: 700, letterSpacing: s(2), color: "rgba(255,255,255,0.55)" }}>
              <div style={{ display: "flex" }}>@IgraNameService</div>
              <div style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</div>
              <div style={{ display: "flex" }}>Live on Igra L2</div>
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
