import { tldSuffix, type Tld } from "@/lib/contracts";

const CYAN = "#00f0ff";
const PLUM = "#a855f7";
const EMERALD = "#34d399";

const TLD_COLOR: Record<Tld, string> = {
  ins: CYAN,
  igra: PLUM,
  ikas: EMERALD,
};

/**
 * Inline NFT-card preview matching the OG card's left-side visual identity.
 * Uses explicit inline styles (not bg-orb / ins-gradient-text utility classes)
 * so the card's gradients are scoped to the card itself, not the viewport.
 *
 * - Top row: tier pill + token id badge
 * - Centre: large gradient name (cyan → plum) + accent-coloured TLD suffix
 * - Bottom: "On-chain SVG" / "Permanent · No expiry"
 *
 * Auto-scales font for label length so 3-char and 20-char names both fit.
 */
export function NameCard({
  label,
  tld,
  tier = "STANDARD · 30 iKAS",
  tokenId,
  className = "",
}: {
  label: string;
  tld: Tld;
  tier?: string;
  tokenId?: number | string | null;
  className?: string;
}) {
  const accent = TLD_COLOR[tld];

  // Font sizes that fit cleanly inside a square card.
  // Empirically tuned so a 4-char and 12-char label both look balanced.
  const labelStyle = (() => {
    const len = label.length;
    if (len <= 4) return { fontSize: "clamp(72px, 18vw, 132px)" };
    if (len <= 8) return { fontSize: "clamp(48px, 12vw, 92px)" };
    if (len <= 14) return { fontSize: "clamp(36px, 8vw, 64px)" };
    return { fontSize: "clamp(28px, 6vw, 48px)" };
  })();

  const suffixStyle = (() => {
    const len = label.length;
    if (len <= 4) return { fontSize: "clamp(40px, 10vw, 72px)" };
    if (len <= 8) return { fontSize: "clamp(28px, 7vw, 52px)" };
    if (len <= 14) return { fontSize: "clamp(20px, 4.5vw, 36px)" };
    return { fontSize: "clamp(16px, 3.5vw, 28px)" };
  })();

  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: 28,
        overflow: "hidden",
        // Card surface — soft glass gradient
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        // Card-scoped glow that matches the TLD accent
        boxShadow: `0 0 60px ${accent}26, 0 0 120px ${accent}14, inset 0 0 40px rgba(255,255,255,0.02)`,
      }}
    >
      {/* Card-internal radial orbs (NOT viewport-fixed) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(700px 500px at 100% 110%, ${accent}33, transparent 60%), radial-gradient(500px 350px at 0% -10%, ${CYAN}1f, transparent 65%)`,
          pointerEvents: "none",
        }}
      />
      {/* Subtle inner border highlight */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 28,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "clamp(20px, 5%, 36px)",
        }}
      >
        {/* Top: tier pill + token id badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${accent}66`,
              background: `${accent}1a`,
              color: accent,
              fontSize: "clamp(9px, 1.6vw, 12px)",
              fontWeight: 700,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {tier}
          </span>
          {tokenId !== undefined && tokenId !== null && (
            <span
              style={{
                display: "inline-flex",
                padding: "5px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
                fontSize: "clamp(9px, 1.5vw, 12px)",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                color: "rgba(255,255,255,0.55)",
                whiteSpace: "nowrap",
              }}
            >
              INS #{tokenId}
            </span>
          )}
        </div>

        {/* Centre: name + TLD suffix */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "baseline",
            justifyContent: "center",
            gap: "0.08em",
            paddingInline: "4%",
            paddingBlock: 12,
          }}
        >
          <span
            style={{
              ...labelStyle,
              fontWeight: 900,
              letterSpacing: "-0.03em",
              lineHeight: 1,
              backgroundImage: `linear-gradient(120deg, ${CYAN} 0%, ${PLUM} 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            }}
          >
            {label}
          </span>
          <span
            style={{
              ...suffixStyle,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1,
              color: accent,
              opacity: 0.88,
            }}
          >
            {tldSuffix(tld)}
          </span>
        </div>

        {/* Bottom meta row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "clamp(10px, 1.5vw, 13px)",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: accent,
                display: "inline-block",
              }}
            />
            On-chain SVG
          </span>
          <span>Permanent · No expiry</span>
        </div>
      </div>
    </div>
  );
}
