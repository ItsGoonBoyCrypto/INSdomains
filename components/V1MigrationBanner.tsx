"use client";

/**
 * V1 → V2 Migration banner
 *
 * Shows on /domains (and via the auto-pop sibling on the homepage post-V2-launch)
 * for any wallet that holds at least one V1 .igra NFT that hasn't yet been
 * migrated to V2 Forever. One click → wagmi sends `claimV1Forever(v1TokenId,
 * target)` against the V2 Registry. Caller pays only gas; the V2 NFT is
 * grandfathered Forever per the Path-A migration model locked 2026-05-02.
 *
 * Gating:
 *   - REGISTRY_V2_ADDRESS must be set (V2 deployed)
 *   - either NEXT_PUBLIC_INS_V2_ENABLED=true (public launch) OR caller is
 *     the admin wallet (so we can dogfood the migration UI privately first)
 *
 * Hide forever per-tokenId after a successful migration via localStorage
 * (the on-chain `migrated[v1TokenId]` mapping is the source of truth — this
 * cache just spares us a chain read on subsequent page loads).
 */

import { useEffect, useState, useMemo } from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Sparkles, Loader2, Check, ExternalLink, ArrowRight } from "lucide-react";
import {
  REGISTRY_ADDRESSES, REGISTRY_V2_ADDRESS, REGISTRY_V2_ABI, REGISTRY_ABI,
  isV2Deployed, isV2Enabled,
} from "@/lib/contracts";
import { isAdmin } from "@/lib/admin";

const EXPLORER = process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";
const MIGRATED_CACHE_KEY = "ins.v2.migrated.v1tokens";

type V1Holding = {
  v1TokenId: bigint;
  label: string;
  alreadyMigrated: boolean;
};

export function V1MigrationBanner({ v1TokenIds }: { v1TokenIds: bigint[] }) {
  const { address } = useAccount();
  const allowed = isV2Deployed() && (isV2Enabled() || isAdmin(address ?? null));

  // Read each V1 tokenId's label + V2's `migrated[id]` flag in one batch.
  const reads = useReadContracts({
    allowFailure: true,
    contracts: useMemo(() => {
      if (!allowed || !address || v1TokenIds.length === 0) return [];
      return v1TokenIds.flatMap((id) => [
        {
          address: REGISTRY_ADDRESSES.igra,
          abi: REGISTRY_ABI,
          functionName: "labelOf" as const,
          args: [id] as const,
        },
        {
          address: REGISTRY_V2_ADDRESS,
          abi: REGISTRY_V2_ABI,
          functionName: "migrated" as const,
          args: [id] as const,
        },
      ]);
    }, [allowed, address, v1TokenIds]),
    query: { enabled: allowed && v1TokenIds.length > 0 },
  });

  const holdings: V1Holding[] = useMemo(() => {
    if (!reads.data) return [];
    return v1TokenIds.map((id, i) => {
      const labelRes = reads.data?.[i * 2];
      const migRes = reads.data?.[i * 2 + 1];
      return {
        v1TokenId: id,
        label: (labelRes?.status === "success" ? (labelRes.result as string) : "") || "",
        alreadyMigrated: migRes?.status === "success" ? (migRes.result as boolean) : false,
      };
    });
  }, [reads.data, v1TokenIds]);

  const eligible = holdings.filter((h) => !h.alreadyMigrated && h.label.length > 0);

  if (!allowed) return null;
  if (reads.isLoading && eligible.length === 0) return null;
  if (eligible.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan/10 p-5 shadow-[0_0_60px_rgba(52,211,153,0.10)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-white">
              {eligible.length === 1
                ? "Free Forever upgrade ready"
                : `${eligible.length} free Forever upgrades ready`}
            </h3>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              gas only
            </span>
          </div>
          <p className="mt-1.5 text-sm text-white/65">
            We&rsquo;ve shipped V2 of the .igra Registry with a dual Forever / Annual model.{" "}
            {eligible.length === 1
              ? "Your existing V1 name is grandfathered into V2 Forever for the cost of one transaction."
              : "Your existing V1 names are grandfathered into V2 Forever for the cost of one transaction each."}{" "}
            V1 NFTs stay in your wallet too — this just lets wallets that follow V2 render your name natively.
          </p>

          <div className="mt-4 space-y-2">
            {eligible.map((h) => (
              <MigrationRow key={h.v1TokenId.toString()} holding={h} />
            ))}
          </div>

          <p className="mt-3 text-[11px] text-white/35">
            Single-tx · no payment · uses{" "}
            <code className="font-mono text-white/55">claimV1Forever(v1TokenId, target)</code>{" "}
            on the V2 Registry.
          </p>
        </div>
      </div>
    </div>
  );
}

function MigrationRow({ holding }: { holding: V1Holding }) {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;
  const [doneLocal, setDoneLocal] = useState(false);

  // Write success → mark complete, append to localStorage cache so we
  // don't re-render this row on next load (chain re-read will agree).
  useEffect(() => {
    if (!isConfirmed) return;
    setDoneLocal(true);
    try {
      const raw = localStorage.getItem(MIGRATED_CACHE_KEY);
      const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
      set.add(holding.v1TokenId.toString());
      localStorage.setItem(MIGRATED_CACHE_KEY, JSON.stringify([...set]));
    } catch { /* private mode — non-fatal */ }
  }, [isConfirmed, holding.v1TokenId]);

  const onClaim = () => {
    if (!address) return;
    writeContract({
      address: REGISTRY_V2_ADDRESS,
      abi: REGISTRY_V2_ABI,
      functionName: "claimV1Forever",
      args: [holding.v1TokenId, address],
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-cyan/10 text-cyan font-mono text-xs font-bold">
          #{holding.v1TokenId.toString()}
        </div>
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold text-white truncate">
            {holding.label}.igra
          </div>
          <div className="text-[10px] uppercase tracking-wider text-white/40">
            V1 → V2 Forever
          </div>
        </div>
      </div>

      {doneLocal ? (
        <a
          href={hash ? `${EXPLORER}/tx/${hash}` : "#"}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300"
        >
          <Check className="h-3 w-3" /> Migrated
          {hash && <ExternalLink className="h-3 w-3 opacity-60" />}
        </a>
      ) : (
        <div className="flex items-center gap-1.5">
          <button
            onClick={onClaim}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {busy ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {isPending ? "Confirm…" : "Mining…"}
              </>
            ) : (
              <>
                Claim <ArrowRight className="h-3 w-3" />
              </>
            )}
          </button>
          {error && (
            <button
              onClick={reset}
              title={error.message}
              className="rounded-lg bg-red-500/10 px-2 py-1.5 text-[10px] font-semibold text-red-300 hover:bg-red-500/20"
            >
              retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
