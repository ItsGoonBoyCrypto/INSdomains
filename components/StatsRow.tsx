"use client";

import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import {
  REGISTRY_V2_ADDRESS, REGISTRY_V2_ABI, MARKETPLACE_V2_ADDRESS,
  MARKETPLACE_ABI,
} from "@/lib/contracts";

/**
 * Homepage stats — V2-only on-chain reads.
 *
 *   - Names registered    — totalSupply() on V2 Registry
 *   - Unique owners       — distinct ownerOf() across every V2 token
 *   - Active listings     — getActiveListing().active across V2 Marketplace
 *   - Forever tier        — literal ∞ (Forever-tier names never expire)
 *
 * V1 (legacy 14 names on 0x42c2f5…) is intentionally excluded — V2 is the
 * active product surface and showing the deprecated V1 numbers adds
 * confusion for non-technical visitors. Existing V1 holders still see
 * their NFTs in /domains; this just keeps the homepage clean.
 *
 * Auto-refreshes every 30s so the page stays current as mints land.
 */
export function StatsRow() {
  const POLL_MS = 30_000;
  const ZERO = "0x0000000000000000000000000000000000000000";
  const v2Live = REGISTRY_V2_ADDRESS !== ZERO;

  // 1) totalSupply on V2 Registry
  const supplyRead = useReadContracts({
    contracts: v2Live
      ? [{
          address: REGISTRY_V2_ADDRESS,
          abi: REGISTRY_V2_ABI,
          functionName: "totalSupply",
        } as const]
      : [],
    query: { enabled: v2Live, staleTime: POLL_MS, refetchInterval: POLL_MS },
  });

  const totalNames = (() => {
    const r = supplyRead.data?.[0];
    return r?.status === "success" ? Number(r.result as bigint) : 0;
  })();

  // 2) Build a (tokenId) grid once supply arrives
  const tokenIds = useMemo<bigint[]>(() => {
    const arr: bigint[] = [];
    for (let i = 1; i <= totalNames; i++) arr.push(BigInt(i));
    return arr;
  }, [totalNames]);

  // 3) ownerOf across every V2 token (one multicall batch)
  const ownerReads = useReadContracts({
    contracts: tokenIds.map((tokenId) => ({
      address: REGISTRY_V2_ADDRESS,
      abi: REGISTRY_V2_ABI,
      functionName: "ownerOf",
      args: [tokenId],
    } as const)),
    query: { enabled: v2Live && tokenIds.length > 0, staleTime: POLL_MS, refetchInterval: POLL_MS },
  });

  // 4) Active listing per token on V2 Marketplace (one multicall batch)
  const listingReads = useReadContracts({
    contracts: tokenIds.map((tokenId) => ({
      address: MARKETPLACE_V2_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "getActiveListing",
      args: [tokenId],
    } as const)),
    query: { enabled: v2Live && tokenIds.length > 0, staleTime: POLL_MS, refetchInterval: POLL_MS },
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

  const ready = !supplyRead.isLoading;
  const ownersReady = ready && !ownerReads.isLoading;
  const listingsReady = ready && !listingReads.isLoading;

  return (
    <section className="relative mt-32 w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-cyan/[0.04] via-white/[0.02] to-plum/[0.04] px-6 py-14">
      <div className="grid grid-cols-2 gap-y-10 md:grid-cols-4">
        <Stat
          value={ready ? totalNames.toLocaleString() : <Skeleton />}
          label="names registered"
          sub="on .igra"
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
