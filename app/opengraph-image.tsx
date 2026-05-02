import { ImageResponse } from "next/og";

export const alt =
  "INS — Igra Name Service. Permanent .igra names on Igra L2. Pay once in iKAS, own forever.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const INK = "#0a0a0a";

/** Pricing structure (V2 dual model). For now V1 ships Forever-only at the
 *  Forever prices below; V2 adds Annual. The OG card shows both columns so
 *  social previews communicate the full pricing at a glance. */
const TIERS = [
  { len: "1-char", annual: "1,000", forever: "4,000", tag: "ultra-premium" },
  { len: "2-char", annual: "800",   forever: "2,000", tag: "premium" },
  { len: "3-char", annual: "500",   forever: "1,200", tag: "rare" },
  { len: "4-char", annual: "250",   forever: "800",   tag: "uncommon" },
  { len: "5–32",   annual: "50",    forever: "500",   tag: "standard" },
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
                  border: `1px solid ${PLUM}55`,
                  background: `${PLUM}1a`,
                  color: PLUM,
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              >
                FOREVER · 500 iKAS
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

            {/* Centered sample name — "forever.igra" leans on the brand
                promise (no renewals) which is the headline pitch. Explicit
                gap on the suffix to stop the gradient "r" colliding with
                the ".igra" plum at baseline. */}
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
                  fontSize: 96,
                  fontWeight: 900,
                  letterSpacing: -2,
                  backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
                  backgroundClip: "text",
                  color: "transparent",
                  lineHeight: 1.3,
                  paddingBottom: 8,
                  paddingRight: 6,
                }}
              >
                forever
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 60,
                  fontWeight: 700,
                  color: PLUM,
                  letterSpacing: -1,
                  marginLeft: 4,
                }}
              >
                .igra
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

          {/* ── RIGHT: headline + dual-tier pricing table ─────────── */}
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
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -1.5,
                marginBottom: 2,
              }}
            >
              Pay once.
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 34,
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: -1.5,
                color: CYAN,
                marginBottom: 12,
              }}
            >
              Own forever.
            </div>

            {/* Column header — Annual / Forever labels above the pricing rows */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 14px 6px 14px",
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.45)",
                textTransform: "uppercase",
              }}
            >
              <div style={{ display: "flex", width: 110 }}>Length</div>
              <div
                style={{
                  display: "flex",
                  width: 105,
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: "#34d399",
                  }}
                />
                Annual
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: CYAN,
                  }}
                />
                Forever
              </div>
            </div>

            {TIERS.map((t) => (
              <div
                key={t.len}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "7px 14px",
                  marginBottom: 4,
                  borderRadius: 11,
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 110,
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 14,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    {t.len}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 9,
                      letterSpacing: 1.5,
                      color: "rgba(255,255,255,0.4)",
                      textTransform: "uppercase",
                    }}
                  >
                    {t.tag}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    width: 105,
                    alignItems: "baseline",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 18,
                      fontWeight: 800,
                      color: "rgba(52,211,153,0.85)",
                    }}
                  >
                    {t.annual}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    /yr
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 20,
                      fontWeight: 900,
                      color: CYAN,
                    }}
                  >
                    {t.forever}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    once
                  </div>
                </div>
              </div>
            ))}

            {/* Footnote — "all prices in iKAS" + V2 disclaimer */}
            <div
              style={{
                display: "flex",
                marginTop: 8,
                paddingLeft: 14,
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                letterSpacing: 0.3,
              }}
            >
              All prices in iKAS · Annual launches with V2
            </div>
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
