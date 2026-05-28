import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";

/**
 * GET /api/explainer-image?size=hd|qhd|4k
 *
 * "What is INS?" before/after — the ugly 0x address transforming into a clean
 * `.igra` name. Mirrors the post copy ("your wallet shouldn't look like this →
 * it should look like this") so the visual tells the same story instantly.
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
    [62, 86, 9, 20, 0.35], [78, 26, 18, 45, 0.45], [88, 72, 12, 30, 0.4],
    [68, 50, 8, 45, 0.5], [35, 88, 10, 20, 0.3], [92, 14, 9, 45, 0.4],
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
          backgroundImage: `radial-gradient(${s(900)}px ${s(680)}px at 50% 70%, rgba(0,240,255,0.28), transparent 64%), radial-gradient(${s(900)}px ${s(760)}px at 100% 100%, rgba(168,85,247,0.32), transparent 66%), radial-gradient(${s(760)}px ${s(640)}px at 0% 100%, rgba(0,240,255,0.16), transparent 64%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.66) 100%)`,
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
              🟣 NAME YOUR WALLET
            </div>
          </div>

          {/* eyebrow 1 */}
          <div style={{ display: "flex", marginTop: s(36), fontSize: s(26), fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: s(1) }}>
            Your wallet address shouldn&apos;t look like this:
          </div>

          {/* UGLY address card */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: s(12),
            padding: `${s(26)}px ${s(36)}px`,
            borderRadius: s(18),
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.18)",
            fontFamily: "monospace",
            fontSize: s(34),
            fontWeight: 600,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: s(1),
          }}>
            0xC08a7a5C717012503017c6f5ac73fF9339dB12b1
          </div>

          {/* arrow */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: s(8), marginBottom: s(4) }}>
            <div style={{
              display: "flex",
              fontSize: s(72),
              fontWeight: 900,
              lineHeight: 1,
              backgroundImage: `linear-gradient(180deg, ${CYAN} 0%, ${PLUM} 100%)`,
              backgroundClip: "text",
              color: "transparent",
              filter: `drop-shadow(0 0 ${s(20)}px rgba(168,85,247,0.6))`,
            }}>↓</div>
          </div>

          {/* eyebrow 2 */}
          <div style={{ display: "flex", fontSize: s(26), fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: s(1) }}>
            It should look like this:
          </div>

          {/* PRETTY name card */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: s(12),
            padding: `${s(40)}px ${s(36)}px`,
            borderRadius: s(28),
            background: "linear-gradient(135deg, rgba(0,240,255,0.06) 0%, rgba(168,85,247,0.06) 100%)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: `0 0 ${s(120)}px rgba(0,240,255,0.18), 0 0 ${s(160)}px rgba(168,85,247,0.16), inset 0 0 ${s(40)}px rgba(255,255,255,0.02)`,
          }}>
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <div style={{
                display: "flex",
                fontSize: s(140),
                fontWeight: 900,
                letterSpacing: s(-4),
                lineHeight: 1.0,
                backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
                backgroundClip: "text",
                color: "transparent",
              }}>
                yourname
              </div>
              <div style={{ display: "flex", fontSize: s(96), fontWeight: 800, color: PLUM, letterSpacing: s(-2) }}>
                .igra
              </div>
            </div>
          </div>

          {/* value chips */}
          <div style={{ display: "flex", flex: 1, alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", width: "100%", gap: s(14) }}>
              <div style={{ display: "flex", gap: s(12), justifyContent: "center" }}>
                {[
                  { t: "Pay once", c: CYAN },
                  { t: "Own forever", c: PLUM },
                  { t: "On-chain NFT", c: EMERALD },
                  { t: "20% to Igra DAO", c: "#fbbf24" },
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
