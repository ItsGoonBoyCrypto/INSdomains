"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Check, X, Sparkles, Loader2, ArrowRight, Lock, Gem, ExternalLink } from "lucide-react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { NameCard } from "@/components/NameCard";
import { ShareToXModal } from "@/components/ShareToXModal";
import { RegisterButtonV2 } from "@/components/RegisterButtonV2";
import { ClaimReservedModal } from "@/components/ClaimReservedModal";
import { cleanLabel, isValidLabel, cleanLabelEmoji, prepareForContract, displayLabel, NameValidationError } from "@/lib/names";
import { mockAvailable, TAKEN_NAMES, RESERVED_NAMES } from "@/lib/mock-registry";
import { rarityFor, tierLabel, formatPrice, type Rarity } from "@/lib/pricing";
import {
  REGISTRY_ADDRESS, REGISTRY_ABI,
  REGISTRY_ADDRESSES, TLDS, LIVE_TLDS, isTldLive, tldSuffix, type Tld,
  isV2Deployed, isV2Enabled,
  REGISTRY_V2_ADDRESS, REGISTRY_V2_ABI,
  isHeldByTreasury,
} from "@/lib/contracts";
import { isAdmin } from "@/lib/admin";
import { cn } from "@/lib/cn";

const REGISTRY_LIVE = REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";
const IGRA_EXPLORER = process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";

export default function AppPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<PageSkeleton />}>
        <AppInner />
      </Suspense>
      <Footer />
    </>
  );
}

function PageSkeleton() {
  return (
    <main className="mx-auto max-w-4xl px-6 pt-16 pb-24">
      <div className="h-64 animate-pulse rounded-3xl bg-white/5" />
    </main>
  );
}

function AppInner() {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("q") ?? "";
  const [raw, setRaw] = useState(initial);
  const { address } = useAccount();

  useEffect(() => {
    setRaw(params.get("q") ?? "");
  }, [params]);

  const cleaned = useMemo(() => cleanLabelEmoji(raw), [raw]);
  const { label, valid, display, isEmoji } = useMemo(() => {
    if (!cleaned) return { label: "", valid: false, display: "", isEmoji: false };
    try {
      const c = prepareForContract(cleaned);
      const d = displayLabel(c);
      return { label: c, valid: true, display: d, isEmoji: c.startsWith("xn--") };
    } catch (e) {
      void e;
      return { label: cleaned, valid: false, display: cleaned, isEmoji: false };
    }
  }, [cleaned]);
  const rarity = valid ? rarityFor(label, RESERVED_NAMES) : null;

  const suggestions = useMemo(() => genSuggestions(label), [label]);

  return (
    <main className="mx-auto max-w-4xl px-6 pt-16 pb-24">
      <h1 className="text-center text-4xl font-black tracking-tight sm:text-5xl">
        Search the <span className="ins-gradient-text">INS</span> registry
      </h1>
      <p className="mt-3 text-center text-white/60">
        Mint once, own forever. Permanent <span className="text-plum">.igra</span> identity for any wallet, contract, or community on Igra Network. Tiered pricing in iKAS.
      </p>

      {/* Search */}
      <div className="mt-10 rounded-2xl glass p-2 pl-5">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 text-cyan" />
          <input
            autoFocus
            value={raw}
            onChange={(e) => {
              const v = e.target.value;
              setRaw(v);
              const cleanedV = cleanLabelEmoji(v);
              let q = "";
              if (cleanedV) {
                try {
                  q = prepareForContract(cleanedV);
                } catch {
                  q = "";
                }
              }
              const url = q ? `/app?q=${encodeURIComponent(q)}` : "/app";
              router.replace(url, { scroll: false });
            }}
            placeholder="type a name (1–32 chars)"
            className="w-full bg-transparent py-4 text-lg placeholder:text-white/30 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {!label && <EmptyHint />}

      {label && !valid && <InvalidHint label={label} />}

      {valid && rarity && (
        <>
          <div className="mt-10">
            <MultiTldNameResult label={label} owner={address} rarity={rarity} />
          </div>

          {suggestions.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-white/40">
                Similar names
              </h2>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <NameRow key={s} label={s} />
                ))}
              </div>
            </section>
          )}

          <AiSuggestSection seed={label} />
        </>
      )}
    </main>
  );
}

