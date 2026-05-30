import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
const FOX = "#f6851b";

/**
 * GET /api/snap-promo/[frame]
 *
 *   frame=1  →  Hero / install ("INS Snap is LIVE")
 *   frame=2  →  Forward resolution demo (Send screen mockup)
 *   frame=3  →  Reverse resolution demo (contact mockup + features grid)
 *
 * All three render at 960x540 (MetaMask Snap Directory spec) by default.
 * Pass ?size=2x for HD (1920x1080) downloads.
 *
 * Layout pattern matches /api/snap-launch-image: a single root flex container
 * with the gradient background applied directly to it (satori does NOT
 * support `inset: 0` — use explicit top/left/width/height for absolute
 * positioning of children), sparkles + content as direct children.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ frame: string }> },
) {
  const { frame } = await params;
  const url = new URL(req.url);
  const sizeMul = url.searchParams.get("size") === "2x" ? 2 : 1;
  const W = 960 * sizeMul;
  const H = 540 * sizeMul;
  const s = (n: number) => Math.round(n * sizeMul * 100) / 100;

  const SPARKS: [number, number, number, number, number][] = [
    [8, 16, 10, 45, 0.4], [22, 78, 8, 30, 0.35], [38, 10, 9, 45, 0.35],
    [60, 88, 7, 20, 0.3], [78, 24, 13, 45, 0.4], [88, 70, 9, 30, 0.35],
    [70, 50, 6, 45, 0.45], [33, 86, 8, 20, 0.3], [93, 14, 7, 45, 0.35],
  ];

  const BG = `radial-gradient(${s(720)}px ${s(540)}px at 50% 30%, rgba(0,240,255,0.28), transparent 64%), radial-gradient(${s(740)}px ${s(620)}px at 100% 100%, rgba(168,85,247,0.34), transparent 66%), radial-gradient(${s(620)}px ${s(520)}px at 0% 100%, rgba(0,240,255,0.16), transparent 64%), radial-gradient(${s(1200)}px ${s(900)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.66) 100%)`;

  const Sparkles = SPARKS.map(([x, y, sz, rot, op], i) => (
    <div
      key={i}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        display: "flex",
        width: s(sz),
        height: s(sz),
        borderRadius: s(2),
        transform: `rotate(${rot}deg)`,
        background: i % 2 === 0 ? CYAN : PLUM,
        opacity: op,
        boxShadow: `0 0 ${s(14)}px ${i % 2 === 0 ? CYAN : PLUM}`,
      }}
    />
  ));

  const BrandChip = (
    <div style={{ display: "flex", alignItems: "center", gap: s(10) }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: s(38),
          height: s(38),
          borderRadius: s(11),
          background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
          color: "#000",
          fontSize: s(24),
          fontWeight: 900,
          boxShadow: `0 0 ${s(20)}px rgba(0,240,255,0.45)`,
        }}
      >
        i
      </div>
      <div
        style={{
          display: "flex",
          fontSize: s(15),
          fontWeight: 800,
          letterSpacing: s(4),
          color: "rgba(255,255,255,0.78)",
        }}
      >
        INS · IGRA NAME SERVICE
      </div>
    </div>
  );

  let element;

  if (frame === "1") {
    // ============ FRAME 1: HERO / INSTALL ============
    element = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: INK,
          backgroundImage: BG,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(34)}px ${s(48)}px`,
        }}
      >
        {Sparkles}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {BrandChip}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(8),
              padding: `${s(7)}px ${s(16)}px`,
              borderRadius: 999,
              border: `1px solid ${EMERALD}66`,
              background: `${EMERALD}1c`,
              fontSize: s(13),
              fontWeight: 900,
              letterSpacing: s(3),
              color: "#bbf7d0",
              boxShadow: `0 0 ${s(24)}px ${EMERALD}44`,
            }}
          >
            🚀 LIVE ON NPM
          </div>
        </div>

        {/* big icon */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: s(28) }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: s(108),
              height: s(108),
              borderRadius: s(26),
              background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
              color: "#0a0a0a",
              fontSize: s(70),
              fontWeight: 900,
              boxShadow: `0 0 ${s(50)}px rgba(0,240,255,0.5), 0 ${s(20)}px ${s(40)}px rgba(0,0,0,0.4)`,
            }}
          >
            i
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: s(78),
            fontWeight: 900,
            letterSpacing: s(-2),
            lineHeight: 1.0,
            marginTop: s(14),
            backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          INS Snap
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            fontSize: s(22),
            fontWeight: 600,
            color: "rgba(255,255,255,0.78)",
            marginTop: s(8),
          }}
        >
          Native .igra name resolution in MetaMask
        </div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: s(14) }}>
          <div
            style={{
              display: "flex",
              padding: `${s(10)}px ${s(20)}px`,
              borderRadius: s(11),
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontFamily: "monospace",
              fontSize: s(18),
              fontWeight: 700,
              color: CYAN,
            }}
          >
            npm:ins-snap-resolver
          </div>
        </div>

        {/* spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: s(13),
            fontWeight: 700,
            letterSpacing: s(1),
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div style={{ display: "flex" }}>insdomains.org/snap</div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.4)" }}>Built on Igra L2</div>
        </div>
      </div>
    );
  } else if (frame === "2") {
    // ============ FRAME 2: FORWARD RESOLUTION DEMO ============
    element = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: INK,
          backgroundImage: BG,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(28)}px ${s(48)}px`,
        }}
      >
        {Sparkles}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {BrandChip}
          <div
            style={{
              display: "flex",
              fontSize: s(14),
              fontWeight: 800,
              letterSpacing: s(5),
              color: "rgba(255,255,255,0.5)",
            }}
          >
            FORWARD RESOLUTION
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: s(34),
            fontWeight: 900,
            letterSpacing: s(-0.8),
            lineHeight: 1.1,
            marginTop: s(18),
            backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Type a name. See the address.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: s(18),
            padding: s(18),
            borderRadius: s(18),
            background: "rgba(20,20,30,0.9)",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: `0 ${s(20)}px ${s(40)}px rgba(0,0,0,0.5), 0 0 ${s(60)}px rgba(0,240,255,0.06)`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: s(10),
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              marginBottom: s(12),
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
              <div
                style={{
                  display: "flex",
                  width: s(26),
                  height: s(26),
                  borderRadius: s(6),
                  background: FOX,
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: s(16),
                }}
              >
                🦊
              </div>
              <div style={{ display: "flex", fontSize: s(15), fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                MetaMask
              </div>
              <div
                style={{
                  display: "flex",
                  padding: `${s(2)}px ${s(8)}px`,
                  borderRadius: 999,
                  background: "rgba(98,179,253,0.18)",
                  border: "1px solid rgba(98,179,253,0.4)",
                  fontSize: s(10),
                  fontWeight: 700,
                  color: "#93c5fd",
                  marginLeft: s(6),
                }}
              >
                Ethereum Mainnet
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(11),
                fontWeight: 700,
                color: "rgba(255,255,255,0.4)",
                letterSpacing: s(1.5),
              }}
            >
              SEND
            </div>
          </div>

          <div style={{ display: "flex", fontSize: s(11), color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: s(5) }}>
            To
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(8),
              padding: `${s(12)}px ${s(16)}px`,
              borderRadius: s(11),
              background: "rgba(0,0,0,0.4)",
              border: `2px solid ${CYAN}88`,
              boxShadow: `0 0 ${s(22)}px rgba(0,240,255,0.18) inset`,
              fontSize: s(28),
              fontFamily: "monospace",
              color: "#fff",
              fontWeight: 700,
              marginBottom: s(12),
            }}
          >
            <span style={{ display: "flex", color: CYAN }}>|</span>
            <span style={{ display: "flex" }}>igranetwork.</span>
            <span style={{ display: "flex", color: PLUM }}>igra</span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: `${s(10)}px ${s(16)}px`,
              borderRadius: s(11),
              background: "rgba(52,211,153,0.10)",
              border: `1px solid ${EMERALD}66`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
              <div
                style={{
                  display: "flex",
                  width: s(12),
                  height: s(12),
                  borderRadius: 999,
                  background: EMERALD,
                  boxShadow: `0 0 ${s(10)}px ${EMERALD}`,
                }}
              />
              <div style={{ display: "flex", fontSize: s(11), fontWeight: 800, color: "#86efac", letterSpacing: s(1.5) }}>
                RESOLVED VIA INS · IGRA L2
              </div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(20),
                fontFamily: "monospace",
                color: "rgba(255,255,255,0.92)",
                fontWeight: 600,
                marginTop: s(4),
              }}
            >
              0x7447F0e5...07aA1
            </div>
          </div>
        </div>

        {/* spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: s(13),
            fontWeight: 700,
            letterSpacing: s(1),
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div style={{ display: "flex" }}>insdomains.org/snap</div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.4)" }}>npm:ins-snap-resolver</div>
        </div>
      </div>
    );
  } else {
    // ============ FRAME 3: REVERSE + FEATURES ============
    element = (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          backgroundColor: INK,
          backgroundImage: BG,
          fontFamily: "sans-serif",
          color: "#fff",
          padding: `${s(28)}px ${s(48)}px`,
        }}
      >
        {Sparkles}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {BrandChip}
          <div
            style={{
              display: "flex",
              fontSize: s(14),
              fontWeight: 800,
              letterSpacing: s(5),
              color: "rgba(255,255,255,0.5)",
            }}
          >
            REVERSE · & MORE
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: s(34),
            fontWeight: 900,
            letterSpacing: s(-0.8),
            lineHeight: 1.1,
            marginTop: s(18),
            backgroundImage: `linear-gradient(110deg, ${CYAN} 0%, ${PLUM} 100%)`,
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          See a name where you used to see 0x…
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: s(14),
            marginTop: s(18),
            padding: `${s(14)}px ${s(20)}px`,
            borderRadius: s(14),
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "monospace",
              fontSize: s(18),
              color: "rgba(255,255,255,0.55)",
              textDecoration: "line-through",
            }}
          >
            0x7447F0e5...07aA1
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(20),
              color: "rgba(255,255,255,0.4)",
              fontWeight: 800,
            }}
          >
            →
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(22),
              fontWeight: 800,
              fontFamily: "monospace",
            }}
          >
            <span style={{ display: "flex", color: CYAN }}>insdomains</span>
            <span style={{ display: "flex", color: PLUM }}>.igra</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: s(12), marginTop: s(20) }}>
          {[
            { icon: "🔒", title: "Zero key access", body: "No signing, no entropy. Read-only resolver." },
            { icon: "⚡", title: "1.3 KB bundle", body: "Smaller than the average tweet attachment." },
            { icon: "🌐", title: "Multi-chain", body: "Ethereum Mainnet + Igra L2." },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                padding: `${s(14)}px ${s(16)}px`,
                borderRadius: s(14),
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            >
              <div style={{ display: "flex", fontSize: s(22), marginBottom: s(4) }}>{f.icon}</div>
              <div style={{ display: "flex", fontSize: s(15), fontWeight: 800, color: "#fff", marginBottom: s(2) }}>
                {f.title}
              </div>
              <div style={{ display: "flex", fontSize: s(12), color: "rgba(255,255,255,0.7)", lineHeight: 1.4 }}>
                {f.body}
              </div>
            </div>
          ))}
        </div>

        {/* spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: s(13),
            fontWeight: 700,
            letterSpacing: s(1),
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <div style={{ display: "flex" }}>insdomains.org/snap</div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.4)" }}>npm:ins-snap-resolver</div>
        </div>
      </div>
    );
  }

  return new ImageResponse(element, {
    width: W,
    height: H,
    headers: {
      "Cache-Control": "public, max-age=21600, s-maxage=21600, stale-while-revalidate=86400",
      "Content-Type": "image/png",
    },
  });
}
