import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";

/**
 * GET /api/giveaway-image?size=hd|qhd|4k
 *
 * On-brand giveaway hero for social pushes: "win a premium .igra name, free".
 * Code-rendered (next/og) so text is always pixel-accurate + on-brand — no
 * Canva text-mangling. A glowing, tilted prize card + spotlight bloom +
 * sparkle accents give it depth. Reusable for any follow/like/repost giveaway.
 *
 *   hd (default) 1920×1080 · qhd 2560×1440 · 4k 3840×2160
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

  // Decorative sparkles (rotated gradient squares) — x%, y%, size, rotation, opacity
  const SPARKS: [number, number, number, number, number][] = [
    [12, 22, 16, 45, 0.5], [22, 70, 10, 30, 0.4], [46, 14, 12, 45, 0.45],
    [60, 80, 9, 20, 0.35], [78, 30, 22, 45, 0.5], [88, 64, 13, 30, 0.4],
    [69, 50, 8, 45, 0.5], [35, 86, 11, 20, 0.3], [92, 18, 9, 45, 0.4],
  ];

  const STEPS: [string, string, string][] = [
    ["1", "Quote-RT", CYAN],
    ["2", "Drop your dream .igra", PLUM],
    ["3", "Top 3 win", "#34d399"],
    ["4", "Sun 21:00 UTC", "#fbbf24"],
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
          backgroundImage: `radial-gradient(${s(820)}px ${s(680)}px at 70% 42%, rgba(0,240,255,0.30), transparent 62%), radial-gradient(${s(900)}px ${s(760)}px at 96% 108%, rgba(168,85,247,0.34), transparent 66%), radial-gradient(${s(760)}px ${s(640)}px at 2% -8%, rgba(0,240,255,0.20), transparent 64%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 52%, rgba(0,0,0,0.66) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
        }}
      >
        {/* Sparkle layer */}
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

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            padding: `${s(70)}px ${s(92)}px`,
          }}
        >
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: s(18) }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: s(68),
                  height: s(68),
                  borderRadius: s(19),
                  background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                  color: "#000",
                  fontSize: s(44),
                  fontWeight: 900,
                  boxShadow: `0 0 ${s(46)}px rgba(0,240,255,0.5)`,
                }}
              >
                i
              </div>
              <div style={{ display: "flex", fontSize: s(27), fontWeight: 800, letterSpacing: s(6), color: "rgba(255,255,255,0.72)" }}>
                IGRA NAME SERVICE
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: s(12),
                padding: `${s(12)}px ${s(26)}px`,
                borderRadius: 999,
                border: `1px solid ${PLUM}77`,
                background: `${PLUM}26`,
                fontSize: s(24),
                fontWeight: 900,
                letterSpacing: s(5),
                color: "#f3e8ff",
                boxShadow: `0 0 ${s(40)}px rgba(168,85,247,0.4)`,
              }}
            >
              🎁 GIVEAWAY
            </div>
          </div>

          {/* Middle: copy left, tilted prize card right */}
          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: s(40) }}>
            {/* Left copy */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1.12 }}>
              <div style={{ display: "flex", fontSize: s(40), fontWeight: 800, letterSpacing: s(2), color: "rgba(255,255,255,0.82)" }}>
                WIN A PREMIUM
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: s(132),
                  fontWeight: 900,
                  letterSpacing: s(-3),
                  lineHeight: 1.0,
                  marginTop: s(4),
                  backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                .igra name
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: s(14), marginTop: s(26), fontSize: s(36), fontWeight: 800 }}>
                <span style={{ display: "flex", color: "#34d399" }}>3 WINNERS</span>
                <span style={{ display: "flex", color: "rgba(255,255,255,0.35)" }}>·</span>
                <span style={{ display: "flex", color: "#fff" }}>Most creative picks</span>
              </div>
              <div style={{ display: "flex", marginTop: s(10), fontSize: s(26), fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
                Forever tier. Minted to your wallet. No strings.
              </div>
            </div>

            {/* Right: glowing tilted NFT prize card */}
            <div style={{ display: "flex", flex: 0.88, alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: s(520),
                  height: s(360),
                  padding: s(40),
                  borderRadius: s(36),
                  transform: "rotate(-6deg)",
                  background: "linear-gradient(155deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)",
                  border: "1px solid rgba(255,255,255,0.16)",
                  boxShadow: `0 ${s(40)}px ${s(90)}px rgba(0,0,0,0.55), 0 0 ${s(120)}px rgba(0,240,255,0.22), 0 0 ${s(160)}px rgba(168,85,247,0.20)`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      padding: `${s(8)}px ${s(18)}px`,
                      borderRadius: 999,
                      background: "rgba(248,113,113,0.16)",
                      border: "1px solid rgba(248,113,113,0.5)",
                      color: "#fca5a5",
                      fontSize: s(20),
                      fontWeight: 800,
                      letterSpacing: s(2),
                    }}
                  >
                    PREMIUM
                  </div>
                  <div style={{ display: "flex", fontSize: s(20), fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>.igra</div>
                </div>
                <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "baseline" }}>
                    <div
                      style={{
                        display: "flex",
                        fontSize: s(86),
                        fontWeight: 900,
                        letterSpacing: s(-2),
                        backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                        backgroundClip: "text",
                        color: "transparent",
                      }}
                    >
                      yourname
                    </div>
                    <div style={{ display: "flex", fontSize: s(52), fontWeight: 700, color: PLUM }}>.igra</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: s(18), color: "rgba(255,255,255,0.4)" }}>
                  <div style={{ display: "flex" }}>On-chain · No expiry</div>
                  <div style={{ display: "flex" }}>Igra L2</div>
                </div>
              </div>
            </div>
          </div>

          {/* Entry steps */}
          <div style={{ display: "flex", gap: s(16) }}>
            {STEPS.map(([n, t, accent]) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: s(14),
                  flex: 1,
                  padding: `${s(20)}px ${s(22)}px`,
                  borderRadius: s(18),
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: s(44),
                    height: s(44),
                    borderRadius: 999,
                    background: accent,
                    color: "#000",
                    fontSize: s(24),
                    fontWeight: 900,
                    boxShadow: `0 0 ${s(20)}px ${accent}88`,
                  }}
                >
                  {n}
                </div>
                <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, color: "#fff" }}>{t}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: s(34),
              paddingTop: s(28),
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "flex", fontSize: s(38), fontWeight: 800, color: "rgba(255,255,255,0.95)" }}>insdomains.org</div>
            <div style={{ display: "flex", gap: s(22), fontSize: s(22), fontWeight: 700, letterSpacing: s(2), color: "rgba(255,255,255,0.55)" }}>
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
