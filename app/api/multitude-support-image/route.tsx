import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#070708";
const EMERALD = "#34d399";
const KASPA_TEAL = "#70C7BA"; // Kaspa brand teal
const KASPA_DARK = "#3A8E80";

/**
 * GET /api/multitude-support-image?size=hd|qhd|4k
 *
 * Ecosystem-spotlight card supporting @IgraLabs Multitude (their
 * Kaspa-PoW-ordered RaaS product). Pairs with the "no sequencer" tweet
 * Liam posts from @IgraNameService.
 *
 * Visual language matches /api/snap-launch-image (INK base, cyan/plum
 * sparks, IGRA NAME SERVICE brand bar) but swaps the hero gradient to
 * Kaspa teal → cyan to read as a co-brand spotlight, and trades the
 * MetaMask Send mockup for an architecture-stack diagram showing the
 * PoW security layer underneath.
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

  const FEATURES: [string, string][] = [
    ["No vendor sequencer", "Kaspa BlockDAG orders every transaction"],
    ["No validator set",    "PoW miners secure the chain directly"],
    ["No MEV middleman",    "Tx ordering is decided by the network"],
  ];

  const SPARKS: [number, number, number, number, number][] = [
    [4, 8, 14, 45, 0.45], [96, 10, 12, 30, 0.4],
    [92, 88, 16, 45, 0.45], [3, 88, 11, 20, 0.35],
    [22, 30, 9, 45, 0.3], [78, 70, 10, 30, 0.3],
    [42, 14, 8, 45, 0.25], [60, 86, 9, 20, 0.3],
    [14, 60, 7, 45, 0.3], [88, 32, 8, 20, 0.3],
    [50, 22, 6, 45, 0.25], [32, 70, 7, 20, 0.3],
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
          backgroundImage: `radial-gradient(${s(1200)}px ${s(880)}px at 50% 36%, rgba(112,199,186,0.22), transparent 66%), radial-gradient(${s(900)}px ${s(760)}px at 88% 96%, rgba(168,85,247,0.28), transparent 64%), radial-gradient(${s(820)}px ${s(700)}px at 4% 4%, rgba(0,240,255,0.18), transparent 62%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.7) 100%)`,
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
              background: i % 3 === 0 ? CYAN : i % 3 === 1 ? PLUM : KASPA_TEAL,
              opacity: op,
              boxShadow: `0 0 ${s(20)}px ${i % 3 === 0 ? CYAN : i % 3 === 1 ? PLUM : KASPA_TEAL}`,
            }}
          />
        ))}

        {/* Top brand row — INS left, "ECOSYSTEM SPOTLIGHT" pill right */}
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
            <div
              style={{
                display: "flex",
                fontSize: s(20),
                fontWeight: 800,
                letterSpacing: s(5),
                color: "rgba(255,255,255,0.78)",
              }}
            >
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
              border: `1px solid ${KASPA_TEAL}66`,
              background: `${KASPA_TEAL}1a`,
              fontSize: s(20),
              fontWeight: 900,
              letterSpacing: s(4),
              color: "#a5e8de",
              boxShadow: `0 0 ${s(30)}px ${KASPA_TEAL}40`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: s(14),
                height: s(14),
                borderRadius: 999,
                background: KASPA_TEAL,
                boxShadow: `0 0 ${s(16)}px ${KASPA_TEAL}`,
              }}
            />
            ECOSYSTEM SPOTLIGHT
          </div>
        </div>

        {/* Hero title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: s(38),
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
            RaaS WITHOUT THE MIDDLEMAN
          </div>
          <div
            style={{
              display: "flex",
              fontSize: s(180),
              fontWeight: 900,
              letterSpacing: s(-4),
              lineHeight: 1,
              marginTop: s(6),
              backgroundImage: `linear-gradient(110deg, ${KASPA_TEAL} 0%, ${CYAN} 55%, ${PLUM} 100%)`,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            NO SEQUENCER
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
            Kaspa BlockDAG orders every transaction · PoW security under your EVM
          </div>
        </div>

        {/* Architecture stack — 3 layers showing what's under your dapp */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: s(42),
            gap: s(8),
          }}
        >
          {/* Layer 1: your dapp */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: s(20),
              padding: `${s(14)}px ${s(40)}px`,
              borderRadius: s(14),
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              minWidth: s(680),
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(13),
                fontWeight: 700,
                letterSpacing: s(3),
                color: "rgba(255,255,255,0.45)",
              }}
            >
              YOUR APP
            </div>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, color: "#fff" }}>
              DeFi · Settlement · Appchain
            </div>
          </div>

          {/* arrow */}
          <div style={{ display: "flex", fontSize: s(18), color: "rgba(255,255,255,0.3)" }}>↓</div>

          {/* Layer 2: Multitude EVM */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: s(20),
              padding: `${s(14)}px ${s(40)}px`,
              borderRadius: s(14),
              background: `linear-gradient(120deg, rgba(0,240,255,0.10) 0%, rgba(168,85,247,0.08) 100%)`,
              border: `1px solid ${CYAN}55`,
              minWidth: s(680),
              boxShadow: `0 0 ${s(40)}px rgba(0,240,255,0.12)`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(13),
                fontWeight: 700,
                letterSpacing: s(3),
                color: CYAN,
              }}
            >
              MULTITUDE
            </div>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, color: "#fff" }}>
              EVM appchain · dedicated throughput
            </div>
          </div>

          {/* arrow */}
          <div style={{ display: "flex", fontSize: s(18), color: "rgba(255,255,255,0.3)" }}>↓</div>

          {/* Layer 3: Kaspa BlockDAG */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: s(20),
              padding: `${s(16)}px ${s(40)}px`,
              borderRadius: s(14),
              background: `linear-gradient(120deg, ${KASPA_TEAL}28 0%, ${KASPA_DARK}1c 100%)`,
              border: `1px solid ${KASPA_TEAL}80`,
              minWidth: s(680),
              boxShadow: `0 0 ${s(50)}px ${KASPA_TEAL}30`,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: s(13),
                fontWeight: 700,
                letterSpacing: s(3),
                color: KASPA_TEAL,
              }}
            >
              KASPA BLOCKDAG
            </div>
            <div style={{ display: "flex", fontSize: s(28), fontWeight: 800, color: "#fff" }}>
              PoW ordering · Bitcoin-grade security
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        {/* CTA + footer combined */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: s(14),
            paddingTop: s(18),
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: s(14),
              fontSize: s(34),
              fontWeight: 900,
              letterSpacing: s(-0.5),
            }}
          >
            <span style={{ display: "flex", color: "#fff" }}>MULTITUDE</span>
            <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
            <span style={{ display: "flex", color: KASPA_TEAL }}>igralabs.com/multitude</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: s(18),
              fontWeight: 700,
              letterSpacing: s(2),
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <div style={{ display: "flex" }}>insdomains.org</div>
            <div style={{ display: "flex", gap: s(14) }}>
              <span style={{ display: "flex" }}>@IgraNameService supports @IgraLabs</span>
              <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
              <span style={{ display: "flex" }}>Native on Igra L2</span>
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
