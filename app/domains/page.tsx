"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import {
  Copy, Check, Wallet, ExternalLink, Plus, Star,
  Settings2, Send, GitBranch, Image as ImageIcon, Save, Loader2, History,
  AlertTriangle, StarOff, Hourglass, Tag,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { NameHistory } from "@/components/NameHistory";
import { ListForSaleButton } from "@/components/ListForSaleButton";
import { SubnamesPanel } from "@/components/SubnamesPanel";
import { V1MigrationBanner } from "@/components/V1MigrationBanner";
import { DEMO_OWNED } from "@/lib/mock-registry";
import { shortAddr } from "@/lib/names";
import { explorerAddr } from "@/lib/igra-chain";
import {
  REGISTRY_ADDRESS, REGISTRY_ABI,
  REVERSE_RESOLVER_ADDRESS, REVERSE_RESOLVER_ABI,
  REGISTRY_ADDRESSES, REVERSE_RESOLVER_ADDRESSES,
  REGISTRY_V2_ADDRESS, REGISTRY_V2_ABI, isV2Deployed,
  TLDS, LIVE_TLDS, isTldLive, tldSuffix, type Tld,
} from "@/lib/contracts";

const REGISTRY_LIVE = REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";
const REVERSE_LIVE = REVERSE_RESOLVER_ADDRESS !== "0x0000000000000000000000000000000000000000";

type OwnedName = {
  tokenId: bigint;
  label: string;
  target: `0x${string}`;
  tld: Tld;
  /** "v1" = legacy V1 Registry. "v2" = V2 Registry (current default for new
   *  mints). LiveDomainCard branches on this for: which Registry to call
   *  setTarget against, whether to expose Marketplace+setPrimary (V1 only —
   *  those contracts are V1-bound by immutable constructor arg), whether to
   *  show Annual expiry + renew/extend-to-Forever controls (V2 only). */
  registryVersion: "v1" | "v2";
  /** 0 for Forever (V1 always; V2 Forever mints). Unix timestamp for V2
   *  Annual mints. */
  expiresAt: bigint;
};

export default function DomainsPage() {
  const { address, isConnected } = useAccount();

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 pb-24 pt-16">
        {!isConnected ? <NotConnected /> : <Dashboard address={address!} />}
      </main>
      <Footer />
    </>
  );
}

function NotConnected() {
  return (
    <div className="mx-auto max-w-xl rounded-3xl glass p-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan/30 bg-cyan/10">
        <Wallet className="h-8 w-8 text-cyan" />
      </div>
      <h1 className="mt-6 text-3xl font-black">Connect to see your names</h1>
      <p className="mt-3 text-white/60">
        Your INS names (.ins / .igra / .ikas) are NFTs held in your wallet.
        Connect to manage resolver records, set a primary name per TLD, and
        list names for sale.
      </p>
      <div className="mt-8 flex justify-center">
        <ConnectButton />
      </div>
    </div>
  );
}

