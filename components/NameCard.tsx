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
 * Inline SVG-based NFT-card preview. Uses SVG so the centered name auto-fits
 * the card via viewBox scaling — no overflow regardless of label length.
 *
 * Mirrors the on-chain Registry _renderSVG visual identity:
 *   - Card surface: glass gradient + subtle border + TLD-coloured glow
 *   - Top-left:  tier pill in TLD accent colour
 *   - Top-right: optional INS #N token-id badge
 *   - Centre:    big gradient name (cyan→plum) + accent-coloured TLD suffix
 *   - Bottom:    "On-chain SVG" + "Permanent · No expiry"
 */
export function NameCard({
  label,
  tld,
  tier = "STANDARD · 500 iKAS",
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
  const suffix = tldSuffix(tld);

  // Single random-but-stable id per render so multiple cards on a page don't
  // collide on gradient defs (SVG <defs> ids must be unique in DOM).
  const gradId = `nc-grad-${tld}-${label}`.replace(/[^a-z0-9-]/gi, "");

  // Estimate: Inter / sans bold avg char width ≈ 0.55 × fontSize.
  // Combined string includes the suffix, so e.g. all of "forever.igra" must fit.
  const combined = `${label}${suffix}`;
  // SVG viewBox is 400×400. Text container is 360 wide (20px padding ea side).
  // Pick fontSize so combined string fits at ~340 to leave a bit of breathing room.
  const targetWidth = 340;
  const charWidth = 0.55;
  const idealFontSize = targetWidth / (combined.length * charWidth);
  // Cap upper bound at 80 so 2-3 char names don't go absurdly large.
  const labelFontSize = Math.min(80, Math.max(32, idealFontSize));
  // Suffix slightly smaller for visual hierarchy.
  const suffixFontSize = labelFontSize * 0.7;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        aspectRatio: "1 / 1",
        width: "100%",
        borderRadius: 28,
        overflow: "hidden",
        background:
          "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: `0 0 60px ${accent}26, 0 0 120px ${accent}14, inset 0 0 40px rgba(255,255,255,0.02)`,
      }}
    >
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", width: "100%", height: "100%" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={CYAN} />
            <stop offset="100%" stopColor={PLUM} />
          </linearGradient>
          <radialGradient id={`${gradId}-orb1`} cx="100%" cy="110%" r="70%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.20" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${gradId}-orb2`} cx="0%" cy="-10%" r="55%">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.12" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background orbs (card-scoped) */}
        <rect width="400" height="400" fill={`url(#${gradId}-orb1)`} />
        <rect width="400" height="400" fill={`url(#${gradId}-orb2)`} />

        {/* Top: tier pill */}
        <g transform="translate(28, 28)">
          {/* pill bg */}
          <rect
            width={tier.length * 6.2 + 24}
            height="24"
            rx="12"
            fill={accent}
            fillOpacity="0.10"
            stroke={accent}
            strokeOpacity="0.42"
          />
          <text
            x={(tier.length * 6.2 + 24) / 2}
            y="16"
            fontSize="10.5"
            fontWeight="700"
            fill={accent}
            fontFamily="system-ui, -apple-system, sans-serif"
            textAnchor="middle"
            letterSpacing="1.4"
          >
            {tier.toUpperCase()}
          </text>
        </g>

        {/* Top-right: token id badge */}
        {tokenId !== undefined && tokenId !== null && (
          <g transform="translate(372, 28)">
            <rect
              x={-(`INS #${tokenId}`.length * 6 + 18)}
              width={`INS #${tokenId}`.length * 6 + 18}
              height="22"
              rx="11"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.10)"
            />
            <text
              x={-9}
              y="15"
              fontSize="11"
              fontWeight="600"
              fill="rgba(255,255,255,0.55)"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              textAnchor="end"
            >
              INS #{tokenId}
            </text>
          </g>
        )}

        {/* Centre: name + suffix */}
        <g transform="translate(200, 215)">
          {/* Use textAnchor='middle' so we can build label + suffix in two
              <tspan> blocks that share a single baseline + colour fade. */}
          <text
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="900"
            letterSpacing="-1"
          >
            <tspan
              fontSize={labelFontSize}
              fill={`url(#${gradId})`}
              dominantBaseline="middle"
            >
              {label}
            </tspan>
            <tspan
              fontSize={suffixFontSize}
              fill={accent}
              fillOpacity="0.95"
              dominantBaseline="middle"
              dx="2"
            >
              {suffix}
            </tspan>
          </text>
        </g>

        {/* Bottom: meta row */}
        <g transform="translate(0, 372)">
          {/* On-chain SVG (left) */}
          <circle cx="32" cy="0" r="3.5" fill={accent} />
          <text
            x="42"
            y="4"
            fontSize="12"
            fill="rgba(255,255,255,0.55)"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            On-chain SVG
          </text>

          {/* Permanent · No expiry (right) */}
          <text
            x="372"
            y="4"
            fontSize="12"
            fill="rgba(255,255,255,0.55)"
            textAnchor="end"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            Permanent · No expiry
          </text>
        </g>
      </svg>
    </div>
  );
}
