import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/**
 * GET /api/multitude-support-image?size=hd|qhd|4k
 *
 * Multitude support card — Igra-palette version (mint teal #6bd1c3 +
 * warm sand #eed58a + electric yellow #eaff6a accent, dark gray base
 * rather than pure black). Breaks deliberately from the snap-launch /
 * emoji-launch template — no sparks, no brand-bar, no center hero.
 *
 * Layout: asymmetric editorial — left half is a stylized Kaspa BlockDAG
 * visualization (parallel block tracks + cross-lane merge edges, what
 * makes Kaspa structurally different from a single-chain L1), right
 * half is stacked typography ending in the "no sequencer" punchline.
 *
 *   hd  1920x1080  ·  qhd 2560x1440  ·  4k 3840x2160
 */

// Igra brand palette (sampled directly from their site CSS)
const TEAL = "#6bd1c3";
const TEAL_DEEP = "#3a8e80";
const SAND = "#eed58a";
const YELLOW = "#eaff6a";
const BRONZE = "#cb9d4b";
const GRAY_950 = "#0c0c0c";
const GRAY_900 = "#151515";
const GRAY_700 = "#2a2a2a";

const SIZES: Record<string, { w: number; h: number; scale: number }> = {
  hd:   { w: 1920, h: 1080, scale: 1.0 },
  qhd:  { w: 2560, h: 1440, scale: 4 / 3 },
  "4k": { w: 3840, h: 2160, scale: 2.0 },
};

// BlockDAG node positions — 6 lanes, irregular blocks per lane, then
// cross-lane DAG edges. Coordinates in a 1000x600 viewBox, scaled by SVG.
type Node = { id: string; x: number; y: number; emphasis?: "anchor" | "tip" | "normal" };
const NODES: Node[] = [
  // lane 0 (top)
  { id: "0a", x:  60, y:  60 },
  { id: "0b", x: 180, y:  60 },
  { id: "0c", x: 300, y:  60, emphasis: "anchor" },
  { id: "0d", x: 440, y:  60 },
  { id: "0e", x: 580, y:  60 },
  { id: "0f", x: 700, y:  60 },
  { id: "0g", x: 830, y:  60, emphasis: "tip" },
  // lane 1
  { id: "1a", x:  90, y: 145 },
  { id: "1b", x: 220, y: 145 },
  { id: "1c", x: 370, y: 145 },
  { id: "1d", x: 500, y: 145, emphasis: "anchor" },
  { id: "1e", x: 640, y: 145 },
  { id: "1f", x: 760, y: 145 },
  { id: "1g", x: 880, y: 145, emphasis: "tip" },
  // lane 2
  { id: "2a", x:  40, y: 230 },
  { id: "2b", x: 170, y: 230 },
  { id: "2c", x: 320, y: 230 },
  { id: "2d", x: 460, y: 230 },
  { id: "2e", x: 600, y: 230 },
  { id: "2f", x: 730, y: 230, emphasis: "anchor" },
  { id: "2g", x: 860, y: 230, emphasis: "tip" },
  // lane 3
  { id: "3a", x:  80, y: 315 },
  { id: "3b", x: 210, y: 315 },
  { id: "3c", x: 350, y: 315, emphasis: "anchor" },
  { id: "3d", x: 490, y: 315 },
  { id: "3e", x: 620, y: 315 },
  { id: "3f", x: 750, y: 315 },
  { id: "3g", x: 900, y: 315, emphasis: "tip" },
  // lane 4
  { id: "4a", x:  50, y: 400 },
  { id: "4b", x: 195, y: 400 },
  { id: "4c", x: 340, y: 400 },
  { id: "4d", x: 470, y: 400 },
  { id: "4e", x: 610, y: 400, emphasis: "anchor" },
  { id: "4f", x: 740, y: 400 },
  { id: "4g", x: 870, y: 400, emphasis: "tip" },
  // lane 5 (bottom)
  { id: "5a", x:  70, y: 485 },
  { id: "5b", x: 210, y: 485 },
  { id: "5c", x: 360, y: 485 },
  { id: "5d", x: 510, y: 485 },
  { id: "5e", x: 640, y: 485 },
  { id: "5f", x: 770, y: 485 },
  { id: "5g", x: 890, y: 485, emphasis: "tip" },
];