function Dashboard({ address }: { address: `0x${string}` }) {
  const owned = useOwnedNames(address);

  // Primary token id is per-TLD (one reverse resolver per Registry).
  const primaryReads = useReadContracts({
    contracts: TLDS.filter(isTldLive).map((tld) => ({
      address: REVERSE_RESOLVER_ADDRESSES[tld],
      abi: REVERSE_RESOLVER_ABI,
      functionName: "primaryTokenId",
      args: [address],
    } as const)),
    query: { enabled: LIVE_TLDS.length > 0 },
  });
  const primaryTokenIdByTld: Partial<Record<Tld, bigint>> = {};
  LIVE_TLDS.forEach((tld, i) => {
    const r = primaryReads.data?.[i];
    if (r?.status === "success") primaryTokenIdByTld[tld] = r.result as bigint;
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">My domains</h1>
          <p className="mt-2 text-sm text-white/60">
            {REGISTRY_LIVE
              ? `${owned.list.length} name${owned.list.length === 1 ? "" : "s"} owned across .ins / .igra / .ikas`
              : `${DEMO_OWNED.length} demo names shown`}
            <span className="mx-2 text-white/30">·</span>
            <a
              href={explorerAddr(address)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-white/60 underline decoration-dotted hover:text-white"
            >
              {shortAddr(address)}
            </a>
          </p>
        </div>
        <Link href="/app" className="btn-primary self-start sm:self-auto">
          <Plus className="mr-1 inline h-4 w-4" /> Register new
        </Link>
      </div>

      {/* V1 → V2 migration banner — renders nothing if V2 isn't deployed,
          if the wallet holds no V1 .igra names, or if every name has
          already been migrated (chain-checked via V2.migrated[v1TokenId]).
          Pre-launch, gated on admin wallet so we can dogfood it privately. */}
      <div className="mt-8">
        <V1MigrationBanner
          v1TokenIds={owned.list
            .filter((d) => d.tld === "igra" && d.registryVersion === "v1")
            .map((d) => d.tokenId)}
        />
      </div>

      {owned.loading && REGISTRY_LIVE && (
        <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading names from Igra…
        </div>
      )}

      {!owned.loading && REGISTRY_LIVE && owned.list.length === 0 && (
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-white/70">You don&apos;t own any names yet.</p>
          <Link href="/app" className="btn-primary mt-5 inline-flex">
            <Plus className="mr-1 inline h-4 w-4" /> Register your first
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REGISTRY_LIVE
          ? owned.list.map((d) => (
              <LiveDomainCard
                key={`${d.tld}-${d.tokenId.toString()}`}
                name={d}
                owner={address}
                primaryTokenId={primaryTokenIdByTld[d.tld]}
                onChainUpdate={owned.refetch}
                onPrimaryChange={() => primaryReads.refetch()}
              />
            ))
          : DEMO_OWNED.map((d) => <DemoDomainCard key={d.label} domain={d} />)}
        <Link
          href="/app"
          className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-white/40 transition hover:border-cyan/30 hover:text-cyan"
        >
          <Plus className="h-8 w-8" />
          <p className="mt-3 text-sm font-medium">Register your next name</p>
        </Link>
      </div>

      {!REGISTRY_LIVE && <ActivityFeed />}
    </>
  );
}

function useOwnedNames(address: `0x${string}`) {
  // 1. Read totalSupply on every live V1 Registry + V2 (when deployed) in parallel.
  const v1Tlds = TLDS.filter(isTldLive);
  const v2Active = isV2Deployed();
  const supplyReads = useReadContracts({
    contracts: [
      ...v1Tlds.map((tld) => ({
        address: REGISTRY_ADDRESSES[tld],
        abi: REGISTRY_ABI,
        functionName: "totalSupply",
      } as const)),
      ...(v2Active ? [{
        address: REGISTRY_V2_ADDRESS,
        abi: REGISTRY_V2_ABI,
        functionName: "totalSupply",
      } as const] : []),
    ],
    query: { enabled: LIVE_TLDS.length > 0 || v2Active },
  });

  const supplyByTld: Record<Tld, number> = { ins: 0, igra: 0, ikas: 0 };
  v1Tlds.forEach((tld, i) => {
    const r = supplyReads.data?.[i];
    if (r?.status === "success") supplyByTld[tld] = Number(r.result as bigint);
  });
  const v2Supply = (() => {
    if (!v2Active) return 0;
    const r = supplyReads.data?.[v1Tlds.length];
    return r?.status === "success" ? Number(r.result as bigint) : 0;
  })();

  // 2. Build the full (tld, tokenId, version) grid. V1 reads via REGISTRY_ABI,
  //    V2 reads via REGISTRY_V2_ABI (which adds expiresAt). Batched in one
  //    useReadContracts call so viem multicall coalesces.
  const tokenGrid = useMemo(() => {
    const grid: Array<{ tld: Tld; tokenId: bigint; version: "v1" | "v2" }> = [];
    for (const tld of LIVE_TLDS) {
      for (let i = 1; i <= supplyByTld[tld]; i++) {
        grid.push({ tld, tokenId: BigInt(i), version: "v1" });
      }
    }
    if (v2Active) {
      for (let i = 1; i <= v2Supply; i++) {
        grid.push({ tld: "igra", tokenId: BigInt(i), version: "v2" });
      }
    }
    return grid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplyByTld.ins, supplyByTld.igra, supplyByTld.ikas, v2Supply, v2Active]);

  // V2 reads add a 4th call (expiresAt), so we standardise on 4 reads per token
  // for offset arithmetic. V1's 4th read is a harmless `mintedAt` repeat.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contracts: any[] = tokenGrid.flatMap(({ tld, tokenId, version }) => {
    const isV2 = version === "v2";
    const addr = isV2 ? REGISTRY_V2_ADDRESS : REGISTRY_ADDRESSES[tld];
    const abi = isV2 ? REGISTRY_V2_ABI : REGISTRY_ABI;
    return [
      { address: addr, abi, functionName: "ownerOf",  args: [tokenId] },
      { address: addr, abi, functionName: "labelOf",  args: [tokenId] },
      { address: addr, abi, functionName: "targetOf", args: [tokenId] },
      isV2
        ? { address: addr, abi: REGISTRY_V2_ABI, functionName: "expiresAt", args: [tokenId] }
        : { address: addr, abi: REGISTRY_ABI,    functionName: "ownerOf",  args: [tokenId] }, // placeholder
    ];
  });
  const { data: batched, isLoading, refetch } = useReadContracts({
    contracts,
    query: { enabled: tokenGrid.length > 0 },
  });

  const list: OwnedName[] = [];
  if (batched) {
    for (let i = 0; i < tokenGrid.length; i++) {
      const { tld, tokenId, version } = tokenGrid[i];
      const o = batched[i * 4]?.result as `0x${string}` | undefined;
      const label = batched[i * 4 + 1]?.result as string | undefined;
      const target = batched[i * 4 + 2]?.result as `0x${string}` | undefined;
      const expiresAt = version === "v2"
        ? (batched[i * 4 + 3]?.result as bigint | undefined) ?? 0n
        : 0n;
      if (o && label && target && o.toLowerCase() === address.toLowerCase()) {
        list.push({ tokenId, label, target, tld, registryVersion: version, expiresAt });
      }
    }
  }

  // Sort: V2 first (current Registry, most relevant), then V1, then by tokenId.
  list.sort((a, b) => {
    if (a.registryVersion !== b.registryVersion) {
      return a.registryVersion === "v2" ? -1 : 1;
    }
    const aIdx = TLDS.indexOf(a.tld);
    const bIdx = TLDS.indexOf(b.tld);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.tokenId < b.tokenId ? -1 : 1;
  });

  return {
    list,
    loading: supplyReads.isLoading || isLoading,
    refetch: () => { supplyReads.refetch(); refetch(); },
  };
}

function LiveDomainCard({
  name, owner, primaryTokenId, onChainUpdate, onPrimaryChange,
}: {
  name: OwnedName;
  owner: `0x${string}`;
  primaryTokenId?: bigint;
  onChainUpdate?: () => void;
  onPrimaryChange?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState<string>(name.target);

  const copy = () => {
    navigator.clipboard.writeText(name.target);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed && onChainUpdate) onChainUpdate();
  }, [isConfirmed, onChainUpdate]);

  const {
    writeContract: writePrimary,
    data: primaryHash,
    isPending: primaryPending,
    error: primaryError,
    reset: resetPrimary,
  } = useWriteContract();
  const { isLoading: primaryConfirming, isSuccess: primaryConfirmed } =
    useWaitForTransactionReceipt({ hash: primaryHash });

  useEffect(() => {
    if (primaryConfirmed && onPrimaryChange) onPrimaryChange();
  }, [primaryConfirmed, onPrimaryChange]);

  // V2-aware Registry routing. setTarget on V2 lives at REGISTRY_V2_ADDRESS;
  // V1 holders keep talking to their V1 contract (immutable).
  const isV2 = name.registryVersion === "v2";
  const tldRegistry = isV2 ? REGISTRY_V2_ADDRESS : REGISTRY_ADDRESSES[name.tld];
  const tldRegistryAbi = isV2 ? REGISTRY_V2_ABI : REGISTRY_ABI;
  // Reverse Resolver + Marketplace are V1-bound by immutable constructor arg —
  // they only work with V1 NFTs. Hide both for V2 holders with explanatory
  // copy until v2.1 ships V2-aware versions.
  const tldReverseResolver = REVERSE_RESOLVER_ADDRESSES[name.tld];
  const tldReverseLive = !isV2 && tldReverseResolver !== "0x0000000000000000000000000000000000000000";

  const isPrimary =
    tldReverseLive && primaryTokenId !== undefined && primaryTokenId === name.tokenId;
  const primaryBusy = primaryPending || primaryConfirming;

  // V2 Annual tenure metadata
  const isAnnual = isV2 && name.expiresAt > 0n;
  const expirySec = Number(name.expiresAt);
  const nowSec = Math.floor(Date.now() / 1000);
  const daysLeft = isAnnual ? Math.floor((expirySec - nowSec) / 86400) : 0;
  const isExpiringSoon = isAnnual && daysLeft <= 60 && daysLeft > 0;
  const isExpired = isAnnual && daysLeft <= 0;

  // V2 price reads — needed for the renew + extend-to-Forever buttons.
  // Only fetch when this is a V2 Annual NFT (the only tenure that has them).
  const { data: renewalPrice } = useReadContract({
    address: REGISTRY_V2_ADDRESS,
    abi: REGISTRY_V2_ABI,
    functionName: "priceAnnualFor",
    args: [name.label],
    query: { enabled: isV2 && isAnnual },
  }) as { data: bigint | undefined };
  const { data: foreverPrice } = useReadContract({
    address: REGISTRY_V2_ADDRESS,
    abi: REGISTRY_V2_ABI,
    functionName: "priceFor",
    args: [name.label],
    query: { enabled: isV2 && isAnnual },
  }) as { data: bigint | undefined };

  const onTogglePrimary = () => {
    if (isPrimary) {
      writePrimary({
        address: tldReverseResolver,
        abi: REVERSE_RESOLVER_ABI,
        functionName: "clearPrimary",
      });
    } else {
      writePrimary({
        address: tldReverseResolver,
        abi: REVERSE_RESOLVER_ABI,
        functionName: "setPrimary",
        args: [name.tokenId],
      });
    }
  };

  const onSave = () => {
    if (!isAddress(target)) return;
    writeContract({
      address: tldRegistry,
      abi: tldRegistryAbi,
      functionName: "setTarget",
      args: [name.label, target as `0x${string}`],
    });
  };

  const busy = isPending || isConfirming;
  const targetIsValid = isAddress(target);
  const targetChanged = target.toLowerCase() !== name.target.toLowerCase();
  const targetIsStale = name.target.toLowerCase() !== owner.toLowerCase();

  const onFixTarget = () => {
    writeContract({
      address: tldRegistry,
      abi: tldRegistryAbi,
      functionName: "setTarget",
      args: [name.label, owner],
    });
  };

  // V2 Annual: renew 1y / extend-to-Forever
  const onRenewOneYear = () => {
    if (!isV2 || !isAnnual) return;
    // Read the per-year price live from V2 — match what the wallet will charge.
    // Caller pays years_to_add * priceAnnualFor(label). For 1y, just the per-year price.
    writeContract({
      address: REGISTRY_V2_ADDRESS,
      abi: REGISTRY_V2_ABI,
      functionName: "renew",
      args: [name.tokenId, 1n],
      value: renewalPrice ?? 0n,
    });
  };
  const onExtendToForever = () => {
    if (!isV2 || !isAnnual) return;
    writeContract({
      address: REGISTRY_V2_ADDRESS,
      abi: REGISTRY_V2_ABI,
      functionName: "extendToForever",
      args: [name.tokenId],
      value: foreverPrice ?? 0n,
    });
  };

  // Per-TLD visual accents
  const tldAccent: Record<Tld, { text: string; border: string; bg: string }> = {
    ins:  { text: "text-cyan",          border: "border-cyan/30",          bg: "bg-cyan/10" },
    igra: { text: "text-plum",          border: "border-plum/30",          bg: "bg-plum/10" },
    ikas: { text: "text-emerald-300",   border: "border-emerald-500/30",   bg: "bg-emerald-500/10" },
  };
  const accent = tldAccent[name.tld];

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-cyan/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan/10 blur-3xl opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ins-gradient text-xl font-black text-black">
          {name.label[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            title={`${name.label}${tldSuffix(name.tld)} registry`}
            className={`inline-flex items-center gap-1 rounded-full border ${accent.border} ${accent.bg} px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${accent.text}`}
          >
            {tldSuffix(name.tld)}
          </span>
          {/* V2 vs V1 registry-version badge — visually disambiguates the
              two registries when a holder owns names on both. */}
          {isV2 ? (
            <span
              title="V2 Registry NFT"
              className="inline-flex items-center gap-1 rounded-full border border-cyan/40 bg-cyan/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan"
            >
              V2 {isAnnual ? "Annual" : "Forever"}
            </span>
          ) : (
            <span
              title="V1 Registry NFT (legacy — migrate to V2 for free)"
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/55"
            >
              V1
            </span>
          )}
          {isPrimary ? (
            <span
              title={`Primary name for your address on ${tldSuffix(name.tld)} reverse resolver`}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${accent.border} ${accent.bg} ${accent.text}`}
            >
              <Star className={`h-3 w-3 ${accent.text}`} style={{ fill: "currentColor" }} /> Primary {tldSuffix(name.tld)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              Owned
            </span>
          )}
          <span
            title="ERC-721 token ID"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-mono text-[10px] font-semibold text-white/60"
          >
            {isV2 ? "V2 #" : "#"}{name.tokenId.toString()}
          </span>
        </div>
      </div>

      {/* V2 Annual: expiry banner + renewal CTAs. Surfaces inline above the
          buttons row so users can't miss it. Color-coded:
            green = comfortable runway (>60 days)
            amber = expiring soon (<=60 days, >0)
            red   = expired (in 30-day grace period)
      */}
      {isAnnual && (
        <div className={`relative mt-4 rounded-xl border p-3 ${
          isExpired
            ? "border-red-500/30 bg-red-500/[0.06]"
            : isExpiringSoon
            ? "border-amber-400/30 bg-amber-400/[0.06]"
            : "border-emerald-500/25 bg-emerald-500/[0.04]"
        }`}>
          <div className="flex items-start gap-2">
            <Hourglass className={`mt-0.5 h-4 w-4 flex-none ${
              isExpired ? "text-red-300" : isExpiringSoon ? "text-amber-300" : "text-emerald-300"
            }`} />
            <div className="flex-1 text-[11px] leading-relaxed">
              <div className={`font-bold ${
                isExpired ? "text-red-200" : isExpiringSoon ? "text-amber-200" : "text-emerald-200"
              }`}>
                {isExpired
                  ? `Expired — ${Math.abs(daysLeft)} days into 30-day grace`
                  : `Annual · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
              </div>
              <p className="mt-0.5 text-white/55">
                {isExpired
                  ? "Renew now to keep this name. After 30 days post-expiry, it returns to public availability."
                  : `Expires ${new Date(expirySec * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}. Renew or convert to Forever any time.`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={onRenewOneYear}
                  disabled={busy || renewalPrice == null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-40"
                >
                  {busy ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Renewing…</>
                  ) : (
                    <>+1 year · {renewalPrice != null ? `${Number(renewalPrice / 10n ** 18n)} iKAS` : "—"}</>
                  )}
                </button>
                <button
                  onClick={onExtendToForever}
                  disabled={busy || foreverPrice == null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/40 bg-cyan/15 px-2.5 py-1 text-[11px] font-bold text-cyan transition hover:bg-cyan/25 disabled:opacity-40"
                >
                  {busy ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Locking…</>
                  ) : (
                    <>Lock Forever · {foreverPrice != null ? `${Number(foreverPrice / 10n ** 18n)} iKAS` : "—"}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h3 className="relative mt-5 text-2xl font-bold">
        <span className="ins-gradient-text">{name.label}</span>
        <span className={accent.text}>{tldSuffix(name.tld)}</span>
      </h3>

      <div className="relative mt-3 flex items-center gap-2 text-xs text-white/50">
        <span>resolves to</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/80 hover:bg-white/[0.08]"
        >
          {shortAddr(name.target)}
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      {targetIsStale && (
        <div className="relative mt-4 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-amber-300" />
            <div className="flex-1 text-[11px] leading-relaxed text-amber-100/90">
              <div className="font-bold text-amber-200">Resolution target is stale</div>
              <p className="mt-1 text-amber-100/70">
                This name still resolves to the previous owner&rsquo;s address
                (<span className="font-mono">{shortAddr(name.target)}</span>). Anyone sending crypto
                to <span className="font-mono">{name.label}{tldSuffix(name.tld)}</span> right now
                will land there, not at your wallet. Point it at yourself:
              </p>
              <button
                onClick={onFixTarget}
                disabled={busy}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-200 transition hover:bg-amber-400/20 disabled:opacity-40"
              >
                {busy ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Updating…</>
                ) : (
                  <><Save className="h-3 w-3" /> Point at my wallet</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative mt-5 flex flex-wrap gap-2">
        {tldReverseLive && (
          <button
            onClick={onTogglePrimary}
            disabled={primaryBusy}
            title={isPrimary ? `Clear primary ${tldSuffix(name.tld)} name` : `Use this as your primary ${tldSuffix(name.tld)} name`}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition disabled:opacity-50 ${
              isPrimary
                ? "border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20"
                : "border-white/10 bg-white/[0.03] text-white/70 hover:border-cyan/30 hover:text-white"
            }`}
          >
            {primaryBusy ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {isPrimary ? "Clearing…" : "Setting…"}</>
            ) : isPrimary ? (
              <><StarOff className="h-3.5 w-3.5" /> Clear primary</>
            ) : (
              <><Star className="h-3.5 w-3.5" /> Set primary</>
            )}
          </button>
        )}
        {isV2 && (
          <span
            title="V2 ReverseResolver ships in v2.1 — set-primary not available yet for V2 NFTs"
            className="inline-flex cursor-default items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white/40"
          >
            <Star className="h-3.5 w-3.5" /> Primary · v2.1
          </span>
        )}
        <IconBtn title="Edit target" icon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setExpanded(!expanded)} />
        <IconBtn title="History" icon={<History className="h-3.5 w-3.5" />} onClick={() => setShowHistory(!showHistory)} />
        {!isV2 ? (
          <ListForSaleButton tokenId={name.tokenId} label={name.label} tld={name.tld} onChange={onChainUpdate} />
        ) : (
          <span
            title="V2 Marketplace ships in v2.1 — V2 NFTs can't be listed yet on the V1-bound Marketplace"
            className="inline-flex cursor-default items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white/40"
          >
            <Tag className="h-3.5 w-3.5" /> Sell · v2.1
          </span>
        )}
        <a
          href={explorerAddr(name.target)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/70 transition hover:border-cyan/30 hover:text-white"
          title="View on explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Explorer
        </a>
      </div>

      {primaryError && (
        <div className="relative mt-3">
          <button
            onClick={() => resetPrimary()}
            className="text-[10px] text-red-300 hover:text-red-200"
            title={primaryError.message}
          >
            {primaryError.message.split("\n")[0] || "Primary write failed"} — dismiss
          </button>
        </div>
      )}

      {showHistory && (
        <div className="relative mt-5 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
            On-chain history
          </div>
          <NameHistory tokenId={name.tokenId} tld={name.tld} />
        </div>
      )}

      {expanded && (
        <div className="relative mt-5 space-y-3 rounded-xl bg-black/40 p-4">
          <label className="block text-[11px] font-medium uppercase tracking-widest text-white/40">
            Target address
          </label>
          <div className="flex gap-2">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value.trim())}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs focus:border-cyan/40 focus:outline-none"
              placeholder="0x…"
            />
            <button
              onClick={onSave}
              disabled={busy || !targetIsValid || !targetChanged || isConfirmed}
              className="rounded-lg bg-ins-gradient px-3 py-2 text-xs font-bold text-black disabled:opacity-50"
            >
              {busy ? (
                <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Saving</>
              ) : isConfirmed ? (
                <><Check className="mr-1 inline h-3 w-3" />Saved</>
              ) : (
                <><Save className="mr-1 inline h-3 w-3" />Save</>
              )}
            </button>
          </div>
          {!targetIsValid && target.length > 0 && (
            <p className="text-[10px] text-red-300">Not a valid address.</p>
          )}
          {writeError && (
            <button
              onClick={() => reset()}
              className="block text-left text-[10px] text-red-300 hover:text-red-200"
              title={writeError.message}
            >
              {writeError.message.split("\n")[0] || "Transaction failed"} — retry
            </button>
          )}
          <p className="text-[10px] text-white/40">
            Writes to INSRegistry.setTarget on Igra. Gas ~$0.0004.
          </p>
        </div>
      )}

      {/* Subnames panel — auto-hidden until SUBNAME_EXTENSION_ADDRESS is set
          AND the contract reports enabled = true. So it's invisible at v1
          launch and starts appearing organically once admin flips the
          feature on (~1 month post-mainnet). */}
      <SubnamesPanel
        parentTokenId={name.tokenId}
        parentLabel={name.label}
        tld={name.tld}
      />
    </div>
  );
}

function DemoDomainCard({ domain }: { domain: typeof DEMO_OWNED[number] }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState<string>(domain.target);

  const copy = () => {
    navigator.clipboard.writeText(domain.target);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-cyan/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan/10 blur-3xl opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ins-gradient text-xl font-black text-black">
          {domain.avatarSeed}
        </div>
        {domain.primary && (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan">
            <Star className="h-3 w-3 fill-cyan" /> Primary
          </span>
        )}
      </div>

      <h3 className="relative mt-5 text-2xl font-bold">
        <span className="ins-gradient-text">{domain.label}</span>
        <span className="text-white/30">.ins</span>
      </h3>

      <div className="relative mt-3 flex items-center gap-2 text-xs text-white/50">
        <span>resolves to</span>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/[0.04] px-2 py-1 font-mono text-[11px] text-white/80 hover:bg-white/[0.08]"
        >
          {shortAddr(domain.target)}
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      <div className="relative mt-2 text-[11px] uppercase tracking-widest text-white/30">
        Forever · minted {domain.mintedAt}
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2">
        <IconBtn title="Edit target" icon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setExpanded(!expanded)} />
        <IconBtn title="Set avatar" icon={<ImageIcon className="h-3.5 w-3.5" />} />
        <IconBtn title="Transfer" icon={<Send className="h-3.5 w-3.5" />} />
        <IconBtn title="Subname" icon={<GitBranch className="h-3.5 w-3.5" />} />
        <a
          href={explorerAddr(domain.target)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] text-white/70 transition hover:border-cyan/30 hover:text-white"
          title="View on explorer"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {expanded && (
        <div className="relative mt-5 space-y-3 rounded-xl bg-black/40 p-4">
          <label className="block text-[11px] font-medium uppercase tracking-widest text-white/40">
            Target address
          </label>
          <div className="flex gap-2">
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-xs focus:border-cyan/40 focus:outline-none"
            />
            <button className="rounded-lg bg-ins-gradient px-3 py-2 text-xs font-bold text-black">
              <Save className="mr-1 inline h-3 w-3" /> Save
            </button>
          </div>
          <p className="text-[10px] text-white/40">
            Demo mode — will write to INSRegistry.setTarget once deployed.
          </p>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  title, icon, onClick,
}: { title: string; icon: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition hover:border-cyan/30 hover:text-white"
    >
      {icon} {title}
    </button>
  );
}

function ActivityFeed() {
  const items = [
    { t: "2h ago", msg: "Set target on pay-alice.ins", color: "cyan" as const },
    { t: "5h ago", msg: "Received 0.5 iKAS to alice.ins", color: "emerald" as const },
    { t: "1d ago", msg: "Minted pay-alice.ins · 10 iKAS", color: "plum" as const },
    { t: "3d ago", msg: "Set primary name: alice.ins", color: "cyan" as const },
  ];
  return (
    <section className="mt-14 rounded-3xl glass p-8">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
        Recent activity <span className="text-white/30">(demo)</span>
      </h2>
      <ul className="mt-4 divide-y divide-white/5">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-center justify-between py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className={`h-1.5 w-1.5 rounded-full bg-${i.color}-400`} />
              <span className="text-white/80">{i.msg}</span>
            </div>
            <span className="text-xs text-white/40">{i.t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
