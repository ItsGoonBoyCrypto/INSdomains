"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Check, X, Sparkles, Loader2, ArrowRight, Lock, Gem, ExternalLink, Layers } from "lucide-react";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { NameCard } from "@/components/NameCard";
import { ShareToXModal } from "@/components/ShareToXModal";
import { cleanLabel, isValidLabel } from "@/lib/names";
import { mockAvailable, TAKEN_NAMES, RESERVED_NAMES } from "@/lib/mock-registry";
import { rarityFor, tierLabel, formatPrice, type Rarity } from "@/lib/pricing";
import {
  REGISTRY_ADDRESS, REGISTRY_ABI,
  REGISTRY_ADDRESSES, TLDS, LIVE_TLDS, isTldLive, tldSuffix, type Tld,
} from "@/lib/contracts";
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

  const label = useMemo(() => cleanLabel(raw), [raw]);
  const valid = isValidLabel(label);
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
              const q = cleanLabel(v);
              const url = q ? `/app?q=${encodeURIComponent(q)}` : "/app";
              router.replace(url, { scroll: false });
            }}
            placeholder="type a name (min 3 chars)"
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
        <Link href="/app?q=igralabs" className="block transition hover:opacity-95">
          <NameCard label="igralabs" tld="igra" tier="STANDARD · 30 iKAS" tokenId={null} />
        </Link>
        <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/35">
          Sample · all names mint as on-chain SVG NFTs
        </p>
      </div>

      <p className="text-white/60">
        Type a name to check availability. Names are lowercase letters, digits, and hyphens — 3–32 chars.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {(
          [
            { s: "vitalik", tld: "igra", colour: "text-plum" },
            { s: "satoshi", tld: "igra", colour: "text-plum" },
            { s: "grok",    tld: "igra", colour: "text-plum" },
            { s: "kaspa",   tld: "igra", colour: "text-plum" },
            { s: "zeal",    tld: "igra", colour: "text-plum" },
            { s: "alice",   tld: "igra", colour: "text-plum" },
          ] as const
        ).map((x) => (
          <Link
            key={x.s + x.tld}
            href={`/app?q=${x.s}`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/70 transition hover:border-cyan/30 hover:text-white"
          >
            {x.s}<span className={x.colour}>.{x.tld}</span> →
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-2 text-left text-xs text-white/50 sm:grid-cols-5">
        <TierSample color="plum"    label="1-char"  price="1,000 iKAS" tag="ultra-premium" />
        <TierSample color="plum"    label="2-char"  price="500 iKAS"   tag="premium" />
        <TierSample color="amber"   label="3-char"  price="250 iKAS"   tag="rare" />
        <TierSample color="cyan"    label="4-char"  price="50 iKAS"    tag="uncommon" />
        <TierSample color="emerald" label="5–32"    price="30 iKAS"    tag="standard" />
      </div>
      <div className="mt-4 flex items-center justify-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] px-4 py-2.5 text-xs text-emerald-200">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-black">0</span>
        <span>
          <span className="font-bold text-emerald-300">Renewal fee: 0 iKAS</span>
          <span className="text-emerald-200/70"> · every tier, forever. Pay once — no expiry.</span>
        </span>
      </div>
    </div>
  );
}

function TierSample({
  color, label, price, tag,
}: { color: "plum" | "amber" | "cyan" | "emerald" | "red"; label: string; price: string; tag: string }) {
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
      <div className="text-sm font-bold">{price}</div>
      <div className="text-[10px] opacity-60">{tag}</div>
    </div>
  );
}

function InvalidHint({ label }: { label: string }) {
  return (
    <div className="mt-10 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 text-center text-sm text-amber-200">
      <strong>"{label}"</strong> isn't a valid name — use 3–32 lowercase letters, digits, or hyphens (no leading / trailing hyphen).
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

  // Batch all 3 TLDs' reads via useReadContracts (one RPC round-trip)
  const contracts = TLDS.flatMap((tld) =>
    isTldLive(tld)
      ? [
          { address: REGISTRY_ADDRESSES[tld], abi: REGISTRY_ABI, functionName: "available", args: [label] } as const,
          { address: REGISTRY_ADDRESSES[tld], abi: REGISTRY_ABI, functionName: "priceFor",  args: [label] } as const,
        ]
      : []
  );
  const { data: reads, isLoading: readsLoading } = useReadContracts({
    contracts,
    query: { enabled: LIVE_TLDS.length > 0 && !isReserved },
  });

  // Pair up the batched results back to per-TLD status.
  const perTld: Record<Tld, { available: boolean | null; price: bigint | null }> = {
    ins:  { available: null, price: null },
    igra: { available: null, price: null },
    ikas: { available: null, price: null },
  };
  let cursor = 0;
  for (const tld of TLDS) {
    if (!isTldLive(tld)) {
      perTld[tld] = {
        available: REGISTRY_LIVE ? null : mockAvailable(label),
        price: null,
      };
      continue;
    }
    if (!reads || reads.length <= cursor + 1) { cursor += 2; continue; }
    const a = reads[cursor];
    const p = reads[cursor + 1];
    cursor += 2;
    perTld[tld] = {
      available: a?.status === "success" ? (a.result as boolean) : null,
      price: p?.status === "success" ? (p.result as bigint) : null,
    };
  }

  const availableTlds = TLDS.filter((t) => perTld[t].available === true && isTldLive(t));

  return (
    <div className="space-y-4">
      {/* Batch register banner — visible when ≥ 2 TLDs are available */}
      {owner && availableTlds.length >= 2 && !isReserved && (
        <BatchRegisterBanner label={label} owner={owner} availableTlds={availableTlds} perTld={perTld} />
      )}

      {/* Only render rows for TLDs that are actually live in this build —
          legacy / paused TLDs are hidden, not rendered as "Coming soon". */}
      {LIVE_TLDS.map((tld) => (
        <TldRow
          key={tld}
          tld={tld}
          label={label}
          rarity={rarity}
          available={perTld[tld].available}
          price={perTld[tld].price}
          owner={owner}
          loading={readsLoading}
        />
      ))}
    </div>
  );
}

function TldRow({
  tld, label, rarity, available, price, owner, loading,
}: {
  tld: Tld;
  label: string;
  rarity: Rarity;
  available: boolean | null;
  price: bigint | null;
  owner?: `0x${string}`;
  loading: boolean;
}) {
  const isReserved = rarity.kind === "reserved";
  const live = isTldLive(tld);
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

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-5",
        isReserved
          ? "border-red-500/30 bg-red-500/[0.04]"
          : available
          ? tldBorder[tld]
          : "border-white/10 bg-white/[0.03]"
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ins-gradient text-lg font-black text-black">
            {label[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="text-xl font-bold sm:text-2xl">
              <span className="text-white">{label}</span>
              <span className={cn("font-bold", tldAccent[tld])}>{tldSuffix(tld)}</span>
            </div>
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
          ) : available === true ? (
            <>
              <div className="text-right">
                <div className="text-lg font-black text-white">{price != null ? formatPrice(Number(price / 10n ** 18n)) : "—"}</div>
                <div className="text-[10px] uppercase tracking-wider text-white/40">one-time</div>
              </div>
              <RegisterButton label={label} tld={tld} owner={owner} priceHint={price} />
            </>
          ) : available === false ? (
            <Link href={`/marketplace?name=${label}`} className="btn-ghost text-xs">
              Marketplace <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function BatchRegisterBanner({
  label, owner, availableTlds, perTld,
}: {
  label: string;
  owner: `0x${string}`;
  availableTlds: Tld[];
  perTld: Record<Tld, { available: boolean | null; price: bigint | null }>;
}) {
  const totalPrice = availableTlds.reduce<bigint>((sum, t) => sum + (perTld[t].price ?? 0n), 0n);
  return (
    <div className="rounded-2xl border border-cyan/30 bg-gradient-to-r from-cyan/[0.08] via-plum/[0.06] to-emerald-500/[0.08] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ins-gradient text-black">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Claim <span className="ins-gradient-text">{label}</span> on all {availableTlds.length} TLDs
            </div>
            <div className="text-[11px] text-white/60">
              {availableTlds.map((t) => `${label}${tldSuffix(t)}`).join(" · ")}
              <span className="mx-2 text-white/30">·</span>
              one sign per TLD
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-lg font-black text-white">{formatPrice(Number(totalPrice / 10n ** 18n))}</div>
            <div className="text-[10px] uppercase tracking-wider text-white/40">total</div>
          </div>
          <BatchRegisterAll label={label} owner={owner} availableTlds={availableTlds} perTld={perTld} />
        </div>
      </div>
    </div>
  );
}

/**
 * Per-TLD status in the batch-register flow.
 *   pending   — not yet attempted (will be tried once the queue reaches it)
 *   signing   — writeContract submitted, waiting for wallet + inclusion
 *   mined     — tx confirmed on-chain (name is minted for this TLD)
 *   failed    — the tx reverted or the wallet rejected; user can retry JUST this TLD
 */
type TldStatus = "pending" | "signing" | "mined" | "failed";

/**
 * Partial-failure-safe batch register.
 * - Never re-fires a TLD that's already mined (guards against double-charge).
 * - A single tx failure marks just that TLD failed; already-mined TLDs stay
 *   mined; remaining pending TLDs can still be attempted.
 * - Ignores double-clicks while a tx is in flight.
 * - Retry restarts the queue from the first pending/failed TLD, skipping mined ones.
 */
function BatchRegisterAll({
  label, owner, availableTlds, perTld,
}: {
  label: string;
  owner: `0x${string}`;
  availableTlds: Tld[];
  perTld: Record<Tld, { available: boolean | null; price: bigint | null }>;
}) {
  const { writeContract, data: hash, error, reset, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  // Per-TLD status; initialised to pending each mount. Mined TLDs never regress.
  const [statuses, setStatuses] = useState<Record<Tld, TldStatus>>(() => {
    const init: Record<Tld, TldStatus> = { ins: "pending", igra: "pending", ikas: "pending" };
    return init;
  });
  // Which TLD the current writeContract is for; null means nothing in flight.
  const [activeTld, setActiveTld] = useState<Tld | null>(null);
  // True once the user has clicked "Register all" at least once; gates the auto-advance.
  const [running, setRunning] = useState(false);

  const fireForTld = (tld: Tld) => {
    const price = perTld[tld].price;
    if (price == null) return;
    reset();
    setStatuses((s) => ({ ...s, [tld]: "signing" }));
    setActiveTld(tld);
    writeContract({
      address: REGISTRY_ADDRESSES[tld],
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [label, owner],
      value: price,
    });
  };

  // On tx confirm, mark the active TLD mined and fire the next pending.
  useEffect(() => {
    if (!running || !confirmed || !activeTld) return;
    setStatuses((s) => ({ ...s, [activeTld]: "mined" }));
    setActiveTld(null);
  }, [confirmed, activeTld, running]);

  // On tx error, mark active TLD failed. Do NOT auto-advance — user picks.
  useEffect(() => {
    if (!running || !error || !activeTld) return;
    setStatuses((s) => ({ ...s, [activeTld]: "failed" }));
    setActiveTld(null);
    setRunning(false); // pause the queue; user clicks "Continue" to retry
  }, [error, activeTld, running]);

  // When a TLD is marked mined AND we're still running, advance to next pending.
  useEffect(() => {
    if (!running || activeTld) return;
    const next = availableTlds.find((t) => statuses[t] === "pending");
    if (next) fireForTld(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses, running, activeTld, availableTlds]);

  const startedAny = availableTlds.some((t) => statuses[t] !== "pending");
  const minedCount = availableTlds.filter((t) => statuses[t] === "mined").length;
  const failedCount = availableTlds.filter((t) => statuses[t] === "failed").length;
  const allDone = availableTlds.every((t) => statuses[t] === "mined");
  const busy = isPending || confirming;

  // Share-to-X modal state. Pops once the queue finishes (allDone flips true)
  // and won't re-pop on subsequent renders.
  const [shareOpen, setShareOpen] = useState(false);
  const poppedShareRef = useRef(false);
  useEffect(() => {
    if (allDone && !poppedShareRef.current) {
      poppedShareRef.current = true;
      setShareOpen(true);
    }
  }, [allDone]);

  // Pull the parent tokenId for the headline NFT image — first minted TLD wins.
  const headlineTld = availableTlds.find((t) => statuses[t] === "mined") ?? availableTlds[0];
  const { data: headlineTokenId } = useReadContract({
    address: REGISTRY_ADDRESSES[headlineTld],
    abi: REGISTRY_ABI,
    functionName: "tokenIdOf",
    args: [label],
    query: { enabled: allDone && isTldLive(headlineTld) && !!label },
  });

  const onStart = () => {
    if (busy || running) return; // double-click guard
    setRunning(true);
    const first = availableTlds.find((t) => statuses[t] !== "mined");
    if (first) fireForTld(first);
  };

  if (allDone) {
    return (
      <>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setShareOpen(true)}
            className="btn-primary bg-emerald-400"
          >
            <Check className="mr-1 inline h-4 w-4" /> All {availableTlds.length} minted — Share →
          </button>
          <Link
            href="/domains"
            className="text-[10px] text-white/50 hover:text-cyan"
          >
            View in My Names →
          </Link>
        </div>
        <ShareToXModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          names={availableTlds.map((t) => `${label}${tldSuffix(t)}`)}
          primaryTokenId={typeof headlineTokenId === "bigint" ? headlineTokenId : null}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {/* Per-TLD progress chips — unambiguous about which already minted vs failed */}
      {startedAny && (
        <div className="flex gap-1.5">
          {availableTlds.map((t) => {
            const s = statuses[t];
            const cls =
              s === "mined"   ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" :
              s === "signing" ? "border-cyan/40 bg-cyan/10 text-cyan" :
              s === "failed"  ? "border-red-500/40 bg-red-500/10 text-red-300" :
                                "border-white/10 bg-white/[0.03] text-white/60";
            return (
              <span key={t} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
                {s === "signing" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                {s === "mined"   && <Check className="h-2.5 w-2.5" />}
                {tldSuffix(t)}
              </span>
            );
          })}
        </div>
      )}
      <button
        onClick={onStart}
        disabled={busy || running || allDone}
        className="btn-primary"
      >
        {busy ? (
          <>
            <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
            {activeTld ? `Minting ${tldSuffix(activeTld)}…` : "Confirming…"}
          </>
        ) : failedCount > 0 ? (
          <>Continue ({availableTlds.length - minedCount} left) →</>
        ) : minedCount > 0 && !allDone ? (
          <>Continue ({availableTlds.length - minedCount} left) →</>
        ) : (
          <>Register all {availableTlds.length} →</>
        )}
      </button>
      <p className="max-w-[280px] text-right text-[10px] text-white/40">
        {availableTlds.length} separate signatures. If one fails, minted TLDs stay minted — retry only the failed/remaining TLDs.
      </p>
      {error && activeTld === null && (
        <div className="max-w-[240px] text-right text-[10px] text-red-300" title={error.message}>
          {error.message.split("\n")[0] || "Tx failed"}
        </div>
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
