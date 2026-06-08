"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Check, Sparkles, ExternalLink, Star, Loader2 } from "lucide-react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  REGISTRY_ADDRESSES,
  REGISTRY_V2_ADDRESS,
  REVERSE_RESOLVER_V2_ADDRESS,
  REVERSE_RESOLVER_ABI,
} from "@/lib/contracts";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://insdomains.org";
// Once the official @ handle exists, set NEXT_PUBLIC_X_HANDLE in env (e.g. "InsDomains")
// and the tweet copy will tag it. The chain itself is referenced via the
// $Igra cashtag (better discovery on X than the @IgraNetwork mention).
const X_HANDLE = process.env.NEXT_PUBLIC_X_HANDLE?.replace(/^@/, "") || "";
const CHAIN_CASHTAG = "$Igra";
const EXPLORER =
  process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";

/**
 * Share-to-X modal that auto-pops on a successful mint. Pre-loads the NFT
 * image (so the user sees the visual before they click) and opens an X
 * intent in a new tab with a prefilled tweet.
 *
 * Fully dismissible. Pressing Esc, the backdrop, or the close button hides
 * it for the rest of the page lifetime (a fresh mint will pop a fresh modal).
 */
export function ShareToXModal({
  open,
  onClose,
  names,           // 1+ minted names, e.g. ["alice.igra"] or ["alice.igra", "alice.ins"]
  primaryTokenId,  // tokenId of the headline NFT (used for the visual)
  registryVersion = "v1", // "v2" for V2 mints — appends ?v=2 to the image URL
                          // so the right Registry is read (V1+V2 ids collide)
}: {
  open: boolean;
  onClose: () => void;
  names: string[];
  primaryTokenId: bigint | number | string | null;
  registryVersion?: "v1" | "v2";
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // lock body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || names.length === 0) return null;

  const primary = names[0];
  const tokenIdStr = primaryTokenId != null ? String(primaryTokenId) : null;
  // Modal preview + X intent target use the 1200px render so the card stays
  // crisp on retina displays + when X expands the embedded image. The TG bot
  // continues to fetch the default 200px (no `?size=`) for a compact card.
  // V2 mints pass ?v=2 so the route reads V2's labelOf instead of V1's.
  const imgSrc = tokenIdStr
    ? `${SITE}/api/nft-image/${tokenIdStr}?size=1200${registryVersion === "v2" ? "&v=2" : ""}`
    : null;

  const tagLine = X_HANDLE
    ? `Powered by @${X_HANDLE} on ${CHAIN_CASHTAG}.`
    : `Built on ${CHAIN_CASHTAG}.`;

  const namesList =
    names.length === 1
      ? primary
      : `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;

  const tweetText =
    names.length === 1
      ? `Just minted my .igra name → ${primary} 🟣\n\nPermanent on-chain identity. No renewals, ever.\n\n${tagLine}\n\nClaim yours:`
      : `Just minted ${namesList} 🟣\n\nPermanent on-chain identity on Igra. No renewals, ever.\n\n${tagLine}\n\nClaim yours:`;

  const intentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
    tweetText,
  )}&url=${encodeURIComponent(SITE)}`;

  // Igra explorer (Blockscout-flavoured) deep-link for this specific NFT.
  // Path: /token/<registry>/instance/<tokenId>. Falls back to the contract
  // page if we somehow don't have a token id.
  //
  // CRITICAL: V1 and V2 are SEPARATE ERC-721 contracts at different
  // addresses — token #232 doesn't exist on V1 (V1 only has ~14 tokens),
  // so a V2 mint with the V1 prefix returns a 404 on the explorer.
  // Pick the right registry from `registryVersion` so the link resolves.
  // Reported by @pavel from Igra Labs after he hit the V1 URL for V2 #232.
  const igraRegistry =
    registryVersion === "v2" ? REGISTRY_V2_ADDRESS : REGISTRY_ADDRESSES.igra;
  const explorerUrl = tokenIdStr
    ? `${EXPLORER}/token/${igraRegistry}/instance/${tokenIdStr}`
    : `${EXPLORER}/address/${igraRegistry}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-x-title"
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
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-[0_0_60px_rgba(168,85,247,0.25)]"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-1.5 text-white/70 hover:bg-white/20 hover:text-white"
          aria-label="Close share dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* gradient header */}
        <div className="bg-gradient-to-br from-cyan/10 via-transparent to-plum/15 px-6 pt-6 pb-3 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            <Check className="h-3 w-3" /> Minted
          </div>
          <h2
            id="share-x-title"
            className="mt-3 text-2xl font-black tracking-tight text-white"
          >
            Welcome to <span className="ins-gradient-text">{primary}</span>
          </h2>
          <p className="mt-2 text-sm text-white/60">
            {names.length > 1
              ? `${names.length} names secured forever. Show the community →`
              : "Your name is forever. Show the community →"}
          </p>
        </div>

        {/* NFT image preview */}
        {imgSrc && (
          <div className="px-6 pt-2 pb-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              {/* skeleton while loading */}
              {!imgLoaded && (
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.04] to-white/[0.02]" />
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt={`${primary} NFT`}
                className="h-full w-full object-cover"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgLoaded(true)}
              />
            </div>
          </div>
        )}

        {/* Set-Primary nudge — only on V2 mints, only when not already
            primary. Renders inline above the share buttons so it's the
            first thing users see post-mint. One-tx → name shows up
            everywhere wallets render reverse resolutions. */}
        {registryVersion === "v2" && tokenIdStr && (
          <SetPrimaryNudge
            tokenIdStr={tokenIdStr}
            label={primary.replace(/\.igra$/i, "")}
          />
        )}

        {/* CTA */}
        <div className="space-y-2 px-6 pb-6">
          <a
            href={intentUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              // close after the user commits to sharing (small delay so the new
              // tab opens first — prevents Safari blocking the intent window)
              setTimeout(onClose, 250);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-white/90"
          >
            <XIcon className="h-4 w-4" />
            Share on X
          </a>
          <Link
            href="/domains"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.08]"
          >
            <Sparkles className="h-4 w-4 text-cyan" />
            View in My Names
          </Link>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-5 py-2.5 text-xs font-semibold text-white/65 transition hover:border-cyan/40 hover:text-cyan"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on Igra Explorer
          </a>
          <button
            onClick={onClose}
            className="block w-full pt-1 text-center text-xs text-white/40 hover:text-white/70"
          >
            Maybe later
          </button>
        </div>

        {/* footnote */}
        {imgSrc && (
          <div className="border-t border-white/5 bg-white/[0.02] px-6 py-2.5 text-center text-[10px] uppercase tracking-wider text-white/40">
            <a
              href={imgSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-white/70"
            >
              Save image <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/** Minimal X (post-Twitter) glyph, sized via tailwind className. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M17.53 3H21l-7.41 8.47L22 21h-6.83l-5.35-6.51L3.55 21H.07l7.96-9.1L0 3h7.04l4.84 5.97L17.53 3Zm-2.4 16h2.05L7 5H4.83l10.3 14Z" />
    </svg>
  );
}

/**
 * Inline post-mint nudge to set the just-minted V2 NFT as the wallet's
 * primary on-chain identity. Reads the V2 ReverseResolver to gate visibility.
 *
 * Hides itself when:
 *   - V2 RR isn't deployed (env unset)
 *   - The current connected wallet already has THIS tokenId as primary
 *   - User clicks the dismiss link (in-modal session state only)
 *
 * Why this lives in the post-mint modal: it's the moment of highest user
 * engagement (they just paid + signed). Asking for one more single-step tx
 * here has dramatically better conversion than expecting them to come back
 * to /domains and find the per-card "Set primary" pill.
 */
function SetPrimaryNudge({
  tokenIdStr,
  label,
}: {
  tokenIdStr: string;
  label: string;
}) {
  const { address } = useAccount();
  const [dismissed, setDismissed] = useState(false);

  const v2RrLive =
    REVERSE_RESOLVER_V2_ADDRESS !== "0x0000000000000000000000000000000000000000";

  // Read current primary on V2 RR. If it already matches this tokenId,
  // the nudge is unnecessary (user already set it on a previous mint).
  const { data: currentPrimary, refetch } = useReadContract({
    address: REVERSE_RESOLVER_V2_ADDRESS,
    abi: REVERSE_RESOLVER_ABI,
    functionName: "primaryTokenId",
    args: address ? [address] : undefined,
    query: { enabled: !!address && v2RrLive },
  }) as { data: bigint | undefined; refetch: () => void };

  const tokenId = (() => {
    try {
      return BigInt(tokenIdStr);
    } catch {
      return null;
    }
  })();

  const alreadyPrimary =
    currentPrimary !== undefined &&
    tokenId !== null &&
    currentPrimary === tokenId;

  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (!isConfirmed || !hash) return;
    refetch();
    const t = setTimeout(reset, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]);

  if (!v2RrLive) return null;
  if (!address) return null;
  if (tokenId === null) return null;
  if (alreadyPrimary) return null;
  if (dismissed) return null;

  const busy = isPending || isConfirming;

  const onClick = () => {
    if (busy || tokenId === null) return;
    writeContract({
      address: REVERSE_RESOLVER_V2_ADDRESS,
      abi: REVERSE_RESOLVER_ABI,
      functionName: "setPrimary",
      args: [tokenId],
    });
  };

  return (
    <div className="mx-6 mb-3 mt-1 rounded-2xl border border-cyan/30 bg-cyan/[0.06] p-3 text-left">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-lg border border-cyan/40 bg-cyan/15">
          <Star className="h-3.5 w-3.5 fill-cyan text-cyan" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-cyan/95">
            One more thing — make this your primary
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/60">
            Wallets &amp; explorers will show{" "}
            <span className="font-mono text-white/80">{label}.igra</span>{" "}
            instead of your <span className="font-mono">0x…</span>. One tx,
            ~2 seconds.
          </p>
          <button
            onClick={onClick}
            disabled={busy}
            className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-cyan/40 bg-cyan/15 px-3 py-2 text-[11px] font-bold text-cyan transition hover:bg-cyan/25 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isPending ? "Confirm in wallet…" : "Setting primary…"}
              </>
            ) : isConfirmed ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Primary set ✓
              </>
            ) : (
              <>
                <Star className="h-3.5 w-3.5 fill-cyan" />
                Set as primary identity
              </>
            )}
          </button>
          {error && (
            <p className="mt-1.5 text-[10px] text-red-300">
              {error.message.split("\n")[0] || "Tx failed"}
            </p>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="mt-1.5 block w-full text-center text-[10px] text-white/40 hover:text-white/60"
          >
            Skip — I&rsquo;ll do it later from My Names
          </button>
        </div>
      </div>
    </div>
  );
}
