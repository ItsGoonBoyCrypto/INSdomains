import { tldSuffix, type Tld } from "@/lib/contracts";

const TLD_ACCENT: Record<
  Tld,
  { text: string; border: string; bg: string; pillBg: string; pillBorder: string }
> = {
  ins: {
    text: "text-cyan",
    border: "border-cyan/40",
    bg: "bg-cyan/[0.04]",
    pillBg: "bg-cyan/15",
    pillBorder: "border-cyan/40",
  },
  igra: {
    text: "text-plum",
    border: "border-plum/40",
    bg: "bg-plum/[0.04]",
    pillBg: "bg-plum/15",
    pillBorder: "border-plum/40",
  },
  ikas: {
    text: "text-emerald-300",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/[0.04]",
    pillBg: "bg-emerald-500/15",
    pillBorder: "border-emerald-500/40",
  },
};

/**
 * Reusable visual NFT-card preview for an INS name. Inline JSX (no PNG asset)
 * so it scales cleanly + zero asset overhead. Same look as what gets minted
 * on-chain via the Registry's _renderSVG.
 *
 * Pass `tier` (e.g. "STANDARD · 30 iKAS") + optional `tokenId`. Used as
 * landing-page hero, /app preview, and inline showcase blocks.
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
  const accent = TLD_ACCENT[tld];
  // Auto-scale font so long names still fit
  const sizeClass =
    label.length <= 4
      ? "text-[110px] sm:text-[140px]"
      : label.length <= 8
      ? "text-[80px] sm:text-[100px]"
      : label.length <= 14
      ? "text-[56px] sm:text-[72px]"
      : "text-[40px] sm:text-[52px]";

  return (
    <div
      className={`relative aspect-square w-full overflow-hidden rounded-3xl border bg-white/[0.02] ${accent.border} shadow-[0_0_60px_rgba(0,240,255,0.08),0_0_100px_rgba(168,85,247,0.07)] ${className}`}
    >
      {/* Background orb glow */}
      <div className="bg-orb absolute inset-0 opacity-70" />
      <div className={`absolute inset-x-0 top-0 h-px ${accent.bg.replace("bg-", "bg-")}`} />

      <div className="relative flex h-full flex-col p-6 sm:p-8">
        {/* Top: tier pill + token id */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center rounded-full border ${accent.pillBorder} ${accent.pillBg} px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${accent.text}`}
          >
            {tier}
          </span>
          {tokenId !== undefined && tokenId !== null && (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-white/55">
              INS #{tokenId}
            </span>
          )}
        </div>

        {/* Centred name */}
        <div className="flex flex-1 items-baseline justify-center px-2">
          <span
            className={`${sizeClass} ins-gradient-text font-black leading-none tracking-tight`}
          >
            {label}
          </span>
          <span
            className={`${accent.text} font-bold`}
            style={{ fontSize: "0.55em", letterSpacing: "-0.02em" }}
          >
            {tldSuffix(tld)}
          </span>
        </div>

        {/* Bottom meta row */}
        <div className="flex items-center justify-between text-[10px] text-white/45 sm:text-xs">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${accent.text.replace("text-", "bg-")}`} />
            <span>On-chain SVG</span>
          </div>
          <span className="opacity-80">Permanent · No expiry</span>
        </div>
      </div>
    </div>
  );
}