// Edges — parent → child. Includes in-lane progression AND cross-lane DAG
// merges that make this a DAG instead of a chain.
const EDGES: [string, string][] = [
  // in-lane (each lane: a→b→c→d→e→f→g)
  ["0a","0b"],["0b","0c"],["0c","0d"],["0d","0e"],["0e","0f"],["0f","0g"],
  ["1a","1b"],["1b","1c"],["1c","1d"],["1d","1e"],["1e","1f"],["1f","1g"],
  ["2a","2b"],["2b","2c"],["2c","2d"],["2d","2e"],["2e","2f"],["2f","2g"],
  ["3a","3b"],["3b","3c"],["3c","3d"],["3d","3e"],["3e","3f"],["3f","3g"],
  ["4a","4b"],["4b","4c"],["4c","4d"],["4d","4e"],["4e","4f"],["4f","4g"],
  ["5a","5b"],["5b","5c"],["5c","5d"],["5d","5e"],["5e","5f"],["5f","5g"],
  // cross-lane DAG merges
  ["0c","1d"],["1c","2d"],["2c","3d"],["3c","4d"],["4c","5d"],
  ["1d","0e"],["2d","1e"],["3d","2e"],["4d","3e"],["5d","4e"],
  ["0f","1g"],["1f","2g"],["2f","3g"],["3f","4g"],["4f","5g"],
  // long anchor crosses
  ["0c","2d"],["3c","1d"],["4e","2f"],["1d","3e"],
];

