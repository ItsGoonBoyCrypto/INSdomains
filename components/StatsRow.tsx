"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import {
  REGISTRY_ADDRESSES, REGISTRY_ABI,
  MARKETPLACE_ADDRESSES, MARKETPLACE_ABI,
  LIVE_TLDS, type Tld,
} from "@/lib/contracts";

/**
 * Homepage stats — fully on-chain reads, refreshed client-side after hydration.
 *   - Names registered    — Σ totalSupply() across the 3 live Registries
 *   - Unique owners       — count of distinct ownerOf() values across every minted token
 *   - Active listings     — Σ getActiveListing().active across the 3 Marketplaces
 *   - Renewal fees, ever  — literal 0 (hard-coded: the Registry has no renewal function)
 *
 * Costs scale as O(3) supply reads + O(total minted) owner + listing reads.
 * React Query caches by default; no polling (pulls once per page load).
 */
export function StatsRow() {
  // 1) totalSupply on every live Registry
  const supplyReads = useReadContracts({
    contracts: LIVE_TLDS.map((tld) => ({
      address: REGISTRY_ADDRESSES[tld],
      abi: REGISTRY_ABI,
      functionName: "totalSupply",
    } as const)),
    query: { enabled: LIVE_TLDS.length > 0, staleTime: 30_000 },
  });

  const supplyByTld: Record<Tld, number> = { ins: 0, igra: 0, ikas: 0 };
  LIVE_TLDS.forEach((tld, i) => {
    const r = supplyReads.data?.[i];
    if (r?.status === "success") supplyByTld[tld] = Number(r.result as bigint);
  });
  const totalNames = LIVE_TLDS.reduce((sum, t) => sum + supplyByTld[t], 0);

  // 2) Build the (tld, tokenId) grid once supplies arrive
  const grid = useMemo(() => {
    const arr: Array<{ tld: Tld; tokenId: bigint }> = [];
    for (const tld of LIVE_TLDS) {
      for (let i = 1; i <= supplyByTld[tld]; i++) {
        arr.push({ tld, tokenId: BigInt(i) });
      }
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplyByTld.ins, supplyByTld.igra, supplyByTld.ikas]);

  // 3) ownerOf across every minted token (one multicall batch)
  const ownerReads = useReadContracts({
    contracts: grid.map(({ tld, tokenId }) => ({
      address: REGISTRY_ADDRESSES[tld],
      abi: REGISTRY_ABI,
      functionName: "ownerOf",
      args: [tokenId],
    } as const)),
    query: { enabled: grid.length > 0, staleTime: 30_000 },
  });

  // 4) Active listing per token per marketplace (one multicall batch)
  const listingReads = useReadContracts({
    contracts: grid.map(({ tld, tokenId }) => ({
      address: MARKETPLACE_ADDRESSES[tld],
      abi: MARKETPLACE_ABI,
      functionName: "getActiveListing",
      args: [tokenId],
    } as const)),
    query: { enabled: grid.length > 0, staleTime: 30_000 },
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

  return (
    <section className="relative mt-32 w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-cyan/[0.04] via-white/[0.02] to-plum/[0.04] px-6 py-14">
      <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
        <Stat
          value={ready ? totalNames.toLocaleString() : <Skeleton />}
          label="names registered"
          sub={LIVE_TLDS.length === 3 ? "across .ins / .igra / .ikas" : `across ${LIVE_TLDS.length} TLDs`}
        />
        <Stat
          value={ownersReady ? uniqueOwners.toLocaleString() : <Skeleton />}
          label="unique owners"
        />
        <Stat
          value={listingsReady ? activeListings.toLocaleString() : <Skeleton />}
          label="active listings"
        />
        <Stat value="0" label="renewal fees, ever" />
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