function EmptyHint() {
  return (
    <div className="mt-10 rounded-3xl glass p-8 text-center">
      {/* Showcase NFT card preview — "this is what you'll mint" */}
      <div className="mx-auto mb-8 max-w-[340px]">
        <Link href="/app?q=forever" className="block transition hover:opacity-95">
          <NameCard label="forever" tld="igra" tier="FOREVER · 500 iKAS" tokenId={null} />
        </Link>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
          Sample · all names mint as on-chain SVG NFTs
        </p>
      </div>

      <p className="text-white/60">
        Type a name to check availability. Names are lowercase letters, digits, and hyphens — 1–32 chars.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {(
          [
            { s: "vitalik", tld: "igra", colour: "text-plum" },
            { s: "🔥",      tld: "igra", colour: "text-plum" },
            { s: "satoshi", tld: "igra", colour: "text-plum" },
            { s: "🚀",      tld: "igra", colour: "text-plum" },
            { s: "kaspa",   tld: "igra", colour: "text-plum" },
            { s: "💎",      tld: "igra", colour: "text-plum" },
          ] as const
        ).map((x) => (
          <Link
            key={x.s + x.tld}
            href={`/app?q=${encodeURIComponent(x.s)}`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/70 transition hover:border-cyan/30 hover:text-white"
          >
            {x.s}<span className={x.colour}>.{x.tld}</span> →
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-2 text-left text-xs text-white/50 sm:grid-cols-5">
        <TierSample color="plum"    label="1-char"  forever="4,000" annual="1,000" tag="ultra-premium" />
        <TierSample color="plum"    label="2-char"  forever="2,000" annual="800"   tag="premium" />
        <TierSample color="amber"   label="3-char"  forever="1,200" annual="500"   tag="rare" />
        <TierSample color="cyan"    label="4-char"  forever="800"   annual="250"   tag="uncommon" />
        <TierSample color="emerald" label="5–32"    forever="500"   annual="50"    tag="standard" />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center justify-center gap-3 rounded-xl border border-cyan/25 bg-cyan/[0.04] px-4 py-2.5 text-xs text-cyan/85">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan/20 text-[10px] font-black">∞</span>
          <span>
            <span className="font-bold text-cyan">Forever</span>
            <span className="text-cyan/70"> · pay once, no renewals, no expiry.</span>
          </span>
        </div>
        <div className="flex items-center justify-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-4 py-2.5 text-xs text-emerald-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-black">1y</span>
          <span>
            <span className="font-bold text-emerald-300">Annual</span>
            <span className="text-emerald-200/70"> · 1-year renewable, 30-day grace.</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function TierSample({
  color, label, forever, annual, tag,
}: {
  color: "plum" | "amber" | "cyan" | "emerald" | "red";
  label: string;
  forever: string;
  annual: string;
  tag: string;
}) {
  const map: Record<typeof color, string> = {
    plum: "border-plum/30 bg-plum/10 text-plum",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    red: "border-red-500/30 bg-red-500/10 text-red-300",
  };
  return (
    <div className={`rounded-xl border px-3 py-2 ${map[color]}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-sm font-bold">{forever}</span>
        <span className="text-[9px] opacity-60">iKAS forever</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[11px] font-semibold opacity-80">{annual}</span>
        <span className="text-[9px] opacity-50">iKAS / yr</span>
      </div>
      <div className="mt-0.5 text-[10px] opacity-60">{tag}</div>
    </div>
  );
}

function InvalidHint({ label }: { label: string }) {
  return (
    <div className="mt-10 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 text-center text-sm text-amber-200">
      <strong>&quot;{label}&quot;</strong> isn&apos;t a valid name. Allowed: 1&ndash;32 graphemes of ASCII <span className="font-mono text-amber-100">a-z 0-9 -</span> or emoji (🔥🚀💎). Mixed-script names (e.g. Latin + Cyrillic look-alikes) are blocked for safety.
    </div>
  );
}

/**
 * Renders one row per TLD (.ins / .igra / .ikas) showing per-TLD availability
 * + price + register button, plus a batch "Register on all available" action
 * at the top when ≥ 2 TLDs are still open.
 */
function MultiTldNameResult({
  label, owner, rarity,
}: { label: string; owner?: `0x${string}`; rarity: Rarity }) {
  const isReserved = rarity.kind === "reserved";

  // Batch all live TLDs' V1 reads via useReadContracts (one RPC round-trip).
  // Reads per live TLD: available + priceFor + ownerOfName. ownerOfName so
  // we can detect Treasury-held names (free claim) vs marketplace names
  // (regular taken-but-listed flow).
  const v1Contracts = TLDS.flatMap((tld) =>
    isTldLive(tld)
      ? [
          { address: REGISTRY_ADDRESSES[tld], abi: REGISTRY_ABI, functionName: "available",   args: [label] } as const,
          { address: REGISTRY_ADDRESSES[tld], abi: REGISTRY_ABI, functionName: "priceFor",    args: [label] } as const,
          { address: REGISTRY_ADDRESSES[tld], abi: REGISTRY_ABI, functionName: "ownerOfName", args: [label] } as const,
        ]
      : []
  );
  const { data: v1Reads, isLoading: v1Loading } = useReadContracts({
    contracts: v1Contracts,
    query: { enabled: LIVE_TLDS.length > 0 && !isReserved },
  });

  // Mirror reads on the V2 .igra Registry — only fires once V2 is deployed.
  // We need this so a name minted on V2 (without a V1 mint) shows as Taken
  // in the search row, and so the Treasury-held detection includes V2 mints
  // owned by the Safe.
  const v2Contracts = isV2Deployed()
    ? [
        { address: REGISTRY_V2_ADDRESS, abi: REGISTRY_V2_ABI, functionName: "available",   args: [label] } as const,
        { address: REGISTRY_V2_ADDRESS, abi: REGISTRY_V2_ABI, functionName: "ownerOfName", args: [label] } as const,
      ]
    : [];
  const { data: v2Reads, isLoading: v2Loading } = useReadContracts({
    contracts: v2Contracts,
    query: { enabled: isV2Deployed() && !isReserved },
  });
  const v2Available = v2Reads?.[0]?.status === "success" ? (v2Reads[0].result as boolean) : null;
  const v2Owner     = v2Reads?.[1]?.status === "success" ? (v2Reads[1].result as string)  : null;

  const readsLoading = v1Loading || v2Loading;

  // Pair up the batched results back to per-TLD status.
  const perTld: Record<Tld, { available: boolean | null; price: bigint | null; owner: string | null }> = {
    ins:  { available: null, price: null, owner: null },
    igra: { available: null, price: null, owner: null },
    ikas: { available: null, price: null, owner: null },
  };
  let cursor = 0;
  for (const tld of TLDS) {
    if (!isTldLive(tld)) {
      perTld[tld] = {
        available: REGISTRY_LIVE ? null : mockAvailable(label),
        price: null,
        owner: null,
      };
      continue;
    }
    if (!v1Reads || v1Reads.length <= cursor + 2) { cursor += 3; continue; }
    const a = v1Reads[cursor];
    const p = v1Reads[cursor + 1];
    const o = v1Reads[cursor + 2];
    cursor += 3;
    let available = a?.status === "success" ? (a.result as boolean) : null;
    let owner = o?.status === "success" ? (o.result as string) : null;
    // For .igra, AND-merge with V2 — a name is only "available" if neither
    // V1 nor V2 has it. Owner falls back to V2 owner if V1 says free + V2
    // has it (Treasury-held detection on V2-minted names).
    if (tld === "igra" && isV2Deployed()) {
      if (v2Available === false) available = false;
      if ((!owner || owner === "0x0000000000000000000000000000000000000000") && v2Owner) {
        owner = v2Owner;
      }
    }
    perTld[tld] = {
      available,
      price: p?.status === "success" ? (p.result as bigint) : null,
      owner,
    };
  }

  const availableTlds = TLDS.filter((t) => perTld[t].available === true && isTldLive(t));

  // Batch-register banner removed 2026-05-02: post-`.igra`-only-pivot, the
  // ≥ 2 live TLDs trigger never fires (LIVE_TLDS = ["igra"] only). The
  // BatchRegisterBanner + BatchRegisterAll components were ~210 dead lines
  // that confused readers; removed in the V2 launch cleanup. If a second
  // TLD ever ships again, restore from git history (commit b1260dd^) and
  // re-mount here.
  return (
    <div className="space-y-4">
      {/* Render one row per live TLD. Today that's just `.igra` — but the
          loop is preserved so a future multi-TLD revival is one env-var flip. */}
      {LIVE_TLDS.map((tld) => (
        <TldRow
          key={tld}
          tld={tld}
          label={label}
          rarity={rarity}
          available={perTld[tld].available}
          price={perTld[tld].price}
          nameOwner={perTld[tld].owner}
          owner={owner}
          loading={readsLoading}
        />
      ))}
    </div>
  );
}

function TldRow({
  tld, label, rarity, available, price, nameOwner, owner, loading,
}: {
  tld: Tld;
  label: string;
  rarity: Rarity;
  available: boolean | null;
  price: bigint | null;
  /** Current on-chain holder of the name (null if not minted). Used to
   *  detect Treasury-Safe-held names → free-claim CTA. */
  nameOwner: string | null;
  owner?: `0x${string}`;
  loading: boolean;
}) {
  const isReserved = rarity.kind === "reserved";
  const live = isTldLive(tld);
  // True when an existing mint is owned by the team's Treasury Safe.
  // We surface a "Claim it free" CTA instead of the marketplace link
  // because these names are reserved for the rightful owner (project
  // handles, brand-collision, exchange tickers).
  const treasuryHeld = available === false && isHeldByTreasury(nameOwner);
  const [claimOpen, setClaimOpen] = useState(false);
  // V2 routing decision: .igra only, and either the public V2 flag is on
  // OR the caller is admin (so we can dogfood pre-launch). When true, the
  // RegisterButtonV2 takes over (Forever + Annual toggle, V2 contract).
  const useV2 =
    tld === "igra" &&
    isV2Deployed() &&
    (isV2Enabled() || isAdmin(owner ?? null));
  // V2 price for the headline display when V2 is in play. Pre-V2-launch
  // V2 is empty, so V1's `available` check still drives the row state;
  // once V2 has names we'll union both via MultiTldNameResult.
  const { data: v2Price } = useReadContract({
    address: REGISTRY_V2_ADDRESS,
    abi: REGISTRY_V2_ABI,
    functionName: "priceFor",
    args: [label],
    query: { enabled: useV2 && !!label },
  });
  const tldAccent: Record<Tld, string> = {
    ins:  "text-cyan",
    igra: "text-plum",
    ikas: "text-emerald-300",
  };
  const tldBorder: Record<Tld, string> = {
    ins:  "border-cyan/30 bg-gradient-to-r from-cyan/[0.06] to-transparent",
    igra: "border-plum/30 bg-gradient-to-r from-plum/[0.06] to-transparent",
    ikas: "border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.06] to-transparent",
  };
  const display = displayLabel(label);
  const isEmoji = label.startsWith("xn--");
  const avatarChar = isEmoji ? Array.from(display)[0] ?? "?" : (label[0]?.toUpperCase() ?? "?");

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        isReserved
          ? "border-red-500/30 bg-red-500/[0.04]"
          : treasuryHeld
          ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.06] to-transparent"
          : available
          ? tldBorder[tld]
          : "border-white/10 bg-white/[0.03]"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ins-gradient text-lg font-black text-black">
            {avatarChar}
          </div>
          <div>
            <div className="text-xl font-bold sm:text-2xl">
              <span className="text-white">{display}</span>
              <span className={cn("font-bold", tldAccent[tld])}>{tldSuffix(tld)}</span>
            </div>
            {isEmoji && (
              <div className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-white/35">
                stored: {label}{tldSuffix(tld)}
              </div>
            )}
            <div className="mt-1 text-xs text-white/55">
              {isReserved ? (
                <span className="inline-flex items-center gap-1.5 text-red-300">
                  <Lock className="h-3 w-3" /> Reserved — not available for public mint
                </span>
              ) : !live ? (
                <span className="inline-flex items-center gap-1.5 text-white/40">
                  <X className="h-3 w-3" /> Registry not yet deployed for {tldSuffix(tld)}
                </span>
              ) : loading ? (
                <span className="inline-flex items-center gap-1.5 text-white/50">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking chain…
                </span>
              ) : available === true ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <Check className="h-3 w-3" /> Available · forever
                </span>
              ) : treasuryHeld ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300">
                  <Gem className="h-3 w-3" /> Reserved · claim free
                </span>
              ) : available === false ? (
                <span className="inline-flex items-center gap-1.5 text-red-300">
                  <X className="h-3 w-3" /> Taken
                </span>
              ) : (
                <span className="text-white/40">—</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isReserved ? (
            <div className="text-right text-xs text-red-300">Not for sale</div>
          ) : !live ? (
            <div className="text-right text-xs text-white/40">Coming soon</div>
          ) : treasuryHeld ? (
            <button
              onClick={() => setClaimOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/25"
            >
              <Gem className="h-3.5 w-3.5" />
              Claim it free →
            </button>
          ) : available === true ? (
            useV2 ? (
              // V2 path — buttons embed their own prices (Forever / Annual 1y),
              // so the duplicate big-price column is dropped. Small V2 badge
              // floats above the button stack so admins testing pre-launch
              // see at a glance that V2 is engaged.
              <div className="flex flex-col items-stretch gap-1">
                <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan/80">
                  <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5">V2</span>
                  <span>pick a tenure</span>
                </div>
                <RegisterButtonV2 label={label} owner={owner} />
              </div>
            ) : (
              <>
                <div className="text-right">
                  <div className="text-lg font-black text-white">
                    {price != null ? formatPrice(Number(price / 10n ** 18n)) : "—"}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">one-time</div>
                </div>
                <RegisterButton label={label} tld={tld} owner={owner} priceHint={price} />
              </>
            )
          ) : available === false ? (
            <Link href={`/marketplace?name=${label}`} className="btn-ghost text-xs">
              Marketplace <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Free-claim modal — only mounts for Treasury-held names; the row
          renders nothing-extra otherwise. Modal is local per-row so the
          name prop is always the row's name. */}
      {treasuryHeld && (
        <ClaimReservedModal
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
          name={`${label}${tldSuffix(tld)}`}
        />
      )}
    </div>
  );
}

function RarityBadge({ rarity }: { rarity: Rarity }) {
  const tier = tierLabel(rarity);
  if (rarity.kind === "reserved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-red-300">
        <Lock className="h-3 w-3" /> {tier}
      </span>
    );
  }
  if (rarity.kind === "premium") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-plum/30 bg-plum/10 px-2.5 py-0.5 text-[11px] font-semibold text-plum">
        <Gem className="h-3 w-3" /> {tier}
      </span>
    );
  }
  const map: Record<number, string> = {
    1: "border-red-500/30 bg-red-500/10 text-red-300",
    2: "border-plum/30 bg-plum/10 text-plum",
    3: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    4: "border-cyan/30 bg-cyan/10 text-cyan",
    5: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${map[rarity.bucket]}`}>
      <Sparkles className="h-3 w-3" /> {tier}
    </span>
  );
}

function RegisterButton({
  label, tld, owner, priceHint,
}: { label: string; tld: Tld; owner?: `0x${string}`; priceHint?: bigint | null }) {
  const registryAddr = REGISTRY_ADDRESSES[tld];
  const tldLive = isTldLive(tld);

  // Pull the exact on-chain price again (defence — priceHint may be stale)
  const { data: onchainPrice } = useReadContract({
    address: registryAddr,
    abi: REGISTRY_ABI,
    functionName: "priceFor",
    args: [label],
    query: { enabled: tldLive && !!label },
  });

  const { writeContract, data: hash, error: writeError, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  if (!owner) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button onClick={openConnectModal} className="btn-primary text-xs">
            Connect
          </button>
        )}
      </ConnectButton.Custom>
    );
  }

  // If the TLD isn't live yet (no env address), show a disabled hint.
  if (!tldLive) {
    return (
      <button disabled className="btn-primary opacity-50 cursor-not-allowed text-xs">
        Coming soon
      </button>
    );
  }

  // On-chain flow.
  if (isConfirmed && hash) {
    return <MintedSuccess label={label} tld={tld} hash={hash} />;
  }

  const priceToUse = (onchainPrice as bigint | undefined) ?? priceHint ?? null;

  const onMint = () => {
    if (priceToUse == null) return;
    writeContract({
      address: registryAddr,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [label, owner],
      value: priceToUse,
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onMint}
        disabled={isPending || isConfirming || priceToUse == null}
        className="btn-primary text-xs"
      >
        {isPending ? (
          <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Confirm…</>
        ) : isConfirming ? (
          <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Minting…</>
        ) : (
          <>Register</>
        )}
      </button>
      {writeError && (
        <button
          onClick={() => reset()}
          className="max-w-[180px] truncate text-right text-[10px] text-red-300 hover:text-red-200"
          title={writeError.message}
        >
          {writeError.message.split("\n")[0] || "Tx failed"} — retry
        </button>
      )}
    </div>
  );
}

function MintedSuccess({ label, tld, hash }: { label: string; tld: Tld; hash: `0x${string}` }) {
  const { data: tokenId } = useReadContract({
    address: REGISTRY_ADDRESSES[tld],
    abi: REGISTRY_ABI,
    functionName: "tokenIdOf",
    args: [label],
    query: { enabled: isTldLive(tld) && !!label },
  });

  // Auto-pop the share modal once the tokenId resolves. Tracked per-hash so
  // a fresh mint pops a fresh modal but dismissing won't loop on re-renders.
  const [shareOpen, setShareOpen] = useState(false);
  const poppedForHash = useRef<string | null>(null);
  useEffect(() => {
    if (
      typeof tokenId === "bigint" &&
      tokenId > 0n &&
      poppedForHash.current !== hash
    ) {
      poppedForHash.current = hash;
      setShareOpen(true);
    }
  }, [tokenId, hash]);

  const fullName = `${label}${tldSuffix(tld)}`;

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => setShareOpen(true)}
          className="btn-primary bg-emerald-400 text-xs"
        >
          <Check className="mr-1 inline h-3 w-3" />
          Minted! Share →
        </button>
        {typeof tokenId === "bigint" && tokenId > 0n && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold text-white/70">
            #{tokenId.toString()}
          </span>
        )}
        <a
          href={`${IGRA_EXPLORER}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-white/50 hover:text-cyan"
        >
          Tx <ExternalLink className="inline h-3 w-3" />
        </a>
      </div>
      <ShareToXModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        names={[fullName]}
        primaryTokenId={typeof tokenId === "bigint" ? tokenId : null}
      />
    </>
  );
}

function NameRow({ label }: { label: string }) {
  const taken = TAKEN_NAMES.has(label);
  const r = rarityFor(label, RESERVED_NAMES);
  const price =
    r.kind === "reserved" ? "Reserved" :
    r.kind === "premium" ? formatPrice(r.price) :
    formatPrice(r.price);
  return (
    <Link
      href={`/app?q=${label}`}
      className="flex items-center justify-between rounded-2xl glass px-5 py-4 glass-hover"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ins-gradient text-sm font-black text-black">
          {label[0]?.toUpperCase()}
        </div>
        <span className="font-mono text-base">
          {label}
          <span className="ml-1 text-[10px] uppercase tracking-wider text-white/35">all TLDs</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {taken ? (
          <span className="text-xs font-medium text-red-300">Taken</span>
        ) : r.kind === "reserved" ? (
          <span className="text-xs font-medium text-red-300">Reserved</span>
        ) : (
          <>
            <span className="text-sm text-white/70">{price}</span>
            <span className="rounded-full bg-cyan/10 px-3 py-1 text-xs font-bold text-cyan">
              Register →
            </span>
          </>
        )}
      </div>
    </Link>
  );
}

function genSuggestions(label: string): string[] {
  if (!label || label.length < 3) return [];
  return [
    `${label}x`, `${label}1`, `${label}-hq`,
    `my${label}`, `${label}pro`, `the${label}`,
  ].filter((s) => isValidLabel(s)).slice(0, 5);
}

function AiSuggestSection({ seed }: { seed: string }) {
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const ask = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seed }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed");
      setIdeas(data.names ?? []);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-16 rounded-3xl border border-plum/20 bg-gradient-to-br from-plum/[0.06] to-cyan/[0.04] p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-plum" />
          <div>
            <h3 className="text-lg font-bold">AI-generated alternatives</h3>
            <p className="text-xs text-white/50">Powered by Claude Haiku 4.5</p>
          </div>
        </div>
        <button
          onClick={ask}
          disabled={loading}
          className="btn-ghost"
        >
          {loading ? (
            <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Thinking…</>
          ) : ideas.length ? "Regenerate" : "Generate ideas"}
        </button>
      </div>

      {err && <p className="mt-4 text-sm text-red-300">{err}</p>}

      {ideas.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {ideas.map((i) => (
            <Link
              key={i}
              href={`/app?q=${i}`}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm transition hover:border-cyan/30"
            >
              <span className="font-mono">{i}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
