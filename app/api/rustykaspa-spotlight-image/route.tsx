import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
// RustyKaspa brand purple, sampled from their <meta name="theme-color">
const RK_PURPLE = "#8b5cf6";
const RK_PURPLE_DIM = "#5b3fa6";

/**
 * GET /api/rustykaspa-spotlight-image?size=hd|qhd|4k
 *
 * Shoutout card for RustyKaspa (rkstratum.rustykaspa.org) — an
 * independent Kaspa/Igra builder who wired native `.igra` resolution
 * into their explorer. Layout mirrors the snap-launch card (mock UI
 * center-stage showing the actual integration in action) but swaps
 * the MetaMask Send window for a browser URL bar landing on their
 * explorer's shareable name URL.
 *
 *   hd  1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

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
          backgroundImage: `radial-gradient(${s(1200)}px ${s(880)}px at 50% 34%, rgba(139,92,246,0.28), transparent 66%), radial-gradient(${s(900)}px ${s(760)}px at 88% 96%, rgba(168,85,247,0.24), transparent 64%), radial-gradient(${s(820)}px ${s(700)}px at 4% 4%, rgba(0,240,255,0.14), transparent 62%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(50)}px ${s(72)}px`,
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
              background: i % 3 === 0 ? CYAN : i % 3 === 1 ? RK_PURPLE : PLUM,
              opacity: op,
              boxShadow: `0 0 ${s(20)}px ${i % 3 === 0 ? CYAN : i % 3 === 1 ? RK_PURPLE : PLUM}`,
            }}
          />
        ))}

        {/* Top brand row — INS left, SPOTLIGHT pill right */}
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
              border: `1px solid ${RK_PURPLE}66`,
              background: `${RK_PURPLE}1a`,
              fontSize: s(20),
              fontWeight: 900,
              letterSpacing: s(4),
              color: "#c4b5fd",
              boxShadow: `0 0 ${s(30)}px ${RK_PURPLE}40`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: s(14),
                height: s(14),
                borderRadius: 999,
                background: RK_PURPLE,
                boxShadow: `0 0 ${s(16)}px ${RK_PURPLE}`,
              }}
            />
            BUILDER SPOTLIGHT
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: s(34),
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
            .IGRA NAMES NATIVE IN
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(140),
              fontWeight: 900,
              letterSpacing: s(-4),
              lineHeight: 1,
              marginTop: s(4),
              backgroundImage: `linear-gradient(110deg, ${RK_PURPLE} 0%, ${PLUM} 55%, #ff5fa2 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            RustyKaspa
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(26),
              fontWeight: 600,
              color: "rgba(255,255,255,0.66)",
              marginTop: s(10),
              letterSpacing: s(1),
            }}
          >
            Independent Kaspa/Igra explorer. Search by name, resolve on-chain, share the URL.
          </div>
        </div>

        {/* Browser mockup showing the actual integration */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: s(30),
            borderRadius: s(20),
            background: "linear-gradient(180deg, #1a1a2e 0%, #14141f 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: `0 ${s(30)}px ${s(60)}px rgba(0,0,0,0.5), 0 0 ${s(60)}px ${RK_PURPLE}20`,
            overflow: "hidden",
          }}
        >
          {/* browser chrome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(10),
              padding: `${s(12)}px ${s(18)}px`,
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ display: "flex", width: s(11), height: s(11), borderRadius: 999, background: "#ff5f56" }} />
            <div style={{ display: "flex", width: s(11), height: s(11), borderRadius: 999, background: "#ffbd2e" }} />
            <div style={{ display: "flex", width: s(11), height: s(11), borderRadius: 999, background: "#27c93f" }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginLeft: s(24),
                flex: 1,
                padding: `${s(8)}px ${s(16)}px`,
                borderRadius: s(10),
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "monospace",
                fontSize: s(18),
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <span style={{ display: "flex", color: RK_PURPLE, marginRight: s(6) }}>🔒</span>
              <span style={{ display: "flex", color: "rgba(255,255,255,0.55)" }}>rkstratum.rustykaspa.org/explorer/name/</span>
              <span style={{ display: "flex", color: CYAN, fontWeight: 700 }}>insdomains</span>
              <span style={{ display: "flex", color: PLUM, fontWeight: 700 }}>.igra</span>
            </div>
          </div>

          {/* explorer content mockup */}
          <div style={{ display: "flex", padding: `${s(22)}px ${s(28)}px`, gap: s(28) }}>
            {/* Left column — name resolution */}
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: s(10),
                  fontSize: s(13),
                  fontWeight: 800,
                  letterSpacing: s(3),
                  color: RK_PURPLE,
                }}
              >
                <div style={{ display: "flex", width: s(8), height: s(8), borderRadius: 999, background: RK_PURPLE, boxShadow: `0 0 ${s(10)}px ${RK_PURPLE}` }} />
                INS NAME · ON-CHAIN RESOLVE
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: s(36),
                  fontWeight: 900,
                  fontFamily: "monospace",
                  marginTop: s(8),
                  color: "#fff",
                }}
              >
                <span style={{ display: "flex" }}>insdomains</span>
                <span style={{ display: "flex", color: PLUM }}>.igra</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: s(10),
                  marginTop: s(14),
                  padding: `${s(12)}px ${s(16)}px`,
                  borderRadius: s(12),
                  background: `${EMERALD}18`,
                  border: `1px solid ${EMERALD}55`,
                }}
              >
                <div style={{ display: "flex", fontSize: s(13), fontWeight: 800, letterSpacing: s(2), color: "#86efac" }}>
                  → RESOLVED
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: "monospace",
                    fontSize: s(18),
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 700,
                  }}
                >
                  0x7447f0e5cd…81d1807aa1
                </div>
              </div>
            </div>

            {/* Right column — features supported */}
            <div style={{ display: "flex", flexDirection: "column", gap: s(8) }}>
              {[
                "Search by .igra name",
                "Address ↔ name lookup",
                "INS NFT holdings by token ID",
                "Shareable /explorer/name/… URL",
              ].map((feature) => (
                <div
                  key={feature}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: s(10),
                    fontSize: s(16),
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: s(20),
                      height: s(20),
                      borderRadius: 999,
                      background: RK_PURPLE,
                      color: "#0a0a0a",
                      fontSize: s(13),
                      fontWeight: 900,
                    }}
                  >
                    ✓
                  </div>
                  <span style={{ display: "flex" }}>{feature}</span>
                </div>
              ))}
            </div>
          </div>
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
            <span style={{ display: "flex" }}>Built by RustyKaspa</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
            <span style={{ display: "flex", color: RK_PURPLE }}>rustykaspa.org</span>
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
