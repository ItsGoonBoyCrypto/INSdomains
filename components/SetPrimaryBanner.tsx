"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  REVERSE_RESOLVER_V2_ADDRESS,
  REVERSE_RESOLVER_ABI,
} from "@/lib/contracts";
import { Loader2, Star, X, Check, ChevronDown } from "lucide-react";

/**
 * High-visibility CTA banner that nudges V2 holders to set a primary name.
 *
 * Renders ONLY when:
 *   - User holds ≥1 V2 .igra NFT
 *   - User has no primary set on the V2 ReverseResolver
 *
 * Auto-disappears the moment a primary is set (re-reads chain after tx
 * confirmation). Optional in-session dismiss for "I'll do it later" without
 * killing the nudge forever — next page load shows it again until a primary
 * is set on chain.
 *
 * Why it matters:
 *   Without a primary, every reverse-lookup returns "". That means wallets,
 *   block explorers, and CCIP-Read `.eth` integrations have no name to
 *   display. One tx per holder → the entire ecosystem starts populating
 *   with real names. The single highest-leverage launch UX item.
 */

type V2Name = {
  tokenId: bigint;
  label: string;
};

export function SetPrimaryBanner({
  v2Names,
  onPrimaryChange,
}: {
  /** All V2 .igra names the current wallet owns (caller filters from the union list). */
  v2Names: V2Name[];
  /** Callback so the parent can refetch the primary-token read after a tx confirms. */
  onPrimaryChange?: () => void;
}) {
  const { address } = useAccount();
  const [dismissed, setDismissed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Pre-select the most recent mint (highest tokenId) — that's typically
  // the name the user just minted, so the CTA is "set THIS as primary".
  const sorted = useMemo(
    () => [...v2Names].sort((a, b) => (b.tokenId > a.tokenId ? 1 : -1)),
    [v2Names],
  );
  const [selectedTokenId, setSelectedTokenId] = useState<bigint | null>(
    sorted[0]?.tokenId ?? null,
  );

  // Read current primary on V2 RR — banner disappears the moment it's set.
  const { data: currentPrimary, refetch: refetchPrimary } = useReadContract({
    address: REVERSE_RESOLVER_V2_ADDRESS,
    abi: REVERSE_RESOLVER_ABI,
    functionName: "primaryTokenId",
    args: address ? [address] : undefined,
    query: {
      enabled:
        !!address &&
        REVERSE_RESOLVER_V2_ADDRESS !== "0x0000000000000000000000000000000000000000",
    },
  }) as { data: bigint | undefined; refetch: () => void };

  const hasPrimary = currentPrimary !== undefined && currentPrimary !== 0n;

  const { writeContract, data: hash, isPending, error, reset } =
    useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // After the tx mines, refetch the primary so the banner hides itself.
  // Also bubble up so the page can refresh its own primary-by-tld cache.
  useEffect(() => {
    if (!isConfirmed || !hash) return;
    refetchPrimary();
    if (onPrimaryChange) onPrimaryChange();
    // Small delay before reset so the user briefly sees the "Primary set"
    // checkmark state before the banner unmounts.
    const t = setTimeout(reset, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]);

  // If `selectedTokenId` points at a name no longer in the list (e.g. user
  // transferred it before clicking), fall back to the most recent name so
  // the CTA never targets a non-owned token.
  useEffect(() => {
    if (selectedTokenId === null) {
      if (sorted[0]) setSelectedTokenId(sorted[0].tokenId);
      return;
    }
    const stillOwned = sorted.some((n) => n.tokenId === selectedTokenId);
    if (!stillOwned && sorted[0]) {
      setSelectedTokenId(sorted[0].tokenId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted.length]);

  // ── Render gates ────────────────────────────────────────────────
  // Hide if: no wallet, no V2 names, already has a primary, or
  // session-dismissed by the user.
  if (!address) return null;
  if (v2Names.length === 0) return null;
  if (hasPrimary) return null;
  if (dismissed) return null;

  // ── Render ─────────────────────────────────────────────────────

  const busy = isPending || isConfirming;
  const selectedName = sorted.find((n) => n.tokenId === selectedTokenId);

  const onSet = () => {
    if (selectedTokenId === null || busy) return;
    writeContract({
      address: REVERSE_RESOLVER_V2_ADDRESS,
      abi: REVERSE_RESOLVER_ABI,
      functionName: "setPrimary",
      args: [selectedTokenId],
    });
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan/40 bg-gradient-to-br from-cyan/[0.10] via-transparent to-plum/[0.10] p-6 shadow-[0_0_80px_rgba(0,240,255,0.10)] sm:p-7">
      {/* glow accent */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan/15 blur-3xl" />

      {/* Dismiss */}
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss for this session"
        className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-white/45 transition hover:border-white/20 hover:text-white"
        aria-label="Dismiss banner"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        {/* Star icon */}
        <div className="flex-none">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-cyan/30 blur-xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/40 bg-cyan/10">
              <Star className="h-7 w-7 fill-cyan text-cyan" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
            One-time setup
          </div>
          <h2 className="mt-2 text-xl font-black tracking-tight text-white sm:text-2xl">
            Set your primary <span className="ins-gradient-text">.igra</span> identity
          </h2>
          <p className="mt-1.5 text-sm text-white/65">
            Wallets &amp; block explorers will display this name next to your
            address — so people see{" "}
            <span className="font-mono text-cyan/90">
              {selectedName?.label ?? "yourname"}.igra
            </span>{" "}
            instead of <span className="font-mono text-white/40">0x…</span>.
            One tx, ~2 seconds.
          </p>

          {/* Action row */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={onSet}
              disabled={busy || selectedTokenId === null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-ins-gradient px-5 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isPending ? "Confirm in wallet…" : "Setting primary…"}
                </>
              ) : isConfirmed ? (
                <>
                  <Check className="h-4 w-4" />
                  Primary set
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 fill-black" />
                  Set {selectedName?.label ?? "name"}.igra as primary
                </>
              )}
            </button>

            {/* Picker — only show when user has >1 name to choose from */}
            {sorted.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => setPickerOpen((v) => !v)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-3 text-xs font-semibold text-white/75 transition hover:border-cyan/30 hover:text-white"
                  title="Pick a different name"
                >
                  Pick different
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition ${pickerOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {pickerOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-ink/95 p-1 shadow-xl backdrop-blur-xl sm:left-auto sm:right-0 sm:w-64">
                    {sorted.map((n) => {
                      const isSel = n.tokenId === selectedTokenId;
                      return (
                        <button
                          key={n.tokenId.toString()}
                          onClick={() => {
                            setSelectedTokenId(n.tokenId);
                            setPickerOpen(false);
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                            isSel
                              ? "bg-cyan/15 text-cyan"
                              : "text-white/75 hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          <span className="font-mono">{n.label}.igra</span>
                          {isSel && <Check className="h-3.5 w-3.5 flex-none" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <p className="mt-2 text-[11px] text-red-300">
              {error.message.split("\n")[0] || "Tx failed"}
            </p>
          )}

          <p className="mt-3 text-[11px] text-white/40">
            Why? Reverse resolution = address → name. Wallets like MetaMask,
            Kasware &amp; Kastle read this to show your name everywhere. You
            can change it any time, or clear it from{" "}
            <span className="text-white/55">My Names</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
