"use client";

/**
 * Claim-reserved modal — pops when a user tries to register a .igra (or
 * legacy .ins / .ikas) name that's currently held by the INS team's
 * Treasury Safe (`TREASURY_SAFE_ADDRESS`).
 *
 * UX rationale: pre-launch the team admin-minted a small batch of names
 * to the Safe for ecosystem allocation (project handles, DEX names,
 * exchange names, brand-collision avoidance). The right way for the
 * legitimate owner to get those isn't to "buy" them on the marketplace —
 * it's to DM the team and we transfer for free. This modal makes that
 * path the obvious choice instead of the user thinking the name is
 * permanently lost.
 *
 * The "DM" links open Telegram / X intents directly. Standard pattern,
 * no captcha or login wall on our side.
 */

import { useEffect, useRef } from "react";
import { X, Gift, Send, ExternalLink } from "lucide-react";

const TG_USERNAME = process.env.NEXT_PUBLIC_TG_USERNAME?.replace(/^@/, "") || "GoonBoyCrypto";
const TG_CHANNEL  = process.env.NEXT_PUBLIC_TG_CHANNEL?.replace(/^@/, "")  || "IgraNameService";
const X_HANDLE    = process.env.NEXT_PUBLIC_X_HANDLE?.replace(/^@/, "")    || "IgraNameService";

export function ClaimReservedModal({
  open, onClose, name,
}: {
  open: boolean;
  onClose: () => void;
  /** The full name being claimed, e.g. "kasware.igra". */
  name: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Pre-filled DM messages so the user doesn't have to think about what to write.
  const tgMessage = `Hi! I'd like to claim the reserved name "${name}" — happy to verify ownership of the brand/handle.`;
  const xMessage = `Hi @${X_HANDLE} — I'd like to claim the reserved name "${name}" 🟣`;

  // Telegram supports `?text=` on direct user URLs (opens with a draft).
  // X uses /messages/compose for DMs but most users land on the profile
  // tab + click "Message" themselves; we link to the profile to be safe.
  const tgDmUrl = `https://t.me/${TG_USERNAME}?text=${encodeURIComponent(tgMessage)}`;
  const tgChannelUrl = `https://t.me/${TG_CHANNEL}`;
  const xProfileUrl = `https://x.com/${X_HANDLE}`;
  const xIntentUrl = `https://x.com/intent/post?text=${encodeURIComponent(xMessage)}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="claim-reserved-title"
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-10 sm:py-16"
    >
      {/* backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* dialog */}
      <div
        ref={dialogRef}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-emerald-500/30 bg-ink shadow-[0_0_60px_rgba(52,211,153,0.20)]"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-1.5 text-white/70 hover:bg-white/20 hover:text-white"
          aria-label="Close claim dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* gradient header */}
        <div className="bg-gradient-to-br from-emerald-500/15 via-transparent to-cyan/10 px-6 pt-6 pb-4 text-center">
          <div className="mx-auto inline-flex items-center justify-center rounded-2xl bg-emerald-500/20 p-3 text-emerald-300">
            <Gift className="h-6 w-6" />
          </div>
          <h2
            id="claim-reserved-title"
            className="mt-3 text-2xl font-black tracking-tight text-white"
          >
            <span className="ins-gradient-text">{name}</span> is reserved
          </h2>
          <p className="mt-2 text-sm text-white/65">
            This name is held by the INS team for ecosystem allocation —
            project handles, exchanges, brand-collision avoidance.
          </p>
        </div>

        {/* Claim explanation */}
        <div className="px-6 pt-2 pb-3">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 text-sm leading-relaxed text-white/80">
            <strong className="text-emerald-300">If this is your project, brand, or handle</strong>
            {" "}— DM us to claim it <span className="text-emerald-300 font-bold">free of charge</span>.
            We&rsquo;ll verify (a tweet from the brand handle, a project repo
            commit, a Telegram admin message — whatever proves it&rsquo;s
            you), then transfer the NFT to your wallet at no cost.
          </div>
          <p className="mt-3 text-[11px] text-white/40">
            Most claims processed within 24 hours. No KYC, no fees, no
            paperwork. Just proof you&rsquo;re the legitimate owner.
          </p>
        </div>

        {/* CTAs */}
        <div className="space-y-2 px-6 pb-6">
          <a
            href={tgDmUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan px-5 py-3 text-sm font-bold text-black transition hover:bg-cyan/90"
          >
            <TgIcon className="h-4 w-4" />
            DM on Telegram
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
          <a
            href={xProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90"
          >
            <XIcon className="h-4 w-4" />
            Message on X
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
          <div className="flex items-center justify-between gap-3 pt-1">
            <a
              href={tgChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-white/45 hover:text-cyan"
            >
              Or join @{TG_CHANNEL} channel →
            </a>
            <button
              onClick={onClose}
              className="text-[11px] text-white/45 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* footnote */}
        <div className="border-t border-white/5 bg-white/[0.02] px-6 py-2.5 text-center text-[10px] uppercase tracking-wider text-white/40">
          Held by Treasury Safe ·{" "}
          <a
            href="https://explorer.igralabs.com/address/0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cyan"
          >
            verify on chain
          </a>
        </div>
      </div>
    </div>
  );
}

/** Telegram paper-airplane glyph. */
function TgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M22 2 2 11l7 2 2 7 11-18Zm-3 4-9 9-3-1 12-8Z" />
    </svg>
  );
}

/** X (post-Twitter) glyph. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M17.53 3H21l-7.41 8.47L22 21h-6.83l-5.35-6.51L3.55 21H.07l7.96-9.1L0 3h7.04l4.84 5.97L17.53 3Zm-2.4 16h2.05L7 5H4.83l10.3 14Z" />
    </svg>
  );
}
