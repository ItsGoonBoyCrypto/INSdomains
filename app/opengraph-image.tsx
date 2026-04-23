import { ImageResponse } from "next/og";

export const alt =
  "INS — Igra Name Service. Forever .ins names on Igra. Pay once in iKAS, own forever.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#0a0a0a";

const TIERS = [
  { len: "2-char", price: "5,000", tag: "ultra-rare" },
  { len: "3-char", price: "500", tag: "rare" },
  { len: "4-char", price: "50", tag: "uncommon" },
  { len: "5–32", price: "10", tag: "standard" },
];

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          backgroundImage: `radial-gradient(900px 600px at 85% 110%, rgba(168,85,247,0.22), transparent 70%), radial-gradient(700px 500px at 5% -10%, rgba(0,240,255,0.18), transparent 70%)`,
          padding: "56px 60px",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
              color: "#000",
              fontSize: 26,
              fontWeight: 900,
              boxShadow: "0 0 24px rgba(0,240,255,0.35)",
            }}
          >
            i
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 4,
              color: "rgba(255,255,255,0.55)",
            }}
          >
            IGRA NAME SERVICE
          </div>
          <div
            style={{
              display: "flex",
              marginLeft: "auto",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 14,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 8,
                height: 8,
                borderRadius: 999,
                background: CYAN,
                boxShadow: `0 0 10px ${CYAN}`,
              }}
            />
            LIVE ON MAINNET
          </div>
        </div>

        {/* Main two-column split */}
        <div style={{ display: "flex", flex: 1, marginTop: 30, gap: 36 }}>
          {/* ── LEFT: NFT card mockup ────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: 500,
              borderRadius: 32,
              padding: 36,
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              position: "relative",
              boxShadow:
                "0 0 60px rgba(0,240,255,0.12), 0 0 100px rgba(168,85,247,0.1)",
            }}
          >
            {/* Top row: tier pill + token id */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 14px",
                  borderRadius: 999,
                  border: `1px solid ${CYAN}55`,
                  background: `${CYAN}1a`,
                  color: CYAN,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              >
                STANDARD · 10 iKAS
              </div>
              <div
                style={{
                  display: "flex",
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 13,
                  fontFamily: "monospace",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                INS #1
              </div>
            </div>

            {/* Centered name */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "center",
                flex: 1,
                marginTop: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 132,
                  fontWeight: 900,
                  letterSpacing: -4,
                  background: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                  backgroundClip: "text",
                  color: "transparent",
                  lineHeight: 1,
                }}
              >
                alice
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 76,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: -2,
                }}
              >
                .ins
              </div>
            </div>

            {/* Bottom card meta row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 20,
                fontSize: 14,
                color: "rgba(255,255,255,0.5)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: PLUM,
                  }}
                />
                <div style={{ display: "flex" }}>On-chain SVG</div>
              </div>
              <div style={{ display: "flex" }}>Permanent · No expiry</div>
            </div>
          </div>

          {/* ── RIGHT: headline + pricing table ─────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: -1.5,
                marginBottom: 2,
              }}
            >
              Pay once in iKAS.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 46,
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: -1.5,
                color: CYAN,
                marginBottom: 22,
              }}
            >
              Own forever.
            </div>

            {TIERS.map((t) => (
              <div
                key={t.len}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  marginBottom: 8,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      width: 78,
                      fontSize: 15,
                      fontWeight: 700,
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {t.len}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 11,
                      letterSpacing: 2,
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    {t.tag}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 22,
                      fontWeight: 900,
                      color: CYAN,
                    }}
                  >
                    {t.price}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 13,
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    iKAS
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 22,
              fontWeight: 800,
              color: "rgba(255,255,255,0.9)",
              letterSpacing: -0.5,
            }}
          >
            insdomains.org
          </div>
          <div
            style={{
              display: "flex",
              gap: 14,
              fontSize: 13,
              letterSpacing: 2,
              color: "rgba(255,255,255,0.45)",
              textTransform: "uppercase",
            }}
          >
            <div style={{ display: "flex" }}>Native on Igra L2</div>
            <div style={{ display: "flex" }}>·</div>
            <div style={{ display: "flex" }}>Kaspa-secured</div>
            <div style={{ display: "flex" }}>·</div>
            <div style={{ display: "flex" }}>No renewals</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
