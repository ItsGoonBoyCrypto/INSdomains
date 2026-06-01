"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import {
  REGISTRY_ADDRESSES, REGISTRY_ABI,
  MARKETPLACE_ADDRESSES, MARKETPLACE_ABI,
  REGISTRY_V2_ADDRESS, REGISTRY_V2_ABI, MARKETPLACE_V2_ADDRESS,
  LIVE_TLDS, type Tld,
} from "@/lib/contracts";

/**
 * Homepage stats — on-chain reads across BOTH V1 + V2 registries.
 *
 *   - Names registered    — Σ totalSupply() V1 + totalSupply() V2
 *   - Unique owners       — count of distinct ownerOf() across V1 + V2
 *   - Active listings     — Σ getActiveListing().active across V1 + V2 marketplaces
 *   - Renewal fees, ever  — literal 0 (hard-coded: Registry has no renewal function)
 *
 * Auto-refreshes every 30s so the homepage stays current as mints land.
 * Pre 2026-05-30: only read V1 → showed 14 names while V2 had ~215 unread.
 */
export function StatsRow() {
  const POLL_MS = 30_000;
  const v2Live = REGISTRY_V2_ADDRESS !== "0x0000000000000000000000000000000000000000";

  // 1) totalSupply across V1 (every live TLD) + V2
  const supplyReads = useReadContracts({
    contracts: [
      ...LIVE_TLDS.map((tld) => ({
        address: REGISTRY_ADDRESSES[tld],
        abi: REGISTRY_ABI,
        functionName: "totalSupply",
      } as const)),
      ...(v2Live
        ? [{
            address: REGISTRY_V2_ADDRESS,
            abi: REGISTRY_V2_ABI,
            functionName: "totalSupply",
          } as const]
        : []),
    ],
    query: { enabled: LIVE_TLDS.length > 0, staleTime: POLL_MS, refetchInterval: POLL_MS },
  });

  const supplyByTld: Record<Tld, number> = { ins: 0, igra: 0, ikas: 0 };
  LIVE_TLDS.forEach((tld, i) => {
    const r = supplyReads.data?.[i];
    if (r?.status === "success") supplyByTld[tld] = Number(r.result as bigint);
  });
  const v2Supply = v2Live
    ? (() => {
        const r = supplyReads.data?.[LIVE_TLDS.length];
        return r?.status === "success" ? Number(r.result as bigint) : 0;
      })()
    : 0;
  const v1Total = LIVE_TLDS.reduce((sum, t) => sum + supplyByTld[t], 0);
  const totalNames = v1Total + v2Supply;

  // 2) (tld | "v2", tokenId) grid once supplies arrive
  type GridItem =
    | { source: "v1"; tld: Tld; tokenId: bigint }
    | { source: "v2"; tokenId: bigint };
  const grid = useMemo<GridItem[]>(() => {
    const arr: GridItem[] = [];
    for (const tld of LIVE_TLDS) {
      for (let i = 1; i <= supplyByTld[tld]; i++) {
        arr.push({ source: "v1", tld, tokenId: BigInt(i) });
      }
    }
    for (let i = 1; i <= v2Supply; i++) {
      arr.push({ source: "v2", tokenId: BigInt(i) });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplyByTld.ins, supplyByTld.igra, supplyByTld.ikas, v2Supply]);

  // 3) ownerOf across V1 + V2 (one multicall batch)
  const ownerReads = useReadContracts({
    contracts: grid.map((item) =>
      item.source === "v1"
        ? ({
            address: REGISTRY_ADDRESSES[item.tld],
            abi: REGISTRY_ABI,
            functionName: "ownerOf",
            args: [item.tokenId],
          } as const)
        : ({
            address: REGISTRY_V2_ADDRESS,
            abi: REGISTRY_V2_ABI,
            functionName: "ownerOf",
            args: [item.tokenId],
          } as const),
    ),
    query: { enabled: grid.length > 0, staleTime: POLL_MS, refetchInterval: POLL_MS },
  });

  // 4) Active listing per token per marketplace (one multicall batch)
  const listingReads = useReadContracts({
    contracts: grid.map((item) =>
      item.source === "v1"
        ? ({
            address: MARKETPLACE_ADDRESSES[item.tld],
            abi: MARKETPLACE_ABI,
            functionName: "getActiveListing",
            args: [item.tokenId],
          } as const)
        : ({
            // V2 marketplace shares the same ABI as V1.
            address: MARKETPLACE_V2_ADDRESS,
            abi: MARKETPLACE_ABI,
            functionName: "getActiveListing",
            args: [item.tokenId],
          } as const),
    ),
    query: { enabled: grid.length > 0, staleTime: POLL_MS, refetchInterval: POLL_MS },
  });

  const uniqueOwners = useMemo(() => {
    if (!ownerReads.data) return 0;
    const set = new Set<string>();
    for (const r of ownerReads.data) {
      if (r?.status === "success") set.add(String(r.result).toLowerCase());
    }
    return set.size;
  }, [ownerReads.data]);

  const activeListings = useMemo(() => {
    if (!listingReads.data) return 0;
    let n = 0;
    for (const r of listingReads.data) {
      if (r?.status === "success") {
        const l = r.result as { active: boolean } | undefined;
        if (l?.active) n++;
      }
    }
    return n;
  }, [listingReads.data]);

  const ready = !supplyReads.isLoading;
  const ownersReady = ready && !ownerReads.isLoading;
  const listingsReady = ready && !listingReads.isLoading;

  // Sub-label honesty: when V2 dominates supply, show that nuance so
  // the "across 1 TLD" line doesn't look misleading next to a big number.
  const namesSub = v2Live && v2Supply > 0
    ? `${v1Total} legacy + ${v2Supply} on V2`
    : (LIVE_TLDS.length === 3
        ? "across .ins / .igra / .ikas"
        : `across ${LIVE_TLDS.length} TLDs`);

  return (
    <section className="relative mt-32 w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-cyan/[0.04] via-white/[0.02] to-plum/[0.04] px-6 py-14">
      <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
        <Stat
          value={ready ? totalNames.toLocaleString() : <Skeleton />}
          label="names registered"
          sub={namesSub}
        />
        <Stat
          value={ownersReady ? uniqueOwners.toLocaleString() : <Skeleton />}
          label="unique owners"
        />
        <Stat
          value={listingsReady ? activeListings.toLocaleString() : <Skeleton />}
          label="active listings"
        />
        <Stat value="∞" label="Forever tier · pay once" sub="Annual tier renewable" />
      </div>
    </section>
  );
}

function Stat({
  value, label, sub,
}: { value: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="ins-gradient-text text-5xl font-black tracking-tight sm:text-6xl">
        {value}
      </div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </div>
      {sub && (
        <div className="mt-0.5 text-[10px] text-white/30">
          {sub}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <span className="inline-block h-[1em] w-[2.5ch] animate-pulse rounded bg-white/10 align-middle" />
  );
}