const NODE_MAP = Object.fromEntries(NODES.map(n => [n.id, n]));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sizeParam = (url.searchParams.get("size") ?? "hd").toLowerCase();
  const { w, h, scale } = SIZES[sizeParam] ?? SIZES.hd;
  const s = (n: number) => Math.round(n * scale * 100) / 100;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: GRAY_950,
          backgroundImage: `radial-gradient(${s(1200)}px ${s(900)}px at 28% 50%, rgba(107,209,195,0.18), transparent 65%), radial-gradient(${s(900)}px ${s(700)}px at 100% 100%, rgba(238,213,138,0.10), transparent 60%), radial-gradient(${s(1700)}px ${s(1100)}px at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 100%)`,
          fontFamily: "sans-serif",
          color: "#fff",
        }}
      >
        {/* LEFT — BlockDAG visualization, ~58% width */}
        <div
          style={{
            display: "flex",
            width: "58%",
            height: "100%",
            position: "relative",
            alignItems: "center",
            justifyContent: "center",
            padding: `${s(60)}px ${s(20)}px ${s(60)}px ${s(60)}px`,
          }}
        >
          {/* eyebrow label top-left over the DAG */}
          <div
            style={{
              position: "absolute",
              top: s(54),
              left: s(60),
              display: "flex",
              alignItems: "center",
              gap: s(14),
              fontSize: s(15),
              fontWeight: 700,
              letterSpacing: s(4),
              color: TEAL,
              opacity: 0.85,
            }}
          >
            <div
              style={{
                display: "flex",
                width: s(8),
                height: s(8),
                borderRadius: 999,
                background: TEAL,
                boxShadow: `0 0 ${s(14)}px ${TEAL}`,
              }}
            />
            KASPA BLOCKDAG
          </div>

          <svg
            width="100%"
            height="80%"
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            {/* faint grid lane lines (subtle horizontal guides) */}
            {[60, 145, 230, 315, 400, 485].map((y) => (
              <line
                key={`grid-${y}`}
                x1="20"
                x2="940"
                y1={y}
                y2={y}
                stroke={GRAY_700}
                strokeWidth="1"
                strokeDasharray="2 6"
                opacity="0.55"
              />
            ))}

            {/* edges */}
            {EDGES.map(([from, to], i) => {
              const f = NODE_MAP[from];
              const t = NODE_MAP[to];
              if (!f || !t) return null;
              const sameLane = from[0] === to[0];
              const stroke = sameLane ? TEAL : SAND;
              const opacity = sameLane ? 0.5 : 0.28;
              return (
                <line
                  key={`e${i}`}
                  x1={f.x}
                  y1={f.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={stroke}
                  strokeWidth={sameLane ? "1.4" : "0.9"}
                  opacity={opacity}
                />
              );
            })}

            {/* nodes */}
            {NODES.map((n) => {
              const isTip = n.emphasis === "tip";
              const isAnchor = n.emphasis === "anchor";
              const r = isTip ? 11 : isAnchor ? 9 : 6.5;
              const fill = isTip ? TEAL : isAnchor ? SAND : GRAY_900;
              const stroke = isTip ? TEAL : isAnchor ? SAND : TEAL;
              const strokeWidth = isTip ? 0 : 1.8;
              const opacity = isTip ? 1 : isAnchor ? 0.95 : 0.78;
              return (
                <g key={n.id}>
                  {isTip && (
                    <circle
                      cx={n.x}
                      cy={n.y}
                      r={r + 8}
                      fill={TEAL}
                      opacity="0.16"
                    />
                  )}
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={r}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                  />
                </g>
              );
            })}

          </svg>

          {/* direction indicator — overlaid div, since next/og doesn't render SVG <text> */}
          <div
            style={{
              position: "absolute",
              right: s(40),
              bottom: s(80),
              display: "flex",
              fontSize: s(13),
              fontWeight: 700,
              letterSpacing: s(3),
              color: TEAL,
              opacity: 0.6,
            }}
          >
            ORDER →
          </div>

          {/* legend bottom-left */}
          <div
            style={{
              position: "absolute",
              bottom: s(40),
              left: s(60),
              display: "flex",
              gap: s(24),
              fontSize: s(13),
              fontWeight: 700,
              letterSpacing: s(2),
              color: "rgba(255,255,255,0.45)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
              <div style={{ display: "flex", width: s(10), height: s(10), borderRadius: 999, background: TEAL }} />
              <span style={{ display: "flex" }}>TIP BLOCKS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
              <div style={{ display: "flex", width: s(10), height: s(10), borderRadius: 999, background: SAND }} />
              <span style={{ display: "flex" }}>ANCHORS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: s(8) }}>
              <div
                style={{
                  display: "flex",
                  width: s(16),
                  height: s(2),
                  background: SAND,
                  opacity: 0.5,
                }}
              />
              <span style={{ display: "flex" }}>CROSS-LANE MERGE</span>
            </div>
          </div>
        </div>

        {/* RIGHT — typography column, ~42% width */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "42%",
            height: "100%",
            justifyContent: "center",
            padding: `${s(54)}px ${s(70)}px ${s(54)}px ${s(20)}px`,
            position: "relative",
          }}
        >
          {/* eyebrow */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: s(12),
              fontSize: s(14),
              fontWeight: 700,
              letterSpacing: s(5),
              color: SAND,
              marginBottom: s(20),
            }}
          >
            <div
              style={{
                display: "flex",
                width: s(40),
                height: s(2),
                background: SAND,
              }}
            />
            ORDERED BY THE NETWORK
          </div>

          {/* hero — three stacked lines */}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.92 }}>
            <div
              style={{
                display: "flex",
                fontSize: s(132),
                fontWeight: 900,
                letterSpacing: s(-3),
                color: "#fff",
              }}
            >
              No
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(132),
                fontWeight: 900,
                letterSpacing: s(-3),
                color: TEAL,
                textShadow: `0 0 ${s(60)}px rgba(107,209,195,0.4)`,
              }}
            >
              sequencer.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(78),
                fontWeight: 800,
                letterSpacing: s(-1),
                color: "rgba(255,255,255,0.45)",
                marginTop: s(8),
              }}
            >
              Just Kaspa.
            </div>
          </div>

          {/* divider */}
          <div
            style={{
              display: "flex",
              width: s(120),
              height: s(2),
              background: BRONZE,
              marginTop: s(32),
              marginBottom: s(22),
            }}
          />

          {/* 3-line manifesto */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: s(12),
              fontSize: s(22),
              fontWeight: 500,
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
              <div style={{ display: "flex", fontSize: s(18), color: SAND, fontWeight: 900 }}>01</div>
              <span style={{ display: "flex" }}>Multitude = your own EVM appchain</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
              <div style={{ display: "flex", fontSize: s(18), color: SAND, fontWeight: 900 }}>02</div>
              <span style={{ display: "flex" }}>Ordered by Kaspa's BlockDAG PoW</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: s(12) }}>
              <div style={{ display: "flex", fontSize: s(18), color: SAND, fontWeight: 900 }}>03</div>
              <span style={{ display: "flex" }}>No vendor sets, no MEV middleman</span>
            </div>
          </div>

          {/* footer block — CTA + INS attribution */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
              gap: s(10),
              paddingTop: s(28),
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: s(12),
                fontSize: s(26),
                fontWeight: 900,
              }}
            >
              <span style={{ display: "flex", color: YELLOW }}>MULTITUDE</span>
              <span style={{ display: "flex", color: "rgba(255,255,255,0.3)" }}>·</span>
              <span style={{ display: "flex", color: "#fff" }}>igralabs.com/multitude</span>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: s(13),
                fontWeight: 700,
                letterSpacing: s(2),
                color: "rgba(255,255,255,0.4)",
              }}
            >
              @IgraNameService · spotlighting @IgraLabs · insdomains.org
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
