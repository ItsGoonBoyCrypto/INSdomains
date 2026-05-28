import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/dao-split-image?size=hd|qhd|4k
 *
 * "20% to the Igra DAO" ecosystem-split promo. Pairs the INS gradient mark
 * with the actual Igra Labs wordmark (loaded from /public/partner-logos/),
 * shows the 80/20 split as the hero visual, and leans into the
 * "function call, not a promise" line.
 */

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd: { w: 1920, h: 1080, scale: 1.0 },
  qhd: { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

const IGRA_LOGO_URL = "https://insdomains.org/partner-logos/igra-labs.svg";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  const SPARKS: [number, number, number, number, number][] = [
    [10, 16, 14, 45, 0.45], [22, 78, 11, 30, 0.4], [40, 12, 13, 45, 0.4],
    [62, 86, 9, 20, 0.35], [78, 26, 18, 45, 0.45], [88, 70, 12, 30, 0.4],
    [70, 50, 8, 45, 0.5], [35, 88, 10, 20, 0.3], [92, 14, 9, 45, 0.4],
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
            <div style={{ display: "flex", alignItems: "center", gap: s(12), padding: `${s(10)}px ${s(24)}px`, borderRadius: 999, border: `1px solid ${PLUM}77`, background: `${PLUM}22`, fontSize: s(22), fontWeight: 900, letterSpacing: s(5), color: "#f3e8ff", boxShadow: `0 0 ${s(40)}px ${PLUM}55` }}>
              🟣 ECOSYSTEM SPLIT
            </div>
          </div>

          {/* hero: eyebrow + 20% + subtitle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: s(28) }}>
            <div style={{ display: "flex", fontSize: s(30), fontWeight: 800, letterSpacing: s(7), color: "rgba(255,255,255,0.6)" }}>EVERY .IGRA REGISTRATION</div>
            <div style={{ display: "flex", fontSize: s(240), fontWeight: 900, letterSpacing: s(-8), lineHeight: 1.0, marginTop: s(-2), backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`, backgroundClip: "text", color: "transparent" }}>20%</div>
            <div style={{ display: "flex", fontSize: s(36), fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: s(6) }}>flows to the Igra DAO</div>
          </div>

          {/* 80/20 split bar — INS Treasury (cyan) ← 80% · 20% → Igra DAO (plum) */}
          <div style={{ display: "flex", flexDirection: "column", marginTop: s(34), gap: s(10) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: s(18), fontWeight: 800, letterSpacing: s(3), color: "rgba(255,255,255,0.5)" }}>
              <div style={{ display: "flex" }}>INS TREASURY</div>
              <div style={{ display: "flex" }}>IGRA DAO</div>
            </div>
            <div style={{ display: "flex", width: "100%", height: s(56), borderRadius: s(16), overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)" }}>
              <div style={{ display: "flex", alignItems: "center", paddingLeft: s(20), flex: 4, height: "100%", backgroundImage: `linear-gradient(90deg, ${CYAN} 0%, rgba(0,240,255,0.55) 100%)`, color: "#000", fontSize: s(26), fontWeight: 900, letterSpacing: s(2) }}>
                80%
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: s(20), flex: 1, height: "100%", backgroundImage: `linear-gradient(90deg, rgba(168,85,247,0.55) 0%, ${PLUM} 100%)`, color: "#000", fontSize: s(26), fontWeight: 900, letterSpacing: s(2) }}>
                20%
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: s(8) }}>
              {/* INS Treasury logo + label */}
              <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: s(44), height: s(44), borderRadius: s(12), background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`, color: "#000", fontSize: s(28), fontWeight: 900, boxShadow: `0 0 ${s(20)}px ${CYAN}66` }}>i</div>
                <div style={{ display: "flex", fontSize: s(20), fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>INS Treasury (Safe multisig)</div>
              </div>
              {/* Igra DAO logo + label */}
              <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
                <div style={{ display: "flex", fontSize: s(20), fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Igra DAO</div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={IGRA_LOGO_URL} alt="Igra" width={s(120)} height={s(36)} style={{ filter: "drop-shadow(0 0 12px rgba(168,85,247,0.6))" }} />
              </div>
            </div>
          </div>

          {/* tagline */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: s(28) }}>
            <div style={{ display: "flex", fontSize: s(34), fontWeight: 800, color: "rgba(255,255,255,0.92)", letterSpacing: s(-1) }}>A function call. Not a promise.</div>
            <div style={{ display: "flex", fontSize: s(20), fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: s(6) }}>Most name services keep 100%. We built INS to fund the ecosystem it lives in.</div>
          </div>

          {/* chips */}
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: s(14) }}>
              <div style={{ display: "flex", gap: s(12), justifyContent: "center" }}>
                {[
                  { t: "On-chain", c: CYAN },
                  { t: "Automatic", c: EMERALD },
                  { t: "Forever", c: PLUM },
                  { t: "Audited · 356 tests", c: "#fbbf24" },
                ].map((chip, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: s(8), padding: `${s(10)}px ${s(20)}px`, borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", fontSize: s(20), fontWeight: 800, color: "#fff" }}>
                    <div style={{ display: "flex", width: s(10), height: s(10), borderRadius: 999, background: chip.c, boxShadow: `0 0 ${s(14)}px ${chip.c}` }} />
                    {chip.t}
                  </div>
                ))}
              </div>

              {/* footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: s(18), borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", fontSize: s(32), fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>insdomains.org</div>
                <div style={{ display: "flex", gap: s(18), fontSize: s(20), fontWeight: 700, letterSpacing: s(2), color: "rgba(255,255,255,0.55)" }}>
                  <div style={{ display: "flex" }}>@IgraNameService</div>
                  <div style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</div>
                  <div style={{ display: "flex" }}>Live on Igra L2</div>
                </div>
              </div>
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
