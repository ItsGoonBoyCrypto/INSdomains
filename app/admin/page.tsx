"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck, Lock, Gift, Tag, Gem, ArrowRight, Loader2,
  Check, Plus, Trash2, Wallet, AlertTriangle, Settings2, ExternalLink,
  ClipboardList, X, Store, Pause, Play, Rocket, Star, Sparkles, RefreshCw, Layers,
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
  usePublicClient,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, parseEther } from "viem";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ADMIN_WALLET, isAdmin } from "@/lib/admin";
import {
  REGISTRY_ABI, MARKETPLACE_ABI,
  REGISTRY_ADDRESSES, MARKETPLACE_ADDRESSES,
  SUBNAME_EXTENSION_ADDRESS, SUBNAME_EXTENSION_ABI,
  TLDS, LIVE_TLDS, isTldLive, tldSuffix,
  type Tld,
} from "@/lib/contracts";
import { cleanLabel, isValidLabel, shortAddr } from "@/lib/names";
import { RESERVED_NAMES } from "@/lib/mock-registry";
import { formatPrice, TIER_RESERVED } from "@/lib/pricing";

const ANY_TLD_LIVE = LIVE_TLDS.length > 0;
const IGRA_EXPLORER = process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const allowed = isAdmin(address ?? null);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-plum/40 bg-plum/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-plum">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </div>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              <span className="ins-gradient-text">INS</span> Admin Console
            </h1>
            <p className="mt-2 text-white/60">
              Reserve names, gift premium names to ecosystem users, tune tier pricing,
              and manage treasury.
            </p>
          </div>
          <AdminWalletBadge />
        </header>

        {!ANY_TLD_LIVE && <RegistryNotLiveBanner />}

        {!ADMIN_WALLET ? (
          <MissingEnvScreen />
        ) : !isConnected ? (
          <ConnectGateScreen />
        ) : !allowed ? (
          <NotAllowedScreen address={address ?? null} />
        ) : (
          <AdminDashboard />
        )}
      </main>
      <Footer />
    </>
  );
}

/* ─────────────────────────── Screens ─────────────────────────── */

function AdminWalletBadge() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/60">
      <div className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5" /> Admin wallet
      </div>
      <div className="mt-1 font-mono text-[11px] text-cyan">
        {ADMIN_WALLET ? shortAddr(ADMIN_WALLET) || ADMIN_WALLET : "not configured"}
      </div>
    </div>
  );
}

function MissingEnvScreen() {
  return (
    <div className="mt-10 rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
      <AlertTriangle className="mx-auto h-10 w-10 text-amber-300" />
      <h2 className="mt-4 text-lg font-bold">Admin wallet not configured</h2>
      <p className="mt-2 text-sm text-white/60">
        Set <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_ADMIN_WALLET</code> in
        {" "}<code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-xs">.env.local</code> to the deploy wallet,
        then rebuild.
      </p>
    </div>
  );
}

function ConnectGateScreen() {
  return (
    <div className="mt-10 rounded-3xl glass p-10 text-center">
      <Wallet className="mx-auto h-10 w-10 text-cyan" />
      <h2 className="mt-4 text-lg font-bold">Connect admin wallet</h2>
      <p className="mt-2 text-sm text-white/60">
        This console is gated to the registry owner. Connect the deploy wallet
        to continue.
      </p>
      <div className="mt-6 inline-block">
        <ConnectButton />
      </div>
    </div>
  );
}

function NotAllowedScreen({ address }: { address: string | null }) {
  return (
    <div className="mt-10 rounded-3xl border border-red-500/30 bg-red-500/[0.05] p-8 text-center">
      <Lock className="mx-auto h-10 w-10 text-red-300" />
      <h2 className="mt-4 text-lg font-bold">Wallet not authorized</h2>
      <p className="mt-2 text-sm text-white/60">
        {address ? <>You&apos;re connected as <span className="font-mono text-white/80">{shortAddr(address)}</span>. This isn&apos;t the admin wallet.</> : "No connected wallet."}
      </p>
      <p className="mt-4 text-xs text-white/40">
        Admin is <span className="font-mono text-cyan/80">{ADMIN_WALLET ? shortAddr(ADMIN_WALLET) : "unset"}</span>.
      </p>
    </div>
  );
}

function RegistryNotLiveBanner() {
  return (
    <div className="mt-10 rounded-2xl border border-cyan/30 bg-cyan/[0.04] p-4 text-sm text-white/70">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan" />
        <div>
          <strong className="text-white">Registry not deployed yet.</strong> Writes below are disabled — this screen
          is wired to the ABI but <code className="rounded bg-black/40 px-1 font-mono text-xs">NEXT_PUBLIC_INS_REGISTRY</code> is still the zero address.
          Deploy via <code className="rounded bg-black/40 px-1 font-mono text-xs">forge script contracts/script/Deploy.s.sol</code> to activate.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Dashboard ─────────────────────────── */

function AdminDashboard() {
  // Which TLD's contracts we're administering right now. Persist the choice
  // across remounts so a switch to /about + back doesn't drop the operator
  // back on .ins unexpectedly.
  const [activeTld, setActiveTld] = useState<Tld>(LIVE_TLDS[0] ?? "igra");

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("ins:adminTld") : null;
      if (saved === "ins" || saved === "igra" || saved === "ikas") {
        setActiveTld(saved);
      }
    } catch { /* sessionStorage / localStorage may be blocked — silently fall back */ }
  }, []);

  const onSelectTld = (t: Tld) => {
    setActiveTld(t);
    try { window.localStorage.setItem("ins:adminTld", t); } catch { /* noop */ }
  };

  return (
    <>
      <TldSelector activeTld={activeTld} onSelect={onSelectTld} />
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AdminMintCard tld={activeTld} />
        <ReservedNamesCard tld={activeTld} />
        <TierPricingCard tld={activeTld} />
        <PremiumOverridesCard tld={activeTld} />
        <PreLaunchListingsCard tld={activeTld} />
        <CleanupCard tld={activeTld} />
        <SubnameExtensionCard tld={activeTld} />
        <TreasuryCard tld={activeTld} />
        <MarketplaceCard tld={activeTld} />
        <OwnershipCard tld={activeTld} />
      </div>
    </>
  );
}

/**
 * Three-tab selector at the top of the admin dashboard. Disabled tabs for
 * any TLD whose contracts aren't deployed in the current env.
 */
function TldSelector({
  activeTld, onSelect,
}: { activeTld: Tld; onSelect: (t: Tld) => void }) {
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
      <span className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
        Admin TLD
      </span>
      {LIVE_TLDS.map((t) => {
        const live = isTldLive(t);
        const active = t === activeTld;
        const accent: Record<Tld, string> = {
          ins:  "border-cyan/60 bg-cyan/15 text-cyan",
          igra: "border-plum/60 bg-plum/15 text-plum",
          ikas: "border-emerald-500/60 bg-emerald-500/15 text-emerald-300",
        };
        return (
          <button
            key={t}
            disabled={!live}
            onClick={() => live && onSelect(t)}
            title={live ? `Admin ${tldSuffix(t)}` : `${tldSuffix(t)} not deployed in current env`}
            className={`rounded-xl border px-4 py-1.5 text-sm font-bold transition ${
              active && live ? accent[t] :
              live           ? "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white" :
                               "cursor-not-allowed border-white/5 bg-white/[0.01] text-white/25"
            }`}
          >
            {tldSuffix(t)}
            {!live && <span className="ml-1 text-[9px] uppercase text-white/35">soon</span>}
          </button>
        );
      })}
      <span className="ml-auto hidden text-[11px] text-white/40 sm:block">
        Every card below reads + writes the <span className="font-mono text-white/70">{tldSuffix(activeTld)}</span> Registry &amp; Marketplace.
      </span>
    </div>
  );
}

/* ─────────────────────────── Cards ─────────────────────────── */

function Card({
  icon, title, subtitle, children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl glass p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-white/50">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TxLink({ hash }: { hash?: `0x${string}` }) {
  if (!hash) return null;
  return (
    <a
      href={`${IGRA_EXPLORER}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-cyan/80 hover:text-cyan"
    >
      tx <ExternalLink className="h-3 w-3" />
    </a>
  );
}

function TxError({ message, onReset }: { message?: string; onReset: () => void }) {
  if (!message) return null;
  return (
    <button
      onClick={onReset}
      className="block max-w-full truncate text-left text-[11px] text-red-300 hover:text-red-200"
      title={message}
    >
      {message.split("\n")[0] || "Transaction failed"} — dismiss
    </button>
  );
}

/* ── Admin Mint ─────────────────────────────────────────── */
function AdminMintCard({ tld }: { tld: Tld }) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const REGISTRY_LIVE = isTldLive(tld);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const clean = cleanLabel(label);
  const valid = isValidLabel(clean);
  const targetValid = /^0x[a-fA-F0-9]{40}$/.test(target.trim());
  const busy = isPending || isConfirming;

  // "Mint on all 3 TLDs to same recipient" toggle. Persisted across sessions.
  const [applyAllTlds, setApplyAllTlds] = useState(false);
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem("ins:mintApplyAll")
        : null;
      if (saved === "true") setApplyAllTlds(true);
    } catch { /* noop */ }
  }, []);
  const onToggleApplyAll = (v: boolean) => {
    setApplyAllTlds(v);
    try { window.localStorage.setItem("ins:mintApplyAll", String(v)); } catch { /* noop */ }
  };

  // Multi-TLD batch state — same pattern as ReservedNamesCard, just smaller
  // since adminMint is one-tx-per-TLD with no chunking.
  const [batchOp, setBatchOp] = useState<BatchOp | null>(null);
  const [batchIdx, setBatchIdx] = useState(0);
  const [batchStatuses, setBatchStatuses] = useState<Record<Tld, BatchTldStatus>>({
    ins: "pending", igra: "pending", ikas: "pending",
  });
  const [batchTxHashes, setBatchTxHashes] = useState<Partial<Record<Tld, `0x${string}`>>>({});
  /** Dedupe hash so we process each confirmed tx exactly once. wagmi's
   *  useWaitForTransactionReceipt + useWriteContract don't always cleanly
   *  toggle isSuccess back to false between sequential writes; adding hash
   *  to the effect deps + ref-checking guarantees we don't miss a confirm
   *  and don't re-process the same one. */
  const processedHashRef = useRef<`0x${string}` | null>(null);

  const fireNextInBatch = (op: BatchOp, idx: number) => {
    if (idx >= op.tlds.length) return;
    const nextTld = op.tlds[idx];
    setBatchStatuses((s) => ({ ...s, [nextTld]: "signing" }));
    reset();
    writeContract({
      address: REGISTRY_ADDRESSES[nextTld],
      abi: REGISTRY_ABI,
      functionName: op.fn,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: op.argsForTld(nextTld) as any,
    });
  };

  const startBatch = (op: BatchOp) => {
    if (busy || batchOp) return;
    setBatchStatuses({ ins: "pending", igra: "pending", ikas: "pending" });
    setBatchTxHashes({});
    processedHashRef.current = null;
    setBatchOp(op);
    setBatchIdx(0);
    fireNextInBatch(op, 0);
  };

  // Confirm-watcher with hash-dedupe. Adding `hash` to deps means we re-run
  // when wagmi swaps in the next tx's hash (not just when isConfirmed flips,
  // which it sometimes doesn't between sequential writes). Ref-checking the
  // hash ensures each unique tx is processed exactly once.
  useEffect(() => {
    if (!batchOp || !isConfirmed || !hash) return;
    if (processedHashRef.current === hash) return;
    processedHashRef.current = hash;

    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "mined" }));
    setBatchTxHashes((m) => ({ ...m, [currentTld]: hash }));
    if (batchIdx + 1 < batchOp.tlds.length) {
      const nextIdx = batchIdx + 1;
      setBatchIdx(nextIdx);
      fireNextInBatch(batchOp, nextIdx);
    } else {
      const t = setTimeout(() => {
        setBatchOp(null);
        setBatchTxHashes({});
        processedHashRef.current = null;
        setLabel("");
        setTarget("");
        reset();
      }, 3000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (!batchOp || !error) return;
    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "failed" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const retryBatchFromFailed = () => {
    if (!batchOp) return;
    const failedIdx = batchOp.tlds.findIndex((t) => batchStatuses[t] === "failed");
    if (failedIdx === -1) return;
    setBatchStatuses((s) => ({ ...s, [batchOp.tlds[failedIdx]]: "pending" }));
    setBatchIdx(failedIdx);
    processedHashRef.current = null;
    reset();
    fireNextInBatch(batchOp, failedIdx);
  };

  const cancelBatch = () => {
    setBatchOp(null);
    setBatchIdx(0);
    setBatchStatuses({ ins: "pending", igra: "pending", ikas: "pending" });
    setBatchTxHashes({});
    processedHashRef.current = null;
    reset();
  };

  const tldQueue = (): Tld[] => {
    if (!applyAllTlds) return [tld];
    const others = (TLDS as readonly Tld[]).filter((t) => t !== tld && isTldLive(t));
    return [tld, ...others];
  };

  const onMint = () => {
    if (!valid || !targetValid) return;
    if (applyAllTlds && tldQueue().length > 1) {
      startBatch({
        fn: "adminMint",
        argsForTld: () => [clean, target as `0x${string}`],
        label: `Gift "${clean}" \u00d7 ${tldQueue().length} TLDs to ${shortAddr(target)}`,
        tlds: tldQueue(),
      });
      return;
    }
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "adminMint",
      args: [clean, target as `0x${string}`],
    });
  };

  useEffect(() => {
    if (isConfirmed && !batchOp) {
      const t = setTimeout(() => { setLabel(""); setTarget(""); reset(); }, 2500);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, reset, batchOp]);

  return (
    <Card
      icon={<Gift className="h-5 w-5 text-plum" />}
      title="Gift a name"
      subtitle="adminMint — bypasses payment + reservation"
    >
      <ApplyAllTldsToggle
        on={applyAllTlds}
        onToggle={onToggleApplyAll}
        currentTld={tld}
        liveTldCount={LIVE_TLDS.length}
        disabled={busy || !!batchOp}
      />

      {batchOp && (
        <MultiTldBatchProgress
          op={batchOp}
          statuses={batchStatuses}
          txHashes={batchTxHashes}
          activeIdx={batchIdx}
          error={error}
          onRetry={retryBatchFromFailed}
          onCancel={cancelBatch}
        />
      )}

      <div className="space-y-3">
        <Field label="Label">
          <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="goonboy"
              className="flex-1 bg-transparent text-base placeholder:text-white/30 focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="text-sm text-white/40">{applyAllTlds && LIVE_TLDS.length > 1 ? `\u00d7 ${LIVE_TLDS.length} TLDs` : tldSuffix(tld)}</span>
          </div>
        </Field>
        <Field label="Recipient address">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="0x…"
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan/40"
            spellCheck={false}
          />
        </Field>

        <TxError message={error?.message} onReset={reset} />

        <button
          onClick={onMint}
          disabled={!valid || !targetValid || !REGISTRY_LIVE || busy || (isConfirmed && !batchOp) || !!batchOp}
          className="btn-primary w-full justify-center"
        >
          {isPending ? (
            <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Confirm in wallet…</>
          ) : isConfirming ? (
            <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Minting…</>
          ) : isConfirmed && !batchOp ? (
            <><Check className="mr-1 inline h-4 w-4" />Gifted!</>
          ) : (
            <>Mint &amp; send{applyAllTlds && LIVE_TLDS.length > 1 ? ` \u00d7 ${LIVE_TLDS.length}` : ""} →</>
          )}
        </button>

        <div className="flex items-center justify-between text-xs text-white/40">
          {valid && clean ? (
            <span>
              Will mint{" "}
              {applyAllTlds && LIVE_TLDS.length > 1 ? (
                <span className="font-mono text-white/70">
                  {clean}{tldSuffix(tld)} + {LIVE_TLDS.length - 1} other TLD{LIVE_TLDS.length - 1 > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="font-mono text-white/70">{clean}{tldSuffix(tld)}</span>
              )}
              {targetValid && <> to <span className="font-mono text-white/70">{shortAddr(target)}</span></>}
            </span>
          ) : <span />}
          <TxLink hash={hash} />
        </div>
      </div>
    </Card>
  );
}

/* ── Reserved names ─────────────────────────────────────── */
const RESERVED_LS_KEY = "ins-reserved-candidates-v1";
const RESERVED_BLOCKLIST_LS_KEY = "ins-reserved-blocklist-v1";

function loadCandidates(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESERVED_LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveCandidates(labels: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESERVED_LS_KEY, JSON.stringify(labels));
  } catch {
    /* quota exceeded — silently skip */
  }
}

/** Persistent blocklist of labels the operator manually untracked. Anything
 *  in this set is filtered out of every API merge + the in-code seed list,
 *  so the row stays gone across TLD switches and page reloads. Kept
 *  separate from `candidates` because candidates is rebuilt from multiple
 *  sources every render cycle. */
function loadBlocklist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESERVED_BLOCKLIST_LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveBlocklist(labels: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RESERVED_BLOCKLIST_LS_KEY, JSON.stringify(labels));
  } catch {
    /* noop */
  }
}

/**
 * Multi-TLD batch state machine — used for "Apply to all 3 TLDs" reserve
 * actions and the one-shot Sync button. Queues a sequence of (TLD →
 * function args) operations, fires them sequentially via writeContract,
 * tracks per-TLD status, and pauses on error so the operator can retry.
 */
type BatchTldStatus = "pending" | "signing" | "mined" | "failed";

type BatchOp = {
  /** Which contract function to call on each TLD's Registry. */
  fn: "setReserved" | "setReservedBatch" | "adminMint" | "setLengthPrice" | "setPremiumPrice";
  /** Arg builder per TLD. Most ops use the same args for every TLD;
   *  the Sync flow uses per-TLD diffs and so receives a builder. */
  argsForTld: (tld: Tld) => readonly unknown[];
  /** Display label so the UI can name the op in progress. */
  label: string;
  /** Which TLDs are queued. Order matters — they execute sequentially. */
  tlds: readonly Tld[];
};

function ReservedNamesCard({ tld }: { tld: Tld }) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const REGISTRY_LIVE = isTldLive(tld);

  // "Apply to all 3 TLDs" toggle. When ON, every reserve / unreserve /
  // batch-seed action fires on .ins → .igra → .ikas in sequence (mined-first
  // proceed-to-next pattern). Persisted across sessions so the operator's
  // preference sticks.
  const [applyAllTlds, setApplyAllTlds] = useState(false);
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem("ins:reservedApplyAll")
        : null;
      if (saved === "true") setApplyAllTlds(true);
    } catch { /* localStorage may be blocked — silently fall back */ }
  }, []);
  const onToggleApplyAll = (v: boolean) => {
    setApplyAllTlds(v);
    try { window.localStorage.setItem("ins:reservedApplyAll", String(v)); } catch { /* noop */ }
  };

  // Multi-TLD batch queue. When non-null, a sequence of writes is in flight.
  const [batchOp, setBatchOp] = useState<BatchOp | null>(null);
  const [batchIdx, setBatchIdx] = useState(0);
  const [batchStatuses, setBatchStatuses] = useState<Record<Tld, BatchTldStatus>>({
    ins: "pending", igra: "pending", ikas: "pending",
  });
  /** Captures each TLD's mined-tx hash so the per-chip explorer link stays
   *  valid after the batch advances to the next TLD (which would otherwise
   *  overwrite the single shared `hash` from useWriteContract). */
  const [batchTxHashes, setBatchTxHashes] = useState<Partial<Record<Tld, `0x${string}`>>>({});
  /** Dedupe hash so we process each confirmed tx exactly once. wagmi's
   *  useWaitForTransactionReceipt + useWriteContract don't always cleanly
   *  toggle isSuccess back to false between sequential writes; adding hash
   *  to the effect deps + ref-checking guarantees we don't miss a confirm
   *  and don't re-process the same one. */
  const processedHashRef = useRef<`0x${string}` | null>(null);

  // Persistent set of labels the operator manually untracked. Filtered out
  // of every API merge + the in-code seed so untrack STAYS gone across TLD
  // switches and reloads.
  const [blocklist, setBlocklist] = useState<Set<string>>(() => new Set(loadBlocklist()));
  useEffect(() => {
    saveBlocklist(Array.from(blocklist));
  }, [blocklist]);

  // Candidate pool is seeded from: the in-code RESERVED_NAMES list + whatever is cached in
  // localStorage + whatever /api/reserved-labels discovers on-chain (auto-populated).
  // On-chain `reserved(label)` is still the source of truth per row.
  // Anything in `blocklist` is filtered out of the seed so a previous-session
  // untrack persists.
  const [candidates, setCandidates] = useState<string[]>(() => {
    const block = new Set(loadBlocklist());
    const seed = [...Array.from(RESERVED_NAMES), ...loadCandidates()];
    return Array.from(new Set(seed.filter((l) => !block.has(l)))).sort();
  });
  const [chainScanLoading, setChainScanLoading] = useState(false);
  const [chainScanError, setChainScanError] = useState<string | null>(null);
  useEffect(() => {
    saveCandidates(candidates);
  }, [candidates]);

  // Auto-fetch the active TLD's on-chain reserved labels whenever the TLD
  // changes (or the blocklist updates), so switching from .ins → .igra
  // re-seeds candidates correctly while still respecting the blocklist.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reserved-labels?tld=${tld}`, { cache: "no-store" });
        const data = (await res.json()) as { labels?: string[] };
        if (cancelled) return;
        if (Array.isArray(data.labels) && data.labels.length > 0) {
          const fresh = data.labels.filter((l) => !blocklist.has(l));
          setCandidates((prev) => Array.from(new Set([...prev, ...fresh])).sort());
        }
      } catch { /* non-fatal; user can still use manual refresh */ }
    })();
    return () => { cancelled = true; };
  }, [tld, blocklist]);

  // Auto-discover all reserved labels from chain history (parses setReserved* call data
  // from every tx that emitted a Reserved event, including Safe-wrapped execTransaction).
  const fetchChainLabels = async () => {
    setChainScanLoading(true);
    setChainScanError(null);
    try {
      const res = await fetch(`/api/reserved-labels?tld=${tld}`, { cache: "no-store" });
      const data = (await res.json()) as { labels?: string[]; error?: string };
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data.labels) && data.labels.length > 0) {
        const fresh = data.labels.filter((l) => !blocklist.has(l));
        setCandidates((prev) =>
          Array.from(new Set([...prev, ...fresh])).sort(),
        );
      }
    } catch (e) {
      setChainScanError((e as Error).message ?? "scan failed");
    } finally {
      setChainScanLoading(false);
    }
  };

  useEffect(() => {
    fetchChainLabels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [newLabel, setNewLabel] = useState("");
  const [pendingAction, setPendingAction] = useState<{ kind: "add" | "remove"; label: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importRaw, setImportRaw] = useState("");

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  // Batch-read on-chain reserved status for every candidate.
  const { data: chainData, refetch: refetchReserved, isLoading: isLoadingChain } = useReadContracts({
    contracts: REGISTRY_LIVE
      ? candidates.map((label) => ({
          address: REGISTRY_ADDRESS,
          abi: REGISTRY_ABI,
          functionName: "reserved" as const,
          args: [label] as const,
        }))
      : [],
    query: { enabled: REGISTRY_LIVE && candidates.length > 0 },
  });

  // Per-row on-chain status — true = reserved, false = not reserved, undefined = still loading.
  const statusFor = (i: number): boolean | undefined => {
    const row = chainData?.[i];
    if (!row || row.status !== "success") return undefined;
    return row.result === true;
  };

  const onChainCount = useMemo(() => {
    if (!REGISTRY_LIVE) return candidates.length;
    let n = 0;
    candidates.forEach((_, i) => {
      if (statusFor(i) === true) n++;
    });
    return n;
  }, [candidates, chainData]);

  // For validation — are we trying to re-add something already confirmed reserved?
  const reservedSet = useMemo(() => {
    const s = new Set<string>();
    candidates.forEach((label, i) => {
      if (statusFor(i) === true) s.add(label);
    });
    return s;
  }, [candidates, chainData]);

  const clean = cleanLabel(newLabel);
  const valid = isValidLabel(clean) && !reservedSet.has(clean);

  useEffect(() => {
    if (isConfirmed && pendingAction) {
      if (pendingAction.kind === "add" && pendingAction.label !== "(batch)") {
        setCandidates((prev) =>
          Array.from(new Set([...prev, pendingAction.label])).sort(),
        );
      }
      refetchReserved();
      fetchChainLabels();
      setNewLabel("");
      setPendingAction(null);
      const t = setTimeout(reset, 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, pendingAction, reset, refetchReserved]);

  // Multi-TLD batch — fire the next pending TLD in the queue. Idempotent:
  // returns early if there's no active batch, no pending TLDs, or a tx is
  // already in flight.
  const fireNextInBatch = (op: BatchOp, idx: number) => {
    if (idx >= op.tlds.length) return;
    const nextTld = op.tlds[idx];
    setBatchStatuses((s) => ({ ...s, [nextTld]: "signing" }));
    reset();
    writeContract({
      address: REGISTRY_ADDRESSES[nextTld],
      abi: REGISTRY_ABI,
      functionName: op.fn,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: op.argsForTld(nextTld) as any,
    });
  };

  // Start a multi-TLD batch from scratch.
  const startBatch = (op: BatchOp) => {
    if (busy || batchOp) return;
    const fresh: Record<Tld, BatchTldStatus> = {
      ins: "pending", igra: "pending", ikas: "pending",
    };
    setBatchStatuses(fresh);
    setBatchTxHashes({});
    processedHashRef.current = null;
    setBatchOp(op);
    setBatchIdx(0);
    fireNextInBatch(op, 0);
  };

  // Confirm-watcher with hash-dedupe (see processedHashRef comment above).
  // Adding `hash` to deps means we re-run when wagmi swaps in the next tx's
  // hash; the ref ensures each unique tx is processed exactly once.
  useEffect(() => {
    if (!batchOp || !isConfirmed || !hash) return;
    if (processedHashRef.current === hash) return;
    processedHashRef.current = hash;

    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "mined" }));
    setBatchTxHashes((m) => ({ ...m, [currentTld]: hash }));
    if (batchIdx + 1 < batchOp.tlds.length) {
      const nextIdx = batchIdx + 1;
      setBatchIdx(nextIdx);
      fireNextInBatch(batchOp, nextIdx);
    } else {
      // Batch complete — refresh chain state, linger green strip ~3s
      // so operator sees the win + clicks per-TLD chips for receipts.
      refetchReserved();
      fetchChainLabels();
      setNewLabel("");
      const t = setTimeout(() => {
        setBatchOp(null);
        setBatchTxHashes({});
        processedHashRef.current = null;
        reset();
      }, 3000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]);

  // On tx error during a batch, mark failed + freeze queue (operator picks
  // retry from the failed step or cancels the whole batch).
  useEffect(() => {
    if (!batchOp || !error) return;
    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "failed" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const retryBatchFromFailed = () => {
    if (!batchOp) return;
    const failedIdx = batchOp.tlds.findIndex((t) => batchStatuses[t] === "failed");
    if (failedIdx === -1) return;
    setBatchStatuses((s) => ({ ...s, [batchOp.tlds[failedIdx]]: "pending" }));
    setBatchIdx(failedIdx);
    processedHashRef.current = null;
    reset();
    fireNextInBatch(batchOp, failedIdx);
  };

  const cancelBatch = () => {
    setBatchOp(null);
    setBatchIdx(0);
    setBatchStatuses({ ins: "pending", igra: "pending", ikas: "pending" });
    setBatchTxHashes({});
    processedHashRef.current = null;
    reset();
  };

  // When a batch finishes, dismiss the Sync banner (if it was the trigger)
  // with a success message. Triggered by batchOp going non-null → null.
  const wasBatching = useRef(false);
  useEffect(() => {
    if (batchOp) wasBatching.current = true;
    else if (wasBatching.current) {
      wasBatching.current = false;
      setSyncStatus((s) => {
        if (s.kind === "running" && s.missingByTld) {
          const total = Object.values(s.missingByTld).reduce((sum, a) => sum + (a?.length ?? 0), 0);
          const tlds = (Object.keys(s.missingByTld) as Tld[]).map(tldSuffix).join(", ");
          return { kind: "done", message: `Synced ${total} label${total === 1 ? "" : "s"} to ${tlds}.` };
        }
        return s;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchOp]);

  // List of TLDs to apply an action to. Always starts with the active TLD
  // so the operator sees their primary target progress first.
  const tldQueue = (): Tld[] => {
    if (!applyAllTlds) return [tld];
    const others = (TLDS as readonly Tld[]).filter((t) => t !== tld && isTldLive(t));
    return [tld, ...others];
  };

  const onAdd = () => {
    if (!valid) return;
    if (applyAllTlds && tldQueue().length > 1) {
      startBatch({
        fn: "setReserved",
        argsForTld: () => [clean, true],
        label: `Reserve "${clean}"`,
        tlds: tldQueue(),
      });
      return;
    }
    setPendingAction({ kind: "add", label: clean });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setReserved",
      args: [clean, true],
    });
  };

  const onRemove = (label: string) => {
    if (applyAllTlds && tldQueue().length > 1) {
      startBatch({
        fn: "setReserved",
        argsForTld: () => [label, false],
        label: `Unreserve "${label}"`,
        tlds: tldQueue(),
      });
      return;
    }
    setPendingAction({ kind: "remove", label });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setReserved",
      args: [label, false],
    });
  };

  const onUntrack = (label: string) => {
    // Remove from local candidate pool AND add to persistent blocklist so
    // it doesn't get re-merged from /api/reserved-labels on TLD switch or
    // batch-completion auto-refresh. Does NOT unreserve on-chain.
    setBlocklist((prev) => {
      const next = new Set(prev);
      next.add(label);
      return next;
    });
    setCandidates((prev) => prev.filter((x) => x !== label));
  };

  const onBatchSeed = () => {
    const toAdd = Array.from(RESERVED_NAMES).filter((n) => !reservedSet.has(n));
    if (toAdd.length === 0) return;
    setCandidates((prev) => Array.from(new Set([...prev, ...toAdd])).sort());
    if (applyAllTlds && tldQueue().length > 1) {
      startBatch({
        fn: "setReservedBatch",
        argsForTld: () => [toAdd, true],
        label: `Seed ${toAdd.length} reserved labels`,
        tlds: tldQueue(),
      });
      return;
    }
    setPendingAction({ kind: "add", label: "(batch)" });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setReservedBatch",
      args: [toAdd, true],
    });
  };

  /**
   * One-shot Sync — copy this TLD's full reserved list to the other 2 TLDs.
   * Reads each other TLD's reserved labels via /api/reserved-labels?tld=,
   * computes the diff (labels reserved here but not there), and submits
   * setReservedBatch(diff, true) on each missing TLD. Skips TLDs that are
   * already in sync.
   */
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: "idle" });
  const onSync = async () => {
    setSyncStatus({ kind: "computing" });
    try {
      const sourceLabels = Array.from(reservedSet);
      if (sourceLabels.length === 0) {
        setSyncStatus({ kind: "done", error: "No reserved labels on the current TLD to sync." });
        return;
      }
      const otherTlds = (TLDS as readonly Tld[]).filter((t) => t !== tld && isTldLive(t));
      const missingByTld: Partial<Record<Tld, string[]>> = {};
      for (const otherTld of otherTlds) {
        const res = await fetch(`/api/reserved-labels?tld=${otherTld}`, { cache: "no-store" });
        const data = (await res.json()) as { labels?: string[] };
        const existing = new Set(data.labels ?? []);
        const missing = sourceLabels.filter((l) => !existing.has(l));
        if (missing.length > 0) missingByTld[otherTld] = missing;
      }
      const totalMissing = Object.values(missingByTld).reduce((s, arr) => s + (arr?.length ?? 0), 0);
      if (totalMissing === 0) {
        setSyncStatus({ kind: "done", error: "All reserved labels already mirrored on the other TLDs. Nothing to sync." });
        return;
      }
      setSyncStatus({ kind: "ready", missingByTld });
    } catch (e) {
      setSyncStatus({ kind: "done", error: (e as Error).message ?? "sync diff failed" });
    }
  };
  const startSync = () => {
    if (syncStatus.kind !== "ready" || !syncStatus.missingByTld) return;
    const tldsToHit = (Object.keys(syncStatus.missingByTld) as Tld[]).filter(
      (t) => (syncStatus.missingByTld![t]?.length ?? 0) > 0,
    );
    setSyncStatus({ ...syncStatus, kind: "running" });
    startBatch({
      fn: "setReservedBatch",
      argsForTld: (t) => [syncStatus.missingByTld![t] ?? [], true],
      label: `Sync ${Object.values(syncStatus.missingByTld!).reduce((s, a) => s + (a?.length ?? 0), 0)} labels to ${tldsToHit.join(", ")}`,
      tlds: tldsToHit,
    });
  };

  const onImport = () => {
    const parsed = parseBulkInput(importRaw, []);
    if (parsed.valid.length === 0) return;
    setCandidates((prev) =>
      Array.from(new Set([...prev, ...parsed.valid])).sort(),
    );
    setImportRaw("");
    setImportOpen(false);
    // Chain reads will auto-refire because `candidates` changed (hook dependency).
  };

  const importParsed = useMemo(() => parseBulkInput(importRaw, []), [importRaw]);

  const subtitle =
    chainScanLoading && candidates.length === Array.from(RESERVED_NAMES).length
      ? "scanning on-chain history…"
      : isLoadingChain && onChainCount === 0
      ? "reading on-chain state…"
      : chainScanError
      ? `${onChainCount} on-chain · scan failed (${chainScanError.split("\n")[0]})`
      : `${onChainCount} on-chain · auto-scanned from chain${chainScanLoading ? " (refreshing…)" : ""}`;

  return (
    <Card
      icon={<Lock className="h-5 w-5 text-red-300" />}
      title="Reserved names"
      subtitle={subtitle}
    >
      {/* Multi-TLD apply toggle + sync — sits at the top so it's seen
          before any reserve action is taken. */}
      <ApplyAllTldsToggle
        on={applyAllTlds}
        onToggle={onToggleApplyAll}
        currentTld={tld}
        liveTldCount={LIVE_TLDS.length}
        disabled={busy || !!batchOp}
      />

      {/* One-shot Sync — copies current TLD's reservations to the other 2 */}
      <SyncReservationsRow
        currentTld={tld}
        liveTldCount={LIVE_TLDS.length}
        status={syncStatus}
        onSync={onSync}
        onStartSync={startSync}
        onDismiss={() => setSyncStatus({ kind: "idle" })}
        disabled={busy || !!batchOp}
      />

      {/* Batch progress display when a multi-TLD op is in flight. */}
      {batchOp && (
        <MultiTldBatchProgress
          op={batchOp}
          statuses={batchStatuses}
          txHashes={batchTxHashes}
          activeIdx={batchIdx}
          error={error}
          onRetry={retryBatchFromFailed}
          onCancel={cancelBatch}
        />
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="add a name…"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-red-500/40"
          spellCheck={false}
        />
        <button
          onClick={onAdd}
          disabled={!valid || !REGISTRY_LIVE || busy || !!batchOp}
          className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
        >
          {busy && pendingAction?.kind === "add" && pendingAction.label === clean
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus className="h-4 w-4" />}
          Reserve{applyAllTlds && LIVE_TLDS.length > 1 ? ` × ${LIVE_TLDS.length}` : ""}
        </button>
      </div>

      {blocklist.size > 0 && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/45">
          <span>{blocklist.size} label{blocklist.size === 1 ? "" : "s"} untracked.</span>
          <button
            onClick={() => setBlocklist(new Set())}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/60 hover:border-cyan/30 hover:text-cyan"
            title="Clear the untrack blocklist — labels will reappear on next API refresh"
          >
            Restore untracked
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onBatchSeed}
          disabled={!REGISTRY_LIVE || busy || !!batchOp}
          className="text-[11px] text-white/50 underline decoration-dotted hover:text-cyan disabled:opacity-40"
        >
          Batch-reserve full ecosystem seed list ({Array.from(RESERVED_NAMES).length}){applyAllTlds && LIVE_TLDS.length > 1 ? ` × ${LIVE_TLDS.length} TLDs` : ""}
        </button>
        <TxLink hash={hash} />
      </div>

      <TxError message={error?.message} onReset={reset} />

      <BulkReserveSection
        tld={tld}
        currentReserved={Array.from(reservedSet)}
        disabled={!REGISTRY_LIVE || busy}
        onBatchDone={(labels) => {
          setCandidates((prev) =>
            Array.from(new Set([...prev, ...labels])).sort(),
          );
          refetchReserved();
          fetchChainLabels();
        }}
      />

      {/* Free-track import — paste labels to populate the tracking list without sending a tx */}
      {!importOpen ? (
        <button
          onClick={() => setImportOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:border-cyan/30 hover:text-cyan"
        >
          <ClipboardList className="h-3 w-3" /> Track additional labels (no tx)
        </button>
      ) : (
        <div className="mt-3 rounded-xl border border-cyan/20 bg-cyan/[0.03] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan">
              <ClipboardList className="h-3.5 w-3.5" /> Track list
            </div>
            <button
              onClick={() => { setImportOpen(false); setImportRaw(""); }}
              className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80"
            >
              <X className="h-3 w-3" /> close
            </button>
          </div>
          <p className="mt-1 text-[10px] text-white/50">
            Paste labels you&rsquo;ve already reserved on-chain from a different device. This
            just adds them to the display list — no gas, no tx.
          </p>
          <textarea
            value={importRaw}
            onChange={(e) => setImportRaw(e.target.value)}
            rows={4}
            placeholder="alice, bob, zealous…"
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/40 p-2 font-mono text-xs text-white/80 placeholder:text-white/30 focus:outline-none focus:border-cyan/40"
            spellCheck={false}
          />
          <div className="mt-2 flex items-center justify-between">
            <div className="text-[10px] text-white/50">
              {importParsed.valid.length} valid · {importParsed.invalid.length} invalid · {importParsed.dup.length} dup
            </div>
            <button
              onClick={onImport}
              disabled={importParsed.valid.length === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan transition hover:bg-cyan/20 disabled:opacity-40"
            >
              <Plus className="h-3 w-3" /> Track {importParsed.valid.length}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 max-h-72 overflow-y-auto divide-y divide-white/5 rounded-xl border border-white/5">
        {candidates.map((label, i) => {
          const status = statusFor(i);
          const isOnChain = status === true;
          const isOffChain = status === false;
          const isUnknown = status === undefined;
          return (
            <li key={label} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                {isOnChain && (
                  <span className="inline-flex h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" title="Reserved on-chain" />
                )}
                {isOffChain && (
                  <span className="inline-flex h-1.5 w-1.5 flex-none rounded-full bg-amber-400" title="Tracked locally but NOT reserved on-chain" />
                )}
                {isUnknown && (
                  <Loader2 className="h-3 w-3 flex-none animate-spin text-white/30" />
                )}
                <span className="font-mono truncate">
                  {label}<span className="text-white/30">.ins</span>
                </span>
                {isOffChain && (
                  <span className="flex-none rounded-full border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300">
                    not on-chain
                  </span>
                )}
              </div>
              <div className="flex flex-none items-center gap-1">
                {isOnChain && (
                  <button
                    onClick={() => onRemove(label)}
                    disabled={!REGISTRY_LIVE || busy || !!batchOp}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/60 transition hover:border-red-500/30 hover:text-red-300 disabled:opacity-40"
                    title={applyAllTlds && LIVE_TLDS.length > 1 ? `Unreserve on all ${LIVE_TLDS.length} TLDs` : "Call setReserved(label, false) on-chain"}
                  >
                    {busy && pendingAction?.kind === "remove" && pendingAction.label === label
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />}
                    Unreserve{applyAllTlds && LIVE_TLDS.length > 1 ? ` × ${LIVE_TLDS.length}` : ""}
                  </button>
                )}
                {!isOnChain && (
                  <button
                    onClick={() => onUntrack(label)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.02] px-2 py-0.5 text-[10px] text-white/40 transition hover:border-white/20 hover:text-white/70"
                    title="Remove from tracking list (persists across TLD switches + reloads). Does not touch chain. To restore, click Restore untracked."
                  >
                    <X className="h-3 w-3" /> untrack
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {candidates.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-white/40">No reserved names yet.</li>
        )}
      </ul>
    </Card>
  );
}

/* ── Bulk reserve section (embedded in Reserved card) ──── */
const BULK_CHUNK = 50;

function parseBulkInput(raw: string, currentReserved: string[]) {
  const already = new Set(currentReserved);
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase().replace(/\.ins$/, ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  const dup: string[] = [];

  for (const t of tokens) {
    const clean = t.replace(/[^a-z0-9-]/g, "");
    if (!clean) continue;
    if (seen.has(clean)) continue;
    seen.add(clean);

    const ok =
      clean.length >= 1 &&
      clean.length <= 32 &&
      !clean.startsWith("-") &&
      !clean.endsWith("-") &&
      /^[a-z0-9-]+$/.test(clean);

    if (!ok) { invalid.push(t); continue; }
    if (already.has(clean)) { dup.push(clean); continue; }
    valid.push(clean);
  }
  return { valid, invalid, dup };
}

function chunkLabels(labels: string[], size = BULK_CHUNK): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < labels.length; i += size) {
    out.push(labels.slice(i, i + size));
  }
  return out;
}

function BulkReserveSection({
  tld,
  currentReserved,
  disabled,
  onBatchDone,
}: {
  tld: Tld;
  currentReserved: string[];
  disabled: boolean;
  onBatchDone: (labels: string[]) => void;
}) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [batches, setBatches] = useState<string[][]>([]);
  const [chunkIndex, setChunkIndex] = useState<number | null>(null);
  const [sent, setSent] = useState<{ labels: string[]; hash: `0x${string}` }[]>([]);
  const processedRef = useRef<Set<string>>(new Set());

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const busy = chunkIndex !== null || isPending || isConfirming;

  const parsed = useMemo(
    () => parseBulkInput(raw, currentReserved),
    [raw, currentReserved],
  );
  const chunks = useMemo(() => chunkLabels(parsed.valid), [parsed.valid]);

  useEffect(() => {
    if (!isConfirmed || !hash || chunkIndex === null) return;
    if (processedRef.current.has(hash)) return;
    processedRef.current.add(hash);

    const justDone = batches[chunkIndex];
    if (justDone) {
      onBatchDone(justDone);
      setSent((prev) => [...prev, { labels: justDone, hash }]);
    }

    const next = chunkIndex + 1;
    if (next < batches.length) {
      setChunkIndex(next);
      reset();
      writeContract({
        address: REGISTRY_ADDRESS,
        abi: REGISTRY_ABI,
        functionName: "setReservedBatch",
        args: [batches[next], true],
      });
    } else {
      setChunkIndex(null);
      setBatches([]);
      const t = setTimeout(() => {
        setRaw("");
        setSent([]);
        processedRef.current.clear();
        reset();
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, hash, chunkIndex, batches, onBatchDone, writeContract, reset]);

  const onStart = () => {
    if (parsed.valid.length === 0 || busy) return;
    processedRef.current.clear();
    setBatches(chunks);
    setSent([]);
    setChunkIndex(0);
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setReservedBatch",
      args: [chunks[0], true],
    });
  };

  const onStopAfterFail = () => {
    setChunkIndex(null);
    setBatches([]);
    reset();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-white/70 transition hover:border-red-500/30 hover:text-red-200"
      >
        <ClipboardList className="h-3 w-3" /> Bulk reserve — paste a list
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-red-200">
          <ClipboardList className="h-3.5 w-3.5" /> Bulk reserve
        </div>
        <button
          onClick={() => { if (!busy) { setOpen(false); setRaw(""); } }}
          disabled={busy}
          className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80 disabled:opacity-30"
        >
          <X className="h-3 w-3" /> close
        </button>
      </div>
      <p className="mt-1 text-[10px] text-white/50">
        Paste names — any separator (newline, comma, space).{" "}
        <code className="rounded bg-black/30 px-1">.ins</code> suffix auto-stripped.
        Duplicates + invalid labels filtered. {BULK_CHUNK} names per batch tx.
      </p>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        disabled={busy}
        rows={5}
        placeholder={"alice\nbob.ins\nkaspa, igra, zealous\nkasplex, kasware, kastle\n..."}
        className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/40 disabled:opacity-60"
        spellCheck={false}
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
        {parsed.valid.length > 0 && (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300">
            {parsed.valid.length} to reserve
          </span>
        )}
        {parsed.dup.length > 0 && (
          <span
            title={parsed.dup.join(", ")}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-white/50"
          >
            {parsed.dup.length} already reserved
          </span>
        )}
        {parsed.invalid.length > 0 && (
          <span
            title={parsed.invalid.join(", ")}
            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-300"
          >
            {parsed.invalid.length} invalid
          </span>
        )}
        {chunks.length > 0 && parsed.valid.length > 0 && chunkIndex === null && (
          <span className="text-white/40">
            → {chunks.length} {chunks.length === 1 ? "tx" : "txs"}
          </span>
        )}
      </div>

      {chunkIndex !== null && (
        <div className="mt-3 rounded-lg border border-white/5 bg-black/40 p-2">
          <div className="flex items-center gap-1.5 text-[11px] text-white/80">
            <Loader2 className="h-3 w-3 animate-spin text-cyan" />
            Sending batch {chunkIndex + 1} of {batches.length}
            {isPending ? " — confirm in wallet…" : isConfirming ? " — mining…" : "…"}
          </div>
          {sent.length > 0 && (
            <ul className="mt-2 space-y-1 text-[10px] text-white/50">
              {sent.map((b, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1">
                    <Check className="h-2.5 w-2.5 text-emerald-400" />
                    batch {i + 1}: {b.labels.length} names
                  </span>
                  <a
                    href={`${IGRA_EXPLORER}/tx/${b.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-cyan/70 hover:text-cyan"
                  >
                    tx <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && chunkIndex !== null && (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 p-2 text-[10px] text-red-200">
          <div className="font-semibold">Batch {chunkIndex + 1} failed</div>
          <div className="truncate" title={error.message}>
            {error.message.split("\n")[0]}
          </div>
          <button
            onClick={onStopAfterFail}
            className="mt-1 text-red-100 underline decoration-dotted"
          >
            Stop &amp; reset (earlier batches already on-chain)
          </button>
        </div>
      )}

      <button
        onClick={onStart}
        disabled={disabled || busy || parsed.valid.length === 0}
        className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
      >
        {busy ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Reserving…</>
        ) : parsed.valid.length === 0 ? (
          <>Paste names above</>
        ) : (
          <>
            Reserve {parsed.valid.length} name{parsed.valid.length === 1 ? "" : "s"}
            {" "}({chunks.length} {chunks.length === 1 ? "tx" : "txs"})
          </>
        )}
      </button>
    </div>
  );
}

/* ── Tier pricing ───────────────────────────────────────── */
/** Canonical length-tier schedule. Defined in iKAS (whole units). The Sync
 *  flow reads each live TLD's on-chain values and queues setLengthPrice
 *  writes for any tier that doesn't match. */
const CANONICAL_TIER_SCHEDULE = [
  { bucket: 1 as const, priceIkas: 1000 },
  { bucket: 2 as const, priceIkas: 500 },
  { bucket: 3 as const, priceIkas: 250 },
  { bucket: 4 as const, priceIkas: 50 },
  { bucket: 5 as const, priceIkas: 30 },
] as const;

/** One write in the Sync queue — set a single (TLD, bucket) to a price. */
type TierSyncStep = {
  tld: Tld;
  bucket: number;
  fromIkas: number | "RESERVED" | null;
  toIkas: number;
};

function TierPricingCard({ tld }: { tld: Tld }) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const REGISTRY_LIVE = isTldLive(tld);
  const tiers = [
    { bucket: 1, label: "1-char", hint: "ultra-premium" },
    { bucket: 2, label: "2-char", hint: "premium" },
    { bucket: 3, label: "3-char", hint: "rare" },
    { bucket: 4, label: "4-char", hint: "uncommon" },
    { bucket: 5, label: "5–32", hint: "standard" },
  ] as const;

  // "Apply to all live TLDs" toggle — when ON, every row's Save fans out
  // to .ins → .igra → .ikas in sequence. Persisted across sessions.
  const [applyAllTlds, setApplyAllTlds] = useState(false);
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem("ins:tierApplyAll")
        : null;
      if (saved === "true") setApplyAllTlds(true);
    } catch { /* noop */ }
  }, []);
  const onToggleApplyAll = (v: boolean) => {
    setApplyAllTlds(v);
    try { window.localStorage.setItem("ins:tierApplyAll", String(v)); } catch { /* noop */ }
  };

  // Read all 5 buckets from active TLD (for the rows).
  const { data: prices, refetch } = useReadContracts({
    contracts: tiers.map((t) => ({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "lengthPrice",
      args: [t.bucket],
    })),
    query: { enabled: REGISTRY_LIVE },
  });

  // Read all 5 buckets from EVERY live TLD — feeds the canonical Sync diff.
  // Order: LIVE_TLDS × CANONICAL_TIER_SCHEDULE (5-step stride).
  const { data: allTldPrices, refetch: refetchAllTlds } = useReadContracts({
    contracts: LIVE_TLDS.flatMap((t) =>
      CANONICAL_TIER_SCHEDULE.map((tier) => ({
        address: REGISTRY_ADDRESSES[t],
        abi: REGISTRY_ABI,
        functionName: "lengthPrice" as const,
        args: [tier.bucket] as const,
      })),
    ),
    query: { enabled: LIVE_TLDS.length > 1 },
  });

  const decode = (raw: bigint | undefined): number | "RESERVED" | null => {
    if (raw === undefined) return null;
    if (raw === BigInt(TIER_RESERVED) || raw > 10n ** 30n) return "RESERVED";
    return Number(formatEther(raw));
  };

  // Compute the diff vs canonical for every (live TLD × bucket).
  // null = still loading; [] = all in sync; non-empty = needs sync.
  const canonicalDiff = useMemo<TierSyncStep[] | null>(() => {
    if (LIVE_TLDS.length < 2) return null;
    if (!allTldPrices || allTldPrices.length === 0) return null;
    const stride = CANONICAL_TIER_SCHEDULE.length;
    const out: TierSyncStep[] = [];
    for (let ti = 0; ti < LIVE_TLDS.length; ti++) {
      const t = LIVE_TLDS[ti];
      for (let bi = 0; bi < stride; bi++) {
        const idx = ti * stride + bi;
        const raw = allTldPrices[idx]?.result as bigint | undefined;
        const cur = decode(raw);
        if (cur === null) return null; // still loading at least one cell
        const tier = CANONICAL_TIER_SCHEDULE[bi];
        if (cur === "RESERVED" || cur !== tier.priceIkas) {
          out.push({ tld: t, bucket: tier.bucket, fromIkas: cur, toIkas: tier.priceIkas });
        }
      }
    }
    return out;
  }, [allTldPrices]);

  /* ── Multi-TLD batch (per-row Save fan-out) ───────────────── */
  const [batchOp, setBatchOp] = useState<BatchOp | null>(null);
  const [batchIdx, setBatchIdx] = useState(0);
  const [batchStatuses, setBatchStatuses] = useState<Record<Tld, BatchTldStatus>>({
    ins: "pending", igra: "pending", ikas: "pending",
  });
  const [batchTxHashes, setBatchTxHashes] = useState<Partial<Record<Tld, `0x${string}`>>>({});
  const processedHashRef = useRef<`0x${string}` | null>(null);

  const { writeContract: writeBatch, data: batchHash, isPending: batchPending, error: batchError, reset: batchReset } = useWriteContract();
  const { isLoading: batchConfirming, isSuccess: batchConfirmed } = useWaitForTransactionReceipt({ hash: batchHash });

  const fireNextInBatch = (op: BatchOp, idx: number) => {
    if (idx >= op.tlds.length) return;
    const nextTld = op.tlds[idx];
    setBatchStatuses((s) => ({ ...s, [nextTld]: "signing" }));
    batchReset();
    writeBatch({
      address: REGISTRY_ADDRESSES[nextTld],
      abi: REGISTRY_ABI,
      functionName: op.fn,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: op.argsForTld(nextTld) as any,
    });
  };

  const startBatch = (op: BatchOp) => {
    if (batchPending || batchConfirming || batchOp) return;
    setBatchStatuses({ ins: "pending", igra: "pending", ikas: "pending" });
    setBatchTxHashes({});
    processedHashRef.current = null;
    setBatchOp(op);
    setBatchIdx(0);
    fireNextInBatch(op, 0);
  };

  useEffect(() => {
    if (!batchOp || !batchConfirmed || !batchHash) return;
    if (processedHashRef.current === batchHash) return;
    processedHashRef.current = batchHash;

    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "mined" }));
    setBatchTxHashes((m) => ({ ...m, [currentTld]: batchHash }));
    if (batchIdx + 1 < batchOp.tlds.length) {
      const nextIdx = batchIdx + 1;
      setBatchIdx(nextIdx);
      fireNextInBatch(batchOp, nextIdx);
    } else {
      refetch(); refetchAllTlds();
      const t = setTimeout(() => {
        setBatchOp(null);
        setBatchTxHashes({});
        processedHashRef.current = null;
        batchReset();
      }, 3000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchConfirmed, batchHash]);

  useEffect(() => {
    if (!batchOp || !batchError) return;
    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "failed" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchError]);

  const retryBatchFromFailed = () => {
    if (!batchOp) return;
    const failedIdx = batchOp.tlds.findIndex((t) => batchStatuses[t] === "failed");
    if (failedIdx === -1) return;
    setBatchStatuses((s) => ({ ...s, [batchOp.tlds[failedIdx]]: "pending" }));
    setBatchIdx(failedIdx);
    processedHashRef.current = null;
    batchReset();
    fireNextInBatch(batchOp, failedIdx);
  };

  const cancelBatch = () => {
    setBatchOp(null);
    setBatchIdx(0);
    setBatchStatuses({ ins: "pending", igra: "pending", ikas: "pending" });
    setBatchTxHashes({});
    processedHashRef.current = null;
    batchReset();
  };

  const tldQueue = (): Tld[] => {
    if (!applyAllTlds) return [tld];
    const others = (TLDS as readonly Tld[]).filter((t) => t !== tld && isTldLive(t));
    return [tld, ...others];
  };

  // Called by TierRow's Save when the apply-all toggle is on.
  const onRowSaveBatch = (bucket: number, priceBig: bigint, displayPrice: string) => {
    startBatch({
      fn: "setLengthPrice",
      argsForTld: () => [bucket, priceBig],
      label: `Bucket ${bucket} → ${displayPrice} \u00d7 ${tldQueue().length} TLDs`,
      tlds: tldQueue(),
    });
  };

  /* ── Canonical-Sync step queue ─────────────────────────────
   * Step-based (not per-TLD) because a sync can need 0-15 writes
   * spread unevenly across TLDs. Each step is one (tld,bucket,price)
   * setLengthPrice call. */
  const [syncSteps, setSyncSteps] = useState<TierSyncStep[] | null>(null);
  const [syncIdx, setSyncIdx] = useState(0);
  const [syncStatuses, setSyncStatuses] = useState<BatchTldStatus[]>([]);
  const [syncHashes, setSyncHashes] = useState<(`0x${string}` | undefined)[]>([]);
  const syncProcessedHashRef = useRef<`0x${string}` | null>(null);

  const { writeContract: writeSync, data: syncHash, isPending: syncPending, error: syncError, reset: syncReset } = useWriteContract();
  const { isLoading: syncConfirming, isSuccess: syncConfirmed } = useWaitForTransactionReceipt({ hash: syncHash });

  const fireNextInSync = (steps: TierSyncStep[], idx: number) => {
    if (idx >= steps.length) return;
    const step = steps[idx];
    setSyncStatuses((arr) => arr.map((s, i) => (i === idx ? "signing" : s)));
    syncReset();
    writeSync({
      address: REGISTRY_ADDRESSES[step.tld],
      abi: REGISTRY_ABI,
      functionName: "setLengthPrice",
      args: [step.bucket, parseEther(String(step.toIkas))],
    });
  };

  const startSync = () => {
    if (!canonicalDiff || canonicalDiff.length === 0 || syncSteps) return;
    setSyncSteps(canonicalDiff);
    setSyncIdx(0);
    setSyncStatuses(canonicalDiff.map(() => "pending"));
    setSyncHashes(canonicalDiff.map(() => undefined));
    syncProcessedHashRef.current = null;
    fireNextInSync(canonicalDiff, 0);
  };

  useEffect(() => {
    if (!syncSteps || !syncConfirmed || !syncHash) return;
    if (syncProcessedHashRef.current === syncHash) return;
    syncProcessedHashRef.current = syncHash;

    setSyncStatuses((arr) => arr.map((s, i) => (i === syncIdx ? "mined" : s)));
    setSyncHashes((arr) => arr.map((h, i) => (i === syncIdx ? syncHash : h)));
    if (syncIdx + 1 < syncSteps.length) {
      const nextIdx = syncIdx + 1;
      setSyncIdx(nextIdx);
      fireNextInSync(syncSteps, nextIdx);
    } else {
      refetch(); refetchAllTlds();
      const t = setTimeout(() => {
        setSyncSteps(null);
        setSyncStatuses([]);
        setSyncHashes([]);
        setSyncIdx(0);
        syncProcessedHashRef.current = null;
        syncReset();
      }, 3500);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncConfirmed, syncHash]);

  useEffect(() => {
    if (!syncSteps || !syncError) return;
    setSyncStatuses((arr) => arr.map((s, i) => (i === syncIdx ? "failed" : s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncError]);

  const retrySyncFromFailed = () => {
    if (!syncSteps) return;
    const failedIdx = syncStatuses.findIndex((s) => s === "failed");
    if (failedIdx === -1) return;
    setSyncStatuses((arr) => arr.map((s, i) => (i === failedIdx ? "pending" : s)));
    setSyncIdx(failedIdx);
    syncProcessedHashRef.current = null;
    syncReset();
    fireNextInSync(syncSteps, failedIdx);
  };

  const cancelSync = () => {
    setSyncSteps(null);
    setSyncStatuses([]);
    setSyncHashes([]);
    setSyncIdx(0);
    syncProcessedHashRef.current = null;
    syncReset();
  };

  const syncBusy = !!syncSteps || syncPending || syncConfirming;
  const batchBusy = !!batchOp || batchPending || batchConfirming;
  const anyBusy = batchBusy || syncBusy;

  return (
    <Card
      icon={<Tag className="h-5 w-5 text-cyan" />}
      title="Length tier pricing"
      subtitle="setLengthPrice(bucket, price) · price in iKAS"
    >
      <ApplyAllTldsToggle
        on={applyAllTlds}
        onToggle={onToggleApplyAll}
        currentTld={tld}
        liveTldCount={LIVE_TLDS.length}
        disabled={anyBusy}
      />

      {batchOp && (
        <MultiTldBatchProgress
          op={batchOp}
          statuses={batchStatuses}
          txHashes={batchTxHashes}
          activeIdx={batchIdx}
          error={batchError}
          onRetry={retryBatchFromFailed}
          onCancel={cancelBatch}
        />
      )}

      <CanonicalSyncRow
        diff={canonicalDiff}
        liveTldCount={LIVE_TLDS.length}
        syncSteps={syncSteps}
        syncStatuses={syncStatuses}
        syncHashes={syncHashes}
        syncIdx={syncIdx}
        syncError={syncError}
        onStartSync={startSync}
        onRetry={retrySyncFromFailed}
        onCancel={cancelSync}
        disabled={anyBusy && !syncBusy}
      />

      <div className="space-y-2">
        {tiers.map((t, i) => {
          const raw = prices?.[i]?.result as bigint | undefined;
          const current: number | "RESERVED" | null = !REGISTRY_LIVE
            ? ({ 1: 1000, 2: 500, 3: 250, 4: 50, 5: 30 } as const)[t.bucket as 1 | 2 | 3 | 4 | 5]
            : raw === undefined
            ? null
            : raw === BigInt(TIER_RESERVED) || raw > 10n ** 30n
            ? "RESERVED"
            : Number(formatEther(raw));
          return (
            <TierRow
              key={t.bucket}
              tld={tld}
              bucket={t.bucket}
              label={t.label}
              hint={t.hint}
              current={current}
              onSaved={() => { refetch(); refetchAllTlds(); }}
              applyAllTlds={applyAllTlds && LIVE_TLDS.length > 1}
              onSaveBatch={onRowSaveBatch}
              batchInFlight={anyBusy}
              tldQueueLen={tldQueue().length}
            />
          );
        })}
      </div>
    </Card>
  );
}

/** Canonical-sync banner. Shows the diff between on-chain and the canonical
 *  schedule (1000/500/250/50/30). When syncing, shows step-by-step progress. */
function CanonicalSyncRow({
  diff, liveTldCount, syncSteps, syncStatuses, syncHashes, syncIdx, syncError,
  onStartSync, onRetry, onCancel, disabled,
}: {
  diff: TierSyncStep[] | null;
  liveTldCount: number;
  syncSteps: TierSyncStep[] | null;
  syncStatuses: BatchTldStatus[];
  syncHashes: (`0x${string}` | undefined)[];
  syncIdx: number;
  syncError: { message: string } | null;
  onStartSync: () => void;
  onRetry: () => void;
  onCancel: () => void;
  disabled: boolean;
}) {
  if (liveTldCount < 2) return null;
  // Active sync UI takes priority over diff preview.
  if (syncSteps) {
    const failed = syncStatuses.some((s) => s === "failed");
    const allMined = syncStatuses.every((s) => s === "mined");
    return (
      <div className={`mb-3 rounded-xl border p-3 transition ${
        failed   ? "border-red-500/40 bg-red-500/[0.04]" :
        allMined ? "border-emerald-500/40 bg-emerald-500/[0.05]" :
                   "border-cyan/40 bg-cyan/[0.04]"
      }`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white">
              {allMined ? <><Check className="mr-1 inline h-3 w-3 text-emerald-300" />Canonical sync — done</> : "Syncing canonical pricing"}
            </div>
            {!allMined && !failed && (
              <div className="mt-0.5 text-[11px] text-white/55">
                Step {Math.min(syncIdx + 1, syncSteps.length)} of {syncSteps.length}
                {syncSteps[syncIdx] && (
                  <> — {tldSuffix(syncSteps[syncIdx].tld)} · bucket {syncSteps[syncIdx].bucket} → {syncSteps[syncIdx].toIkas} iKAS</>
                )}
              </div>
            )}
            {allMined && (
              <div className="mt-0.5 text-[11px] text-emerald-200/80">
                All {syncSteps.length} writes confirmed on-chain.
              </div>
            )}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {syncSteps.map((step, i) => {
            const s = syncStatuses[i];
            const cls =
              s === "mined"   ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" :
              s === "signing" ? "border-cyan/40 bg-cyan/15 text-cyan" :
              s === "failed"  ? "border-red-500/40 bg-red-500/10 text-red-300" :
                                "border-white/10 bg-white/[0.04] text-white/55";
            const hash = syncHashes[i];
            const inner = (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono ${cls}`}>
                {s === "signing" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                {s === "mined"   && <Check className="h-2.5 w-2.5" />}
                {tldSuffix(step.tld)}·b{step.bucket}
              </span>
            );
            return s === "mined" && hash ? (
              <a
                key={i}
                href={`${IGRA_EXPLORER}/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                title={`bucket ${step.bucket} → ${step.toIkas} iKAS`}
                className="transition hover:opacity-90"
              >
                {inner}
              </a>
            ) : (
              <span key={i} title={`bucket ${step.bucket} → ${step.toIkas} iKAS`}>{inner}</span>
            );
          })}
        </div>
        {failed && (
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-red-300">
            <span className="truncate" title={syncError?.message}>
              Failed at step {syncIdx + 1} — {syncError?.message?.split("\n")[0] ?? "unknown error"}
            </span>
            <span className="flex flex-none gap-1">
              <button onClick={onRetry} className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-200 hover:bg-red-500/20">Retry</button>
              <button onClick={onCancel} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/60 hover:text-white">Cancel</button>
            </span>
          </div>
        )}
      </div>
    );
  }

  // Idle: show diff preview / "all in sync" / "loading" state.
  if (diff === null) {
    return (
      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/45">
        <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> Reading on-chain prices across {liveTldCount} TLDs…
      </div>
    );
  }
  if (diff.length === 0) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-2 text-[11px] text-emerald-200/80">
        <Check className="h-3 w-3" /> All {liveTldCount} TLDs match the canonical schedule (1000 / 500 / 250 / 50 / 30 iKAS).
      </div>
    );
  }
  return (
    <div className="mb-3 rounded-xl border border-plum/30 bg-plum/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-[11px] text-white/65">
          <span className="font-bold text-plum">Sync to canonical</span>
          {" "}— {diff.length} bucket{diff.length === 1 ? "" : "s"} differ from <span className="font-mono text-white/75">1000 / 500 / 250 / 50 / 30</span>.
        </div>
        <button
          onClick={onStartSync}
          disabled={disabled}
          className="rounded-lg border border-plum/40 bg-plum/10 px-3 py-1 text-xs font-bold text-plum transition hover:bg-plum/20 disabled:opacity-40"
        >
          Apply {diff.length} change{diff.length === 1 ? "" : "s"}
        </button>
      </div>
      <div className="mt-2 space-y-0.5 text-[11px] text-white/55">
        {diff.map((d, i) => (
          <div key={i} className="font-mono">
            <span className="text-white/70">{tldSuffix(d.tld)}</span>
            {" · b"}{d.bucket}
            {": "}
            <span className="text-amber-300/80">{d.fromIkas === "RESERVED" ? "RESERVED" : `${d.fromIkas} iKAS`}</span>
            {" → "}
            <span className="text-emerald-300">{d.toIkas} iKAS</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TierRow({
  tld, bucket, label, hint, current, onSaved,
  applyAllTlds, onSaveBatch, batchInFlight, tldQueueLen,
}: {
  tld: Tld;
  bucket: number;
  label: string;
  hint: string;
  current: number | "RESERVED" | null;
  onSaved: () => void;
  /** When true, Save fans out via onSaveBatch instead of single-TLD write. */
  applyAllTlds: boolean;
  /** Trigger a multi-TLD batch from the parent card. */
  onSaveBatch: (bucket: number, priceBig: bigint, displayPrice: string) => void;
  /** Disables Save while ANY batch (this row's or another row's) is mid-flight. */
  batchInFlight: boolean;
  /** Number of TLDs the batch will touch (for the button label). */
  tldQueueLen: number;
}) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const REGISTRY_LIVE = isTldLive(tld);
  const currentStr =
    current === null ? "" : current === "RESERVED" ? "RESERVED" : String(current);
  const [value, setValue] = useState<string>(currentStr);

  useEffect(() => { setValue(currentStr); }, [currentStr]);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  useEffect(() => {
    if (isConfirmed) {
      onSaved();
      const t = setTimeout(reset, 1000);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, onSaved, reset]);

  const isReservedInput = value.trim().toUpperCase() === "RESERVED";
  const parsed = isReservedInput ? null : Number(value);
  const validInput = isReservedInput || (Number.isFinite(parsed) && (parsed as number) >= 0);
  const dirty = value !== currentStr;

  const onSave = () => {
    if (!validInput || !dirty) return;
    const priceBig = isReservedInput
      ? (2n ** 256n - 1n) // TIER_RESERVED sentinel
      : parseEther(String(parsed));
    if (applyAllTlds) {
      const display = isReservedInput ? "RESERVED" : `${parsed} iKAS`;
      onSaveBatch(bucket, priceBig, display);
      return;
    }
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setLengthPrice",
      args: [bucket, priceBig],
    });
  };

  // Whether to disable the button — single-TLD mode looks at local state;
  // multi-TLD mode looks at the parent's batch flag.
  const disableSave = !validInput || !dirty || !REGISTRY_LIVE || busy || isConfirmed || (applyAllTlds && batchInFlight);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div className="w-16 shrink-0">
        <div className="text-xs font-bold text-white">{label}</div>
        <div className="text-[10px] text-white/40">{hint}</div>
      </div>
      <div className="flex flex-1 items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-2 py-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
        <span className="text-xs text-white/40">
          {isReservedInput ? "·" : "iKAS"}
        </span>
      </div>
      <button
        onClick={onSave}
        disabled={disableSave}
        className="rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-bold text-cyan transition hover:bg-cyan/20 disabled:opacity-40"
        title={error?.message ?? (applyAllTlds ? `Save to ${tldQueueLen} TLDs` : `Save to ${tldSuffix(tld)} only`)}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : isConfirmed ? "Saved" : applyAllTlds && tldQueueLen > 1 ? `Save \u00d7 ${tldQueueLen}` : "Save"}
      </button>
    </div>
  );
}

/* ── Premium overrides ──────────────────────────────────── */
function PremiumOverridesCard({ tld }: { tld: Tld }) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const REGISTRY_LIVE = isTldLive(tld);
  const [label, setLabel] = useState("");
  const [price, setPrice] = useState("");
  const [items, setItems] = useState<{ label: string; price: number }[]>([]);
  const [pending, setPending] = useState<{ kind: "set" | "clear"; label: string; price?: number } | null>(null);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  const clean = cleanLabel(label);
  const parsed = Number(price);
  const valid = isValidLabel(clean) && Number.isFinite(parsed) && parsed >= 0;

  // "Apply premium override to all 3 TLDs" toggle — persisted across sessions.
  const [applyAllTlds, setApplyAllTlds] = useState(false);
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem("ins:premiumApplyAll")
        : null;
      if (saved === "true") setApplyAllTlds(true);
    } catch { /* noop */ }
  }, []);
  const onToggleApplyAll = (v: boolean) => {
    setApplyAllTlds(v);
    try { window.localStorage.setItem("ins:premiumApplyAll", String(v)); } catch { /* noop */ }
  };

  // Multi-TLD batch state (mirrors AdminMintCard / ReservedNamesCard).
  const [batchOp, setBatchOp] = useState<BatchOp | null>(null);
  const [batchIdx, setBatchIdx] = useState(0);
  const [batchStatuses, setBatchStatuses] = useState<Record<Tld, BatchTldStatus>>({
    ins: "pending", igra: "pending", ikas: "pending",
  });
  const [batchTxHashes, setBatchTxHashes] = useState<Partial<Record<Tld, `0x${string}`>>>({});
  const processedHashRef = useRef<`0x${string}` | null>(null);

  const fireNextInBatch = (op: BatchOp, idx: number) => {
    if (idx >= op.tlds.length) return;
    const nextTld = op.tlds[idx];
    setBatchStatuses((s) => ({ ...s, [nextTld]: "signing" }));
    reset();
    writeContract({
      address: REGISTRY_ADDRESSES[nextTld],
      abi: REGISTRY_ABI,
      functionName: op.fn,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: op.argsForTld(nextTld) as any,
    });
  };

  const startBatch = (op: BatchOp) => {
    if (busy || batchOp) return;
    setBatchStatuses({ ins: "pending", igra: "pending", ikas: "pending" });
    setBatchTxHashes({});
    processedHashRef.current = null;
    setBatchOp(op);
    setBatchIdx(0);
    fireNextInBatch(op, 0);
  };

  // Confirm-watcher with hash-dedupe (see ReservedNamesCard for the
  // wagmi-isSuccess-doesn't-cleanly-toggle gotcha).
  useEffect(() => {
    if (!batchOp || !isConfirmed || !hash) return;
    if (processedHashRef.current === hash) return;
    processedHashRef.current = hash;

    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "mined" }));
    setBatchTxHashes((m) => ({ ...m, [currentTld]: hash }));
    if (batchIdx + 1 < batchOp.tlds.length) {
      const nextIdx = batchIdx + 1;
      setBatchIdx(nextIdx);
      fireNextInBatch(batchOp, nextIdx);
    } else {
      // Persist a single optimistic items-list update covering all TLDs
      // (the override now lives on every TLD the batch touched).
      if (pending?.kind === "set") {
        setItems((prev) => [
          { label: pending.label, price: pending.price ?? 0 },
          ...prev.filter((x) => x.label !== pending.label),
        ]);
      } else if (pending?.kind === "clear") {
        setItems((prev) => prev.filter((x) => x.label !== pending.label));
      }
      const t = setTimeout(() => {
        setBatchOp(null);
        setBatchTxHashes({});
        processedHashRef.current = null;
        setLabel(""); setPrice("");
        setPending(null);
        reset();
      }, 3000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (!batchOp || !error) return;
    const currentTld = batchOp.tlds[batchIdx];
    setBatchStatuses((s) => ({ ...s, [currentTld]: "failed" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const retryBatchFromFailed = () => {
    if (!batchOp) return;
    const failedIdx = batchOp.tlds.findIndex((t) => batchStatuses[t] === "failed");
    if (failedIdx === -1) return;
    setBatchStatuses((s) => ({ ...s, [batchOp.tlds[failedIdx]]: "pending" }));
    setBatchIdx(failedIdx);
    processedHashRef.current = null;
    reset();
    fireNextInBatch(batchOp, failedIdx);
  };

  const cancelBatch = () => {
    setBatchOp(null);
    setBatchIdx(0);
    setBatchStatuses({ ins: "pending", igra: "pending", ikas: "pending" });
    setBatchTxHashes({});
    processedHashRef.current = null;
    setPending(null);
    reset();
  };

  const tldQueue = (): Tld[] => {
    if (!applyAllTlds) return [tld];
    const others = (TLDS as readonly Tld[]).filter((t) => t !== tld && isTldLive(t));
    return [tld, ...others];
  };

  // Single-TLD confirm path (when toggle is off) — same optimistic update
  // logic as before, but doesn't fire when a batch is in progress.
  useEffect(() => {
    if (batchOp) return;
    if (isConfirmed && pending) {
      if (pending.kind === "set") {
        setItems((prev) => [{ label: pending.label, price: pending.price ?? 0 }, ...prev.filter((x) => x.label !== pending.label)]);
        setLabel(""); setPrice("");
      } else {
        setItems((prev) => prev.filter((x) => x.label !== pending.label));
      }
      setPending(null);
      const t = setTimeout(reset, 1200);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, pending, reset, batchOp]);

  const onSet = () => {
    if (!valid) return;
    if (applyAllTlds && tldQueue().length > 1) {
      setPending({ kind: "set", label: clean, price: parsed });
      startBatch({
        fn: "setPremiumPrice",
        argsForTld: () => [clean, parseEther(String(parsed))],
        label: `Set "${clean}" \u00d7 ${tldQueue().length} TLDs @ ${formatPrice(parsed)}`,
        tlds: tldQueue(),
      });
      return;
    }
    setPending({ kind: "set", label: clean, price: parsed });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setPremiumPrice",
      args: [clean, parseEther(String(parsed))],
    });
  };

  const onClear = (l: string) => {
    if (applyAllTlds && tldQueue().length > 1) {
      setPending({ kind: "clear", label: l });
      startBatch({
        fn: "setPremiumPrice",
        argsForTld: () => [l, 0n],
        label: `Clear "${l}" \u00d7 ${tldQueue().length} TLDs`,
        tlds: tldQueue(),
      });
      return;
    }
    setPending({ kind: "clear", label: l });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setPremiumPrice",
      args: [l, 0n],
    });
  };

  return (
    <Card
      icon={<Gem className="h-5 w-5 text-plum" />}
      title="Premium overrides"
      subtitle="setPremiumPrice(label, price) · 0 clears the override"
    >
      <ApplyAllTldsToggle
        on={applyAllTlds}
        onToggle={onToggleApplyAll}
        currentTld={tld}
        liveTldCount={LIVE_TLDS.length}
        disabled={busy || !!batchOp}
      />

      {batchOp && (
        <MultiTldBatchProgress
          op={batchOp}
          statuses={batchStatuses}
          txHashes={batchTxHashes}
          activeIdx={batchIdx}
          error={error}
          onRetry={retryBatchFromFailed}
          onCancel={cancelBatch}
        />
      )}

      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="name"
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-plum/40"
          spellCheck={false}
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="price"
          className="w-32 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-plum/40"
        />
        <button
          onClick={onSet}
          disabled={!valid || !REGISTRY_LIVE || busy || !!batchOp}
          className="rounded-xl border border-plum/30 bg-plum/10 px-4 text-sm font-semibold text-plum transition hover:bg-plum/20 disabled:opacity-40"
        >
          {busy && pending?.kind === "set" ? <Loader2 className="h-4 w-4 animate-spin" /> : applyAllTlds && LIVE_TLDS.length > 1 ? `Set \u00d7 ${LIVE_TLDS.length}` : "Set"}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <TxError message={error?.message} onReset={reset} />
        <TxLink hash={hash} />
      </div>

      <ul className="mt-4 divide-y divide-white/5 rounded-xl border border-white/5">
        {items.map((x) => (
          <li key={x.label} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-mono">
              {x.label}
              <span className="text-white/30">
                {applyAllTlds && LIVE_TLDS.length > 1 ? ` (× ${LIVE_TLDS.length} TLDs)` : tldSuffix(tld)}
              </span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-plum">{formatPrice(x.price)}</span>
              <button
                onClick={() => onClear(x.label)}
                disabled={!REGISTRY_LIVE || busy || !!batchOp}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/60 transition hover:text-red-300 disabled:opacity-40"
              >
                {busy && pending?.kind === "clear" && pending.label === x.label
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Trash2 className="h-3 w-3" />}
                Clear
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-4 text-center text-xs text-white/40">
            Set per-name overrides here — e.g. <span className="font-mono">kaspa</span> @ 100,000 iKAS.
          </li>
        )}
      </ul>
    </Card>
  );
}

/* ── Treasury ───────────────────────────────────────────── */
function TreasuryCard({ tld }: { tld: Tld }) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const REGISTRY_LIVE = isTldLive(tld);
  const { data: balance, refetch } = useBalance({
    address: REGISTRY_ADDRESS,
    query: { enabled: REGISTRY_LIVE },
  });
  const [to, setTo] = useState("");
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;
  const valid = /^0x[a-fA-F0-9]{40}$/.test(to.trim());

  // ── DAO handoff sub-state. Transfers Registry ownership to a DAO multisig
  // in one click — same on-chain call as OwnershipCard's Transfer, surfaced
  // here so it lives next to "where the money goes" in the admin UX. Two-
  // step confirm because it's irreversible.
  const [daoAddr, setDaoAddr] = useState("");
  const [daoConfirming, setDaoConfirming] = useState(false);
  const {
    writeContract: writeDao,
    data: daoHash,
    isPending: daoPending,
    error: daoError,
    reset: daoReset,
  } = useWriteContract();
  const { isLoading: daoConfirming2, isSuccess: daoConfirmed } =
    useWaitForTransactionReceipt({ hash: daoHash });
  const daoBusy = daoPending || daoConfirming2;
  const daoValid = /^0x[a-fA-F0-9]{40}$/.test(daoAddr.trim());

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      setTo("");
      const t = setTimeout(reset, 1200);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, refetch, reset]);

  useEffect(() => {
    if (daoConfirmed) {
      setDaoAddr("");
      setDaoConfirming(false);
      const t = setTimeout(daoReset, 1500);
      return () => clearTimeout(t);
    }
  }, [daoConfirmed, daoReset]);

  const onWithdraw = () => {
    if (!valid) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "withdraw",
      args: [to as `0x${string}`],
    });
  };

  const onTransferToDao = () => {
    if (!daoValid) return;
    if (!daoConfirming) {
      setDaoConfirming(true);
      return;
    }
    writeDao({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "transferOwnership",
      args: [daoAddr.trim() as `0x${string}`],
    });
  };

  const displayBalance = REGISTRY_LIVE && balance ? `${Number(balance.formatted).toFixed(4)} iKAS` : "0 iKAS";

  return (
    <Card
      icon={<Wallet className="h-5 w-5 text-cyan" />}
      title="Treasury"
      subtitle="withdraw contract balance · hand off to DAO"
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="text-xs uppercase tracking-wider text-white/40">Registry balance</div>
        <div className="mt-1 text-2xl font-black ins-gradient-text">{displayBalance}</div>
        <div className="mt-0.5 text-[10px] text-white/30">
          {REGISTRY_LIVE ? "live from chain" : "no registry yet"}
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder="0x… destination"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan/40"
          spellCheck={false}
        />
        <button
          onClick={onWithdraw}
          disabled={!valid || !REGISTRY_LIVE || busy || !balance || balance.value === 0n}
          className="inline-flex items-center gap-1 rounded-xl border border-cyan/30 bg-cyan/10 px-4 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Withdraw
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <TxError message={error?.message} onReset={reset} />
        <TxLink hash={hash} />
      </div>

      {/* ── DAO Handoff ────────────────────────────────────
           One-click ownership transfer of THIS Registry to a DAO multisig.
           Same on-chain call as the Ownership card below; this is the
           shorthand surfaced next to Treasury so the "hand it to the
           community" path is the obvious one when the time comes. */}
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.03] p-4">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-emerald-300" />
          <h4 className="text-sm font-bold text-white">Transfer to DAO</h4>
          <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200">
            irreversible
          </span>
        </div>
        <p className="mt-1 text-xs text-white/50">
          Hand <span className="font-mono text-white/70">{tld}</span> Registry
          ownership to the DAO multisig. After this tx, only the DAO can
          adjust pricing, reservations, treasury withdrawals, and pause —
          this admin console will no longer have admin rights.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={daoAddr}
            onChange={(e) => { setDaoAddr(e.target.value); setDaoConfirming(false); }}
            placeholder="0x… DAO multisig address"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40"
            spellCheck={false}
          />
          <button
            onClick={onTransferToDao}
            disabled={!daoValid || !REGISTRY_LIVE || daoBusy}
            className={`inline-flex items-center gap-1 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-40 ${
              daoConfirming
                ? "border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            }`}
          >
            {daoBusy ? <><Loader2 className="h-4 w-4 animate-spin" />Handing over…</>
              : daoConfirming ? <>Confirm DAO handoff →</>
              : <>Transfer to DAO</>}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <TxError message={daoError?.message} onReset={daoReset} />
          <TxLink hash={daoHash} />
        </div>
        <p className="mt-3 text-[10px] text-white/35">
          Hands <code className="font-mono">{shortAddr(REGISTRY_ADDRESS)}</code> to
          the address above via <code className="font-mono">transferOwnership(newOwner)</code>.
          Marketplace + ReverseResolver have their own ownership — transfer
          those separately from the Marketplace card / Ownership card if
          you want full ecosystem handoff.
        </p>
      </div>
    </Card>
  );
}

/* ── Marketplace ────────────────────────────────────────── */
function MarketplaceCard({ tld }: { tld: Tld }) {
  const MARKETPLACE_ADDRESS = MARKETPLACE_ADDRESSES[tld];
  const MARKETPLACE_LIVE = isTldLive(tld);
  const { data: balance, refetch: refetchBalance } = useBalance({
    address: MARKETPLACE_ADDRESS,
    query: { enabled: MARKETPLACE_LIVE },
  });
  const { data: saleFeeBps, refetch: refetchSaleFee } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "saleFeeBps",
    query: { enabled: MARKETPLACE_LIVE },
  });
  const { data: featureFeeBps, refetch: refetchFeatureFee } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "featureFeeBps",
    query: { enabled: MARKETPLACE_LIVE },
  });
  const { data: treasury, refetch: refetchTreasury } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "treasury",
    query: { enabled: MARKETPLACE_LIVE },
  });
  const { data: paused, refetch: refetchPaused } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "paused",
    query: { enabled: MARKETPLACE_LIVE },
  });
  const { data: mktOwner } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "owner",
    query: { enabled: MARKETPLACE_LIVE },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  const [saleBpsInput, setSaleBpsInput] = useState("");
  const [featureBpsInput, setFeatureBpsInput] = useState("");
  const [treasuryInput, setTreasuryInput] = useState("");

  useEffect(() => {
    if (isConfirmed) {
      refetchBalance();
      refetchSaleFee();
      refetchFeatureFee();
      refetchTreasury();
      refetchPaused();
      setSaleBpsInput("");
      setFeatureBpsInput("");
      setTreasuryInput("");
      const t = setTimeout(reset, 1200);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, refetchBalance, refetchSaleFee, refetchFeatureFee, refetchTreasury, refetchPaused, reset]);

  const saleBps = Number(saleFeeBps ?? 0);
  const featureBps = Number(featureFeeBps ?? 0);
  const displayBal = balance ? `${Number(balance.formatted).toFixed(4)} iKAS` : "0 iKAS";

  const saleBpsNum = Number(saleBpsInput);
  const saleValid = Number.isFinite(saleBpsNum) && saleBpsNum >= 0 && saleBpsNum <= 500 && saleBpsInput !== "";
  const featBpsNum = Number(featureBpsInput);
  const featValid = Number.isFinite(featBpsNum) && featBpsNum >= 0 && featBpsNum <= 500 && featureBpsInput !== "";
  const treasuryValid = /^0x[a-fA-F0-9]{40}$/.test(treasuryInput.trim());

  const onSetSaleFee = () => {
    if (!saleValid) return;
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "setSaleFeeBps",
      args: [saleBpsNum],
    });
  };
  const onSetFeatureFee = () => {
    if (!featValid) return;
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "setFeatureFeeBps",
      args: [featBpsNum],
    });
  };
  const onSetTreasury = () => {
    if (!treasuryValid) return;
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "setTreasury",
      args: [treasuryInput.trim() as `0x${string}`],
    });
  };
  const onTogglePause = () => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MARKETPLACE_ABI,
      functionName: "setPaused",
      args: [!paused],
    });
  };

  return (
    <Card
      icon={<Store className="h-5 w-5 text-cyan" />}
      title="Marketplace"
      subtitle={
        MARKETPLACE_LIVE
          ? `${saleBps / 100}% seller fee · ${featureBps / 100}% featured · ${paused ? "paused" : "live"}`
          : "contract not deployed"
      }
    >
      {!MARKETPLACE_LIVE ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/60">
          Set <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[10px]">NEXT_PUBLIC_INS_MARKETPLACE</code>{" "}
          after deploying INSMarketplace.sol.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Treasury balance</div>
              <div className="mt-0.5 text-lg font-black ins-gradient-text">{displayBal}</div>
              <div className="mt-0.5 text-[10px] text-white/30">contract holds nothing — fees forward on each tx</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">State</div>
              <div className="mt-0.5 flex items-center gap-2">
                <span
                  className={`inline-flex h-2 w-2 rounded-full ${paused ? "bg-amber-400" : "bg-emerald-400"}`}
                />
                <span className="text-sm font-bold">{paused ? "Paused" : "Live"}</span>
              </div>
              <button
                onClick={onTogglePause}
                disabled={busy}
                className={`mt-2 inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40 ${
                  paused
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                }`}
              >
                {paused ? <><Play className="h-3 w-3" /> Resume</> : <><Pause className="h-3 w-3" /> Pause</>}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <label className="text-[11px] uppercase tracking-wider text-white/50">Seller fee (bps · max 500)</label>
                <span className="text-[10px] text-white/40">current {saleBps} ({saleBps / 100}%)</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={saleBpsInput}
                  onChange={(e) => setSaleBpsInput(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={String(saleBps)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:border-cyan/40 focus:outline-none"
                  spellCheck={false}
                />
                <button
                  onClick={onSetSaleFee}
                  disabled={!saleValid || busy}
                  className="inline-flex items-center gap-1 rounded-xl border border-cyan/30 bg-cyan/10 px-3 text-xs font-semibold text-cyan transition hover:bg-cyan/20 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <label className="text-[11px] uppercase tracking-wider text-white/50">Featured fee (bps · max 500)</label>
                <span className="text-[10px] text-white/40">current {featureBps} ({featureBps / 100}%)</span>
              </div>
              <div className="flex gap-2">
                <input
                  value={featureBpsInput}
                  onChange={(e) => setFeatureBpsInput(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder={String(featureBps)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:border-cyan/40 focus:outline-none"
                  spellCheck={false}
                />
                <button
                  onClick={onSetFeatureFee}
                  disabled={!featValid || busy}
                  className="inline-flex items-center gap-1 rounded-xl border border-cyan/30 bg-cyan/10 px-3 text-xs font-semibold text-cyan transition hover:bg-cyan/20 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <label className="text-[11px] uppercase tracking-wider text-white/50">Treasury address</label>
                <span className="font-mono text-[10px] text-white/40">
                  {treasury ? shortAddr(treasury as `0x${string}`) : "…"}
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  value={treasuryInput}
                  onChange={(e) => setTreasuryInput(e.target.value)}
                  placeholder="0x… new treasury"
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:border-cyan/40 focus:outline-none"
                  spellCheck={false}
                />
                <button
                  onClick={onSetTreasury}
                  disabled={!treasuryValid || busy}
                  className="inline-flex items-center gap-1 rounded-xl border border-cyan/30 bg-cyan/10 px-3 text-xs font-semibold text-cyan transition hover:bg-cyan/20 disabled:opacity-40"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <TxError message={error?.message} onReset={reset} />
            <TxLink hash={hash} />
          </div>

          <p className="mt-4 border-t border-white/5 pt-3 text-[10px] text-white/40">
            Owner: <span className="font-mono">{mktOwner ? shortAddr(mktOwner as `0x${string}`) : "…"}</span>
            <span className="mx-1.5 text-white/20">·</span>
            Contract: <span className="font-mono">{shortAddr(MARKETPLACE_ADDRESS)}</span>
          </p>
        </>
      )}
    </Card>
  );
}

/* ── Pre-launch listings ──────────────────────────────────
 * One-card end-to-end builder for showcase listings before public launch.
 * For a given (label, price) and the currently-active TLD (or all 3 if
 * apply-all is on), the card:
 *   1. reads on-chain state (reserved, minted, owner, approval, listing)
 *   2. computes the conditional plan per TLD
 *   3. on click, runs the step queue:
 *        - setReserved   (skip if already reserved)
 *        - adminMint     (skip if admin already owns it)
 *        - setApprovalForAll (skip if already approved)
 *        - createListing (skip if already listed)
 *   Featured = always on (1% upfront fee), expiry = uint64.max ("forever").
 *   Cancel via the existing /domains UI per name.
 */

/** A single write tx in the listing queue. */
type ListStepKind = "reserve" | "mint" | "approve" | "list";
type ListStep = {
  kind: ListStepKind;
  tld: Tld;
  /** Resolved fresh right before the "list" step fires (post-mint). */
  needsTokenIdLookup?: boolean;
};

/** Per-TLD pre-flight readout. */
type ListPreFlight = {
  tld: Tld;
  /** Initial chain reads — undefined if still loading. */
  reserved?: boolean;
  tokenId?: bigint;
  owner?: `0x${string}`;
  approved?: boolean;
  listed?: boolean;
  featureFeeBps?: number;
  /** Plan derived from above. */
  needs: { reserve: boolean; mint: boolean; approve: boolean; list: boolean };
  /** Hard block — operator can't proceed on this TLD without manual fix. */
  blocked?: string;
};

/** uint64.max — effectively "no expiry" within any practical timeframe. */
const FOREVER_EXPIRY = (2n ** 64n - 1n);

function PreLaunchListingsCard({ tld }: { tld: Tld }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [labelInput, setLabelInput] = useState("");
  const [priceInput, setPriceInput] = useState("");

  const cleanedLabel = cleanLabel(labelInput);
  const labelValid = isValidLabel(cleanedLabel);
  const priceNum = Number(priceInput);
  const priceValid = Number.isFinite(priceNum) && priceNum > 0;
  const priceWei = priceValid ? parseEther(String(priceNum)) : 0n;

  // "Apply to all live TLDs" toggle — persisted.
  const [applyAllTlds, setApplyAllTlds] = useState(true);
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined"
        ? window.localStorage.getItem("ins:listingApplyAll")
        : null;
      if (saved === "false") setApplyAllTlds(false);
    } catch { /* noop */ }
  }, []);
  const onToggleApplyAll = (v: boolean) => {
    setApplyAllTlds(v);
    try { window.localStorage.setItem("ins:listingApplyAll", String(v)); } catch { /* noop */ }
  };

  const targetTlds: Tld[] = applyAllTlds
    ? [tld, ...(TLDS as readonly Tld[]).filter((t) => t !== tld && isTldLive(t))]
    : [tld];

  // Pre-flight reads — 4 reads × N TLDs in one batch. Auto-refreshes on input.
  // The `address` non-null guard is critical: isApprovedForAll's first arg must
  // be a real address. We gate via `enabled` AND default to a sentinel zero
  // address only when address is briefly undefined during a remount.
  const enabledReads = labelValid && targetTlds.length > 0 && !!address;
  const safeAddr: `0x${string}` = address ?? "0x0000000000000000000000000000000000000000";
  const { data: reads1, refetch: refetchReads1 } = useReadContracts({
    contracts: targetTlds.flatMap((t) => [
      { address: REGISTRY_ADDRESSES[t], abi: REGISTRY_ABI, functionName: "reserved" as const, args: [cleanedLabel] as const },
      { address: REGISTRY_ADDRESSES[t], abi: REGISTRY_ABI, functionName: "tokenIdOf" as const, args: [cleanedLabel] as const },
      { address: REGISTRY_ADDRESSES[t], abi: REGISTRY_ABI, functionName: "isApprovedForAll" as const, args: [safeAddr, MARKETPLACE_ADDRESSES[t]] as const },
      { address: MARKETPLACE_ADDRESSES[t], abi: MARKETPLACE_ABI, functionName: "featureFeeBps" as const, args: [] as const },
    ]),
    query: { enabled: enabledReads },
  });

  // For each TLD where tokenId !== 0, also read ownerOf + getActiveListing.
  // We do this as a second batch driven by the reads1 result.
  const tldsNeedingSecondPass = useMemo(() => {
    if (!reads1) return [] as { tld: Tld; tokenId: bigint }[];
    const out: { tld: Tld; tokenId: bigint }[] = [];
    for (let i = 0; i < targetTlds.length; i++) {
      const tokenId = reads1[i * 4 + 1]?.result as bigint | undefined;
      if (tokenId !== undefined && tokenId !== 0n) {
        out.push({ tld: targetTlds[i], tokenId });
      }
    }
    return out;
  }, [reads1, targetTlds]);

  const { data: reads2, refetch: refetchReads2 } = useReadContracts({
    contracts: tldsNeedingSecondPass.flatMap((x) => [
      { address: REGISTRY_ADDRESSES[x.tld], abi: REGISTRY_ABI, functionName: "ownerOf" as const, args: [x.tokenId] as const },
      { address: MARKETPLACE_ADDRESSES[x.tld], abi: MARKETPLACE_ABI, functionName: "getActiveListing" as const, args: [x.tokenId] as const },
    ]),
    query: { enabled: tldsNeedingSecondPass.length > 0 },
  });

  // Build the per-TLD pre-flight table.
  const preflight: ListPreFlight[] = useMemo(() => {
    const out: ListPreFlight[] = [];
    for (let i = 0; i < targetTlds.length; i++) {
      const t = targetTlds[i];
      const reserved = reads1?.[i * 4 + 0]?.result as boolean | undefined;
      const tokenId  = reads1?.[i * 4 + 1]?.result as bigint  | undefined;
      const approved = reads1?.[i * 4 + 2]?.result as boolean | undefined;
      const featureFeeBps = reads1?.[i * 4 + 3]?.result as number | undefined;

      let owner: `0x${string}` | undefined;
      let listed: boolean | undefined;
      if (tokenId !== undefined && tokenId !== 0n) {
        const idx = tldsNeedingSecondPass.findIndex((x) => x.tld === t);
        if (idx >= 0) {
          owner = reads2?.[idx * 2 + 0]?.result as `0x${string}` | undefined;
          const listingTuple = reads2?.[idx * 2 + 1]?.result as { active: boolean } | undefined;
          listed = listingTuple?.active ?? undefined;
        }
      } else if (tokenId === 0n) {
        listed = false;
      }

      // Compute the plan only when all relevant reads have landed.
      const stillLoading =
        reserved === undefined ||
        tokenId === undefined ||
        approved === undefined ||
        featureFeeBps === undefined ||
        (tokenId !== 0n && (owner === undefined || listed === undefined));

      const needs = stillLoading
        ? { reserve: false, mint: false, approve: false, list: false }
        : {
            reserve: !reserved,
            mint: tokenId === 0n,
            approve: !approved,
            list: !listed && priceValid,
          };

      let blocked: string | undefined;
      if (!stillLoading && tokenId !== 0n && owner && address && owner.toLowerCase() !== address.toLowerCase()) {
        blocked = `Owned by ${shortAddr(owner)} — not by you. Buy or transfer first.`;
      }

      out.push({ tld: t, reserved, tokenId, owner, approved, listed, featureFeeBps, needs, blocked });
    }
    return out;
  }, [reads1, reads2, targetTlds, tldsNeedingSecondPass, priceValid, address]);

  // Build the step queue from preflight (skipping no-op steps + blocked TLDs).
  const plannedSteps: ListStep[] = useMemo(() => {
    if (!labelValid || !priceValid || !address) return [];
    const out: ListStep[] = [];
    for (const pf of preflight) {
      if (pf.blocked) continue;
      if (pf.needs.reserve) out.push({ kind: "reserve", tld: pf.tld });
      if (pf.needs.mint)    out.push({ kind: "mint",    tld: pf.tld });
      if (pf.needs.approve) out.push({ kind: "approve", tld: pf.tld });
      if (pf.needs.list)    out.push({ kind: "list",    tld: pf.tld, needsTokenIdLookup: pf.needs.mint });
    }
    return out;
  }, [preflight, labelValid, priceValid, address]);

  const totalUpfrontFeeWei = useMemo(() => {
    if (!priceValid) return 0n;
    let sum = 0n;
    for (const pf of preflight) {
      if (pf.blocked || !pf.needs.list || pf.featureFeeBps === undefined) continue;
      sum += (priceWei * BigInt(pf.featureFeeBps)) / 10000n;
    }
    return sum;
  }, [preflight, priceWei, priceValid]);

  /* ── Step queue runner ──────────────────────────────────── */
  const [activeQueue, setActiveQueue] = useState<ListStep[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [stepStatuses, setStepStatuses] = useState<BatchTldStatus[]>([]);
  const [stepHashes, setStepHashes] = useState<(`0x${string}` | undefined)[]>([]);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const busy = isPending || !!activeQueue;

  /** Resolve tokenId for a "list" step (read fresh post-mint). */
  const resolveTokenId = async (t: Tld): Promise<bigint> => {
    if (!publicClient) throw new Error("No RPC client");
    const id = await publicClient.readContract({
      address: REGISTRY_ADDRESSES[t],
      abi: REGISTRY_ABI,
      functionName: "tokenIdOf",
      args: [cleanedLabel],
    });
    return id as bigint;
  };

  /* ── Safe-aware step runner ─────────────────────────────────
   * Old design relied on wagmi's `useWaitForTransactionReceipt` to know
   * when a step "mined" — but with a Safe-mediated wallet, the outer
   * Safe.execTransaction returns success even when the inner call
   * (adminMint, createListing) reverts silently. That made the queue
   * race ahead, computing createListing args against a tokenId of 0
   * because the mint hadn't actually executed yet → silent revert →
   * no listings.
   *
   * New design (post 2026-04-26 pivot): after firing each writeContract,
   * POLL the chain for the EXPECTED state change with viem readContract.
   *   - reserve:  poll reserved(label) → true
   *   - mint:     poll tokenIdOf(label) → non-zero AND ownerOf == admin
   *   - approve:  poll isApprovedForAll(admin, market) → true
   *   - list:     poll getActiveListing(tokenId).active → true
   *
   * Works for EOA wallets (state changes in ~5s, polling catches it
   * fast) AND Safe wallets (state may take longer if Safe queues; we
   * wait up to POLL_TIMEOUT_MS, default 180s, then mark failed with a
   * helpful "Safe execution may still be pending" message).
   */
  const POLL_INTERVAL_MS = 3_000;
  const POLL_TIMEOUT_MS  = 180_000; // 3 min — generous for Safe queue execution

  const checkStepCompleted = async (step: ListStep): Promise<boolean> => {
    if (!publicClient) return false;
    try {
      if (step.kind === "reserve") {
        const r = await publicClient.readContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "reserved",
          args: [cleanedLabel],
        });
        return r === true;
      }
      if (step.kind === "mint") {
        const id = (await publicClient.readContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "tokenIdOf",
          args: [cleanedLabel],
        })) as bigint;
        if (id === 0n) return false;
        const owner = (await publicClient.readContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "ownerOf",
          args: [id],
        })) as `0x${string}`;
        return owner.toLowerCase() === (address ?? "").toLowerCase();
      }
      if (step.kind === "approve") {
        if (!address) return false;
        const ok = await publicClient.readContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "isApprovedForAll",
          args: [address, MARKETPLACE_ADDRESSES[step.tld]],
        });
        return ok === true;
      }
      if (step.kind === "list") {
        const id = (await publicClient.readContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "tokenIdOf",
          args: [cleanedLabel],
        })) as bigint;
        if (id === 0n) return false;
        const listing = (await publicClient.readContract({
          address: MARKETPLACE_ADDRESSES[step.tld],
          abi: MARKETPLACE_ABI,
          functionName: "getActiveListing",
          args: [id],
        })) as { active: boolean };
        return listing.active === true;
      }
    } catch {
      return false;
    }
    return false;
  };

  /** Resolves once the step's expected state is on chain, OR rejects on
   *  timeout. Polls every POLL_INTERVAL_MS, gives up after POLL_TIMEOUT_MS. */
  const pollForCompletion = async (step: ListStep, atIdx: number): Promise<void> => {
    const start = Date.now();
    // First check immediately — if state already true (rare but possible for
    // already-reserved labels etc.), skip the wait entirely.
    if (await checkStepCompleted(step)) return;
    while (Date.now() - start < POLL_TIMEOUT_MS) {
      // Bail if user cancelled this whole queue
      if (activeQueueRef.current === null) {
        throw new Error("Queue cancelled");
      }
      // Or if user moved on to a different step (retry / cancel current)
      if (stepIdxRef.current !== atIdx) {
        throw new Error("Step superseded");
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (await checkStepCompleted(step)) return;
    }
    throw new Error(
      `Step "${step.kind}" timed out after ${Math.round(POLL_TIMEOUT_MS / 1000)}s. ` +
      `Either the wallet popup was dismissed, the inner call reverted silently ` +
      `(e.g. createListing with tokenId=0), or a Safe-mediated tx is still ` +
      `awaiting execution. Check Safe queue + retry.`,
    );
  };

  const fireStep = async (queue: ListStep[], idx: number) => {
    if (idx >= queue.length) return;
    const step = queue[idx];
    setStepStatuses((arr) => arr.map((s, i) => (i === idx ? "signing" : s)));
    reset();

    // ── Phase 1: fire the writeContract (proposes tx; with EOA, mines ~5s; with Safe, queues)
    try {
      if (step.kind === "reserve") {
        writeContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "setReserved",
          args: [cleanedLabel, true],
        });
      } else if (step.kind === "mint") {
        if (!address) throw new Error("Wallet not connected");
        writeContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "adminMint",
          args: [cleanedLabel, address],
        });
      } else if (step.kind === "approve") {
        writeContract({
          address: REGISTRY_ADDRESSES[step.tld],
          abi: REGISTRY_ABI,
          functionName: "setApprovalForAll",
          args: [MARKETPLACE_ADDRESSES[step.tld], true],
        });
      } else if (step.kind === "list") {
        const tokenId = await resolveTokenId(step.tld);
        if (tokenId === 0n) {
          throw new Error("Cannot list — tokenId is 0. Mint hasn't completed yet on chain.");
        }
        const pf = preflight.find((p) => p.tld === step.tld);
        const ffBps = pf?.featureFeeBps ?? 100;
        const featureFee = (priceWei * BigInt(ffBps)) / 10000n;
        writeContract({
          address: MARKETPLACE_ADDRESSES[step.tld],
          abi: MARKETPLACE_ABI,
          functionName: "createListing",
          args: [tokenId, priceWei, FOREVER_EXPIRY, true],
          value: featureFee,
        });
      }
    } catch (e) {
      setStepStatuses((arr) => arr.map((s, i) => (i === idx ? "failed" : s)));
      console.error("PreLaunchListings fire failed:", e);
      return;
    }

    // ── Phase 2: poll the chain for the expected state change.
    // This is THE Safe-aware bit. We don't trust wagmi's isConfirmed
    // because Safe can return success-of-outer with revert-of-inner.
    try {
      await pollForCompletion(step, idx);
      // Confirmed via chain state. Mark mined + capture whatever hash wagmi has.
      setStepStatuses((arr) => arr.map((s, i) => (i === idx ? "mined" : s)));
      setStepHashes((arr) =>
        arr.map((h, i) => (i === idx ? (hashRef.current ?? "0x" as `0x${string}`) : h)),
      );

      if (idx + 1 < queue.length) {
        // Small breath so any indexers settle, then advance.
        await new Promise((r) => setTimeout(r, 500));
        void fireStep(queue, idx + 1);
      } else {
        // All steps verified on chain. Refresh + linger green strip.
        refetchReads1();
        refetchReads2();
        setTimeout(() => {
          setActiveQueue(null);
          setStepStatuses([]);
          setStepHashes([]);
          setStepIdx(0);
          setLabelInput("");
          setPriceInput("");
          reset();
        }, 3500);
      }
    } catch (e) {
      setStepStatuses((arr) => arr.map((s, i) => (i === idx ? "failed" : s)));
      console.error("PreLaunchListings poll failed:", e);
    }
  };

  const startQueue = async () => {
    if (busy || plannedSteps.length === 0) return;
    setActiveQueue(plannedSteps);
    setStepIdx(0);
    setStepStatuses(plannedSteps.map(() => "pending"));
    setStepHashes(plannedSteps.map(() => undefined));
    activeQueueRef.current = plannedSteps;
    stepIdxRef.current = 0;
    await fireStep(plannedSteps, 0);
  };

  // Refs that polling loops use to detect cancel/supersede without stale closures.
  const activeQueueRef = useRef<ListStep[] | null>(null);
  const stepIdxRef = useRef<number>(0);
  const hashRef = useRef<`0x${string}` | undefined>(undefined);
  useEffect(() => { activeQueueRef.current = activeQueue; }, [activeQueue]);
  useEffect(() => { stepIdxRef.current = stepIdx; }, [stepIdx]);
  useEffect(() => { hashRef.current = hash; }, [hash]);

  // Mark step failed if wagmi reports a write-side error (rejected popup etc.)
  useEffect(() => {
    if (!activeQueue || !error) return;
    setStepStatuses((arr) => arr.map((s, i) => (i === stepIdx ? "failed" : s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const retryFromFailed = () => {
    if (!activeQueue) return;
    const failedIdx = stepStatuses.findIndex((s) => s === "failed");
    if (failedIdx === -1) return;
    setStepStatuses((arr) => arr.map((s, i) => (i === failedIdx ? "pending" : s)));
    setStepIdx(failedIdx);
    stepIdxRef.current = failedIdx;
    reset();
    void fireStep(activeQueue, failedIdx);
  };

  const cancelQueue = () => {
    setActiveQueue(null);
    setStepIdx(0);
    setStepStatuses([]);
    setStepHashes([]);
    activeQueueRef.current = null; // signals any in-flight pollForCompletion to bail
    reset();
  };

  const stepLabel = (step: ListStep): string => {
    const suffix = tldSuffix(step.tld);
    if (step.kind === "reserve") return `reserve ${cleanedLabel}${suffix}`;
    if (step.kind === "mint")    return `mint ${cleanedLabel}${suffix} → you`;
    if (step.kind === "approve") return `approve marketplace${suffix}`;
    return `list ${cleanedLabel}${suffix} @ ${priceNum.toLocaleString()} iKAS (featured)`;
  };

  const allMined = activeQueue && stepStatuses.length > 0 && stepStatuses.every((s) => s === "mined");
  const anyFailed = stepStatuses.some((s) => s === "failed");

  return (
    <Card
      icon={<Rocket className="h-5 w-5 text-plum" />}
      title="Pre-launch listings"
      subtitle="reserve → mint → approve → list, fan-out across TLDs, featured"
    >
      <ApplyAllTldsToggle
        on={applyAllTlds}
        onToggle={onToggleApplyAll}
        currentTld={tld}
        liveTldCount={LIVE_TLDS.length}
        disabled={busy}
      />

      {/* Inputs */}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          placeholder="kaspa"
          disabled={busy}
          className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-plum/40 disabled:opacity-50"
          spellCheck={false}
        />
        <div className="flex items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
          <input
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="50000"
            disabled={busy}
            className="w-24 bg-transparent text-sm placeholder:text-white/30 focus:outline-none disabled:opacity-50"
          />
          <span className="text-xs text-white/40">iKAS</span>
        </div>
      </div>

      {/* Pre-flight readout */}
      {labelValid && (
        <div className="mt-3 space-y-1.5">
          {preflight.map((pf) => {
            const stepCount =
              (pf.needs.reserve ? 1 : 0) +
              (pf.needs.mint ? 1 : 0) +
              (pf.needs.approve ? 1 : 0) +
              (pf.needs.list ? 1 : 0);
            const isReady = pf.reserved !== undefined && pf.tokenId !== undefined;
            return (
              <div
                key={pf.tld}
                className={`rounded-lg border p-2 text-[11px] ${
                  pf.blocked ? "border-red-500/30 bg-red-500/[0.04]" :
                  stepCount === 0 && isReady ? "border-emerald-500/30 bg-emerald-500/[0.04]" :
                  "border-white/10 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white/80">{cleanedLabel}{tldSuffix(pf.tld)}</span>
                  <span className="text-white/40">
                    {!isReady ? "reading…" :
                      pf.blocked ? "blocked" :
                      stepCount === 0 ? "already live ✓" :
                      `${stepCount} step${stepCount > 1 ? "s" : ""}`}
                  </span>
                </div>
                {isReady && !pf.blocked && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <PfBadge ok={!pf.needs.reserve} on="reserved" off="needs reserve" />
                    <PfBadge ok={!pf.needs.mint}    on="minted"   off="needs mint" />
                    <PfBadge ok={!pf.needs.approve} on="approved" off="needs approve" />
                    <PfBadge ok={!pf.needs.list}    on="listed"   off="needs list" />
                  </div>
                )}
                {pf.blocked && (
                  <div className="mt-1 text-red-300">{pf.blocked}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Featured-fee summary */}
      {priceValid && totalUpfrontFeeWei > 0n && !activeQueue && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-plum/30 bg-plum/[0.04] px-3 py-2 text-[11px] text-plum">
          <Star className="h-3 w-3" />
          <span>
            Featured upfront fee: <span className="font-mono">{Number(formatEther(totalUpfrontFeeWei)).toLocaleString()} iKAS</span>
            {" "}(1% of {priceNum.toLocaleString()} iKAS × {plannedSteps.filter(s => s.kind === "list").length} TLD{plannedSteps.filter(s => s.kind === "list").length === 1 ? "" : "s"}).
          </span>
        </div>
      )}

      {/* Active queue progress */}
      {activeQueue && (
        <div className={`mt-3 rounded-xl border p-3 transition ${
          anyFailed ? "border-red-500/40 bg-red-500/[0.04]" :
          allMined  ? "border-emerald-500/40 bg-emerald-500/[0.05]" :
                      "border-cyan/40 bg-cyan/[0.04]"
        }`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-bold text-white">
              {allMined ? <><Check className="mr-1 inline h-3 w-3 text-emerald-300" />All listings live.</> : `Step ${Math.min(stepIdx + 1, activeQueue.length)} of ${activeQueue.length} — ${stepLabel(activeQueue[stepIdx] ?? activeQueue[activeQueue.length - 1])}`}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {activeQueue.map((step, i) => {
              const s = stepStatuses[i];
              const cls =
                s === "mined"   ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" :
                s === "signing" ? "border-cyan/40 bg-cyan/15 text-cyan" :
                s === "failed"  ? "border-red-500/40 bg-red-500/10 text-red-300" :
                                  "border-white/10 bg-white/[0.04] text-white/55";
              const h = stepHashes[i];
              const inner = (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono ${cls}`}>
                  {s === "signing" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                  {s === "mined"   && <Check className="h-2.5 w-2.5" />}
                  {step.kind}·{tldSuffix(step.tld)}
                </span>
              );
              return s === "mined" && h ? (
                <a key={i} href={`${IGRA_EXPLORER}/tx/${h}`} target="_blank" rel="noreferrer" title={stepLabel(step)} className="transition hover:opacity-90">{inner}</a>
              ) : (
                <span key={i} title={stepLabel(step)}>{inner}</span>
              );
            })}
          </div>
          {anyFailed && (
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-red-300">
              <span className="truncate" title={error?.message}>
                Failed at step {stepIdx + 1} — {error?.message?.split("\n")[0] ?? "see console"}
              </span>
              <span className="flex flex-none gap-1">
                <button onClick={retryFromFailed} className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-200 hover:bg-red-500/20">Retry</button>
                <button onClick={cancelQueue} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/60 hover:text-white">Cancel</button>
              </span>
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="mt-3">
        <button
          onClick={startQueue}
          disabled={!labelValid || !priceValid || !address || busy || plannedSteps.length === 0 || preflight.some(p => !!p.blocked)}
          className="btn-primary w-full justify-center"
        >
          {busy ? (
            <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Building…</>
          ) : plannedSteps.length === 0 && labelValid ? (
            <>Nothing to do — already live</>
          ) : (
            <>
              <Rocket className="mr-1 inline h-4 w-4" />
              Build {plannedSteps.length || ""} listing{plannedSteps.length === 1 ? "" : "s"} {plannedSteps.length > 0 ? `→` : ""}
            </>
          )}
        </button>
        <p className="mt-2 text-[10px] text-white/40">
          Featured = 1% upfront fee (paid on each list step). Expiry = forever (uint64 max). Cancel any listing anytime via <span className="font-mono">/domains</span> or directly via <span className="font-mono">cancelListing(tokenId)</span>.
        </p>
      </div>
    </Card>
  );
}

/** Tiny pill used in the pre-flight readout. */
function PfBadge({ ok, on, off }: { ok: boolean; on: string; off: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${
      ok ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" :
           "border-amber-500/30 bg-amber-500/10 text-amber-200"
    }`}>
      {ok ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
      {ok ? on : off}
    </span>
  );
}

/* ── Cleanup ──────────────────────────────────────────────
 * Pre-launch (and ongoing) janitor card. Discovers two classes of
 * stale on-chain artifacts and exposes one-click cleanup actions:
 *
 *   1. Active marketplace listings — every (TLD, tokenId) where
 *      getActiveListing(tokenId).active is true. One-click cancel
 *      (cancelListing(tokenId)) — only valid when seller == you.
 *
 *   2. Premium-price overrides — every label with a non-zero
 *      premiumPrice on at least one TLD. Discovered by scanning the
 *      reserved-labels seed list + minted-labels (via labelOf scan
 *      across totalSupply on each TLD). One-click clear sets
 *      setPremiumPrice(label, 0) on whichever TLDs the override is
 *      currently set, with an "Apply to all 3" toggle to fan out
 *      a wholesale clear in one batch.
 *
 * Both flows reuse the per-TLD chip strip / step queue patterns
 * from the other admin cards.
 */
function CleanupCard({ tld: _tld }: { tld: Tld }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // ── Discovered state ─────────────────────────────────────
  const [activeListings, setActiveListings] = useState<Array<{
    tld: Tld;
    tokenId: bigint;
    label: string;
    seller: `0x${string}`;
    price: bigint;
    featured: boolean;
    expiry: bigint;
  }> | null>(null);

  const [premiumLabels, setPremiumLabels] = useState<Array<{
    label: string;
    perTld: Record<Tld, bigint>; // 0n if not set on that TLD
  }> | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  /**
   * Discover all active listings + premium overrides across every live TLD.
   * Per TLD: read totalSupply, then iterate getActiveListing for each
   * tokenId in [1..totalSupply]. For premiums: pull the union of
   * /api/reserved-labels?tld=* labels + the labelOf for every minted
   * tokenId, then read premiumPrice on each Registry.
   */
  const runScan = async () => {
    if (!publicClient) return;
    setScanning(true);
    setScanError(null);
    try {
      // ── Phase 1: per-TLD totalSupply + labels-via-labelOf + active listings
      const listings: NonNullable<typeof activeListings> = [];
      const mintedLabels = new Set<string>();

      for (const t of LIVE_TLDS) {
        const supply = (await publicClient.readContract({
          address: REGISTRY_ADDRESSES[t],
          abi: REGISTRY_ABI,
          functionName: "totalSupply",
          args: [],
        })) as bigint;

        // Tokens are 1-indexed; iterate 1..supply
        for (let i = 1n; i <= supply; i++) {
          // Read label for display
          let label = "";
          try {
            label = (await publicClient.readContract({
              address: REGISTRY_ADDRESSES[t],
              abi: REGISTRY_ABI,
              functionName: "labelOf",
              args: [i],
            })) as string;
          } catch { /* tokenId may not exist — burned; skip */ continue; }
          if (label) mintedLabels.add(label);

          // Read active listing (may be empty struct)
          const listing = (await publicClient.readContract({
            address: MARKETPLACE_ADDRESSES[t],
            abi: MARKETPLACE_ABI,
            functionName: "getActiveListing",
            args: [i],
          })) as { seller: `0x${string}`; expiry: bigint; featured: boolean; active: boolean; price: bigint };

          if (listing.active) {
            listings.push({
              tld: t,
              tokenId: i,
              label,
              seller: listing.seller,
              price: listing.price,
              featured: listing.featured,
              expiry: listing.expiry,
            });
          }
        }
      }

      // ── Phase 2: premium overrides
      // Union of: /api/reserved-labels?tld=* across all live TLDs + minted labels.
      const labelUnion = new Set<string>(mintedLabels);
      for (const t of LIVE_TLDS) {
        try {
          const res = await fetch(`/api/reserved-labels?tld=${t}`);
          if (res.ok) {
            const data = (await res.json()) as { labels?: string[] };
            data.labels?.forEach((l) => labelUnion.add(l));
          }
        } catch { /* non-fatal — fall through with what we have */ }
      }

      const premiums: NonNullable<typeof premiumLabels> = [];
      for (const label of Array.from(labelUnion).sort()) {
        const perTld = { ins: 0n, igra: 0n, ikas: 0n } as Record<Tld, bigint>;
        let anyNonZero = false;
        for (const t of LIVE_TLDS) {
          const p = (await publicClient.readContract({
            address: REGISTRY_ADDRESSES[t],
            abi: REGISTRY_ABI,
            functionName: "premiumPrice",
            args: [label],
          })) as bigint;
          perTld[t] = p;
          if (p !== 0n) anyNonZero = true;
        }
        if (anyNonZero) premiums.push({ label, perTld });
      }

      setActiveListings(listings);
      setPremiumLabels(premiums);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "scan failed");
    } finally {
      setScanning(false);
    }
  };

  // Auto-scan on first mount.
  useEffect(() => {
    if (publicClient && activeListings === null && !scanning) {
      void runScan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient]);

  // ── Action runners — one-shot writes. We don't bother with the full
  // step-queue UI here because each cleanup is one tx; users can chain
  // them by clicking one after another.
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  const [pending, setPending] = useState<{
    kind: "cancel" | "clearPremium";
    tld?: Tld;
    tokenId?: bigint;
    label?: string;
  } | null>(null);

  // Auto-rescan after each successful cleanup so the list stays accurate.
  useEffect(() => {
    if (isConfirmed && pending) {
      setPending(null);
      const t = setTimeout(() => {
        reset();
        void runScan();
      }, 1200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmed]);

  const onCancelListing = (tld: Tld, tokenId: bigint) => {
    if (busy) return;
    setPending({ kind: "cancel", tld, tokenId });
    writeContract({
      address: MARKETPLACE_ADDRESSES[tld],
      abi: MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [tokenId],
    });
  };

  // Single-TLD clear — most common case (e.g. clear kaspa.ins which is
  // the only TLD that actually has a premium set for kaspa).
  const onClearPremiumOnTld = (tld: Tld, label: string) => {
    if (busy) return;
    setPending({ kind: "clearPremium", tld, label });
    writeContract({
      address: REGISTRY_ADDRESSES[tld],
      abi: REGISTRY_ABI,
      functionName: "setPremiumPrice",
      args: [label, 0n],
    });
  };

  const isMyListing = (seller: `0x${string}`) =>
    address && seller.toLowerCase() === address.toLowerCase();

  return (
    <Card
      icon={<Sparkles className="h-5 w-5 text-cyan" />}
      title="Cleanup"
      subtitle="discover + remove stale listings + premium overrides across all TLDs"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] text-white/50">
          {scanning
            ? "Scanning all 3 TLDs…"
            : activeListings === null
            ? "Click Refresh to scan."
            : `Last scan: ${activeListings.length} active listing${activeListings.length === 1 ? "" : "s"}, ${premiumLabels?.length ?? 0} premium override${(premiumLabels?.length ?? 0) === 1 ? "" : "s"} found.`}
        </div>
        <button
          onClick={() => void runScan()}
          disabled={scanning || busy}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white/70 hover:border-cyan/30 hover:text-cyan disabled:opacity-40"
        >
          {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Refresh
        </button>
      </div>

      {scanError && (
        <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/[0.04] p-2 text-[11px] text-red-300">
          Scan error: {scanError}
        </div>
      )}

      {/* ── Section 1: Active listings ──────────────────────── */}
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        Active listings
      </div>
      {activeListings && activeListings.length === 0 && (
        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-2 text-[11px] text-emerald-200/80">
          <Check className="mr-1 inline h-3 w-3" /> No active listings on any TLD.
        </div>
      )}
      {activeListings && activeListings.length > 0 && (
        <ul className="mb-4 divide-y divide-white/5 rounded-xl border border-white/5">
          {activeListings.map((l) => {
            const mine = isMyListing(l.seller);
            const expiryStr =
              l.expiry > 10n ** 18n
                ? "forever"
                : new Date(Number(l.expiry) * 1000).toISOString().slice(0, 10);
            const isPendingThis = pending?.kind === "cancel" && pending.tld === l.tld && pending.tokenId === l.tokenId;
            return (
              <li key={`${l.tld}-${l.tokenId}`} className="flex items-center justify-between gap-3 px-3 py-2 text-[11px]">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-white/80">
                    {l.label}<span className="text-white/40">{tldSuffix(l.tld)}</span>
                    <span className="ml-2 text-white/30">#{l.tokenId.toString()}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-2 text-white/50">
                    <span><span className="text-white/30">price:</span> {Number(formatEther(l.price)).toLocaleString()} iKAS</span>
                    <span>{l.featured ? <span className="text-plum">★ featured</span> : "regular"}</span>
                    <span><span className="text-white/30">expires:</span> {expiryStr}</span>
                    <span><span className="text-white/30">seller:</span> {shortAddr(l.seller)}{mine ? " (you)" : ""}</span>
                  </div>
                </div>
                <button
                  onClick={() => onCancelListing(l.tld, l.tokenId)}
                  disabled={!mine || busy}
                  title={mine ? "cancelListing(tokenId)" : "Only the seller can cancel — connect that wallet first."}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-200 transition hover:bg-red-500/20 disabled:opacity-30"
                >
                  {isPendingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  Cancel
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Section 2: Premium overrides ───────────────────── */}
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        Premium overrides set
      </div>
      {premiumLabels && premiumLabels.length === 0 && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04] px-3 py-2 text-[11px] text-emerald-200/80">
          <Check className="mr-1 inline h-3 w-3" /> No premium overrides set on any TLD.
        </div>
      )}
      {premiumLabels && premiumLabels.length > 0 && (
        <ul className="divide-y divide-white/5 rounded-xl border border-white/5">
          {premiumLabels.map((p) => (
            <li key={p.label} className="px-3 py-2 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-white/80">{p.label}</span>
                <span className="text-[10px] text-white/40">premium override active</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {(LIVE_TLDS as readonly Tld[]).map((t) => {
                  const v = p.perTld[t];
                  const isPendingThis = pending?.kind === "clearPremium" && pending.tld === t && pending.label === p.label;
                  if (v === 0n) {
                    return (
                      <span key={t} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] text-white/35">
                        {tldSuffix(t)}: 0
                      </span>
                    );
                  }
                  return (
                    <button
                      key={t}
                      onClick={() => onClearPremiumOnTld(t, p.label)}
                      disabled={busy}
                      title={`Clear ${p.label}${tldSuffix(t)} premium → setPremiumPrice(label, 0)`}
                      className="inline-flex items-center gap-1 rounded-full border border-plum/30 bg-plum/10 px-2 py-0.5 text-[10px] font-mono text-plum hover:bg-plum/20 disabled:opacity-40"
                    >
                      {isPendingThis ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Trash2 className="h-2.5 w-2.5" />}
                      {tldSuffix(t)}: {Number(formatEther(v)).toLocaleString()}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}

      <TxError message={error?.message} onReset={reset} />
      <p className="mt-3 text-[10px] text-white/35">
        Cancellation is gated by seller-ownership (only your wallet can cancel its own listings). Premium clears use <span className="font-mono">setPremiumPrice(label, 0)</span> and require admin (Safe) ownership. Re-scans after every successful action.
      </p>
    </Card>
  );
}

/* ── Ownership ──────────────────────────────────────────── */
function OwnershipCard({ tld }: { tld: Tld }) {
  const REGISTRY_ADDRESS = REGISTRY_ADDRESSES[tld];
  const REGISTRY_LIVE = isTldLive(tld);
  const [to, setTo] = useState("");
  const [confirming, setConfirming] = useState(false);

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;
  const valid = /^0x[a-fA-F0-9]{40}$/.test(to.trim());

  useEffect(() => {
    if (isConfirmed) {
      setTo("");
      setConfirming(false);
      const t = setTimeout(reset, 1500);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, reset]);

  const onTransfer = () => {
    if (!valid) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "transferOwnership",
      args: [to as `0x${string}`],
    });
  };

  return (
    <Card
      icon={<Settings2 className="h-5 w-5 text-amber-300" />}
      title="Ownership"
      subtitle="transferOwnership(newOwner) — irreversible"
    >
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-amber-200">
        <strong className="text-amber-100">Danger zone.</strong> Transferring the registry hands the new owner full
        admin rights: mint, reserve, price, withdraw. Double-check the address before signing.
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={to}
          onChange={(e) => { setTo(e.target.value); setConfirming(false); }}
          placeholder="0x… new owner"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
          spellCheck={false}
        />
        <button
          onClick={onTransfer}
          disabled={!valid || !REGISTRY_LIVE || busy}
          className={`inline-flex items-center gap-1 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-40 ${
            confirming
              ? "border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30"
              : "border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
          }`}
        >
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Transferring…</>
            : confirming ? <>Confirm transfer →</>
            : <>Transfer</>}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <TxError message={error?.message} onReset={reset} />
        <TxLink hash={hash} />
      </div>

      <p className="mt-6 border-t border-white/5 pt-4 text-xs text-white/40">
        Once deployed, the recommended flow is to hand ownership to a
        Safe multisig — update{" "}
        <code className="rounded bg-black/40 px-1 py-0.5 font-mono text-[10px]">NEXT_PUBLIC_ADMIN_WALLET</code>{" "}
        to match and redeploy the dapp.
      </p>
    </Card>
  );
}

/* ─────────────────────────── Subname Extension ──────────────────
 * Tiny admin card for the optional Subname Extension contract. Renders as
 * a "not deployed" stub when SUBNAME_EXTENSION_ADDRESS is the zero address
 * (env var not set). Once deployed + env-wired, exposes:
 *   - current enabled/disabled state
 *   - on/off toggle (Safe tx)
 *   - total subnames minted
 *   - link to explorer
 */
function SubnameExtensionCard({ tld }: { tld: Tld }) {
  // .igra-only — only the .igra Registry has subname support in v1
  if (tld !== "igra") return null;

  const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
  const isDeployed = SUBNAME_EXTENSION_ADDRESS !== ZERO_ADDR;

  const { data: enabled, refetch: refetchEnabled } = useReadContract({
    address: SUBNAME_EXTENSION_ADDRESS,
    abi: SUBNAME_EXTENSION_ABI,
    functionName: "enabled",
    query: { enabled: isDeployed },
  });
  const { data: total } = useReadContract({
    address: SUBNAME_EXTENSION_ADDRESS,
    abi: SUBNAME_EXTENSION_ABI,
    functionName: "totalSupply",
    query: { enabled: isDeployed },
  });
  const { data: extOwner } = useReadContract({
    address: SUBNAME_EXTENSION_ADDRESS,
    abi: SUBNAME_EXTENSION_ABI,
    functionName: "owner",
    query: { enabled: isDeployed },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;

  useEffect(() => {
    if (isConfirmed) {
      refetchEnabled();
      const t = setTimeout(reset, 1500);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, refetchEnabled, reset]);

  const onToggle = () => {
    writeContract({
      address: SUBNAME_EXTENSION_ADDRESS,
      abi: SUBNAME_EXTENSION_ABI,
      functionName: "setEnabled",
      args: [!enabled],
    });
  };

  return (
    <Card
      icon={<Layers className="h-5 w-5 text-plum" />}
      title="Subname Extension"
      subtitle="optional layer · pay.alice.igra style names · activate ~1 month post-launch"
    >
      {!isDeployed && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/55">
          <div className="font-bold text-white/70">Not deployed yet.</div>
          <p className="mt-1 text-xs">
            Code lives in <span className="font-mono">contracts/src/INSSubnameExtension.sol</span>.
            Deploy via <span className="font-mono">forge script DeploySubnameExtension.s.sol</span>,
            then add <span className="font-mono">NEXT_PUBLIC_INS_SUBNAME_EXTENSION_IGRA</span> to the VPS env file
            and rebuild. Recommended timing: <strong>1 month post-mainnet</strong> after
            zero-issue baseline is established.
          </p>
        </div>
      )}

      {isDeployed && (
        <>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">State</div>
              <div className={`mt-1 text-lg font-black ${enabled ? "text-emerald-300" : "text-white/45"}`}>
                {enabled ? "🟢 Enabled" : "⚪ Disabled"}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="text-[10px] uppercase tracking-wider text-white/40">Subnames minted</div>
              <div className="mt-1 text-lg font-black text-white">
                {total !== undefined ? (total as bigint).toString() : "—"}
              </div>
            </div>
          </div>

          <button
            onClick={onToggle}
            disabled={busy}
            className={`w-full rounded-lg border px-3 py-2 text-sm font-bold transition disabled:opacity-40 ${
              enabled
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            {busy ? <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> : null}
            {enabled ? "Disable subname minting" : "Enable subname minting"}
          </button>
          <p className="mt-2 text-[10px] text-white/40">
            When enabled, owners of .igra names can mint free subnames via /domains.
            Reversible — disable any time. Safe tx.
          </p>

          <div className="mt-4 space-y-1 text-[11px] text-white/45">
            <div className="flex items-center justify-between">
              <span>Contract:</span>
              <a
                href={`${IGRA_EXPLORER}/address/${SUBNAME_EXTENSION_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-cyan hover:underline"
              >
                {shortAddr(SUBNAME_EXTENSION_ADDRESS)}
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span>Owner:</span>
              <span className="font-mono">{extOwner ? shortAddr(extOwner as string) : "—"}</span>
            </div>
          </div>

          <TxError message={error?.message} onReset={reset} />
        </>
      )}
    </Card>
  );
}

/* ─────────────────────────── Field ─────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      {children}
    </label>
  );
}

/* ─────────────────────────── Multi-TLD helpers ─────────────────── */

/** Toggle that controls whether subsequent reserve / unreserve / batch
 *  actions on this card fan out to every live TLD. State persists across
 *  sessions via localStorage. */
function ApplyAllTldsToggle({
  on, onToggle, currentTld, liveTldCount, disabled,
}: {
  on: boolean;
  onToggle: (v: boolean) => void;
  currentTld: Tld;
  liveTldCount: number;
  disabled: boolean;
}) {
  if (liveTldCount < 2) return null; // nothing to fan out to
  return (
    <div className={`mb-3 flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
      on ? "border-cyan/40 bg-cyan/[0.05]" : "border-white/10 bg-white/[0.02]"
    }`}>
      <div className="flex-1">
        <div className="text-xs font-bold text-white">
          Apply to all {liveTldCount} TLDs
          {on && <span className="ml-2 rounded-full border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-cyan">on</span>}
        </div>
        <div className="mt-0.5 text-[11px] text-white/55">
          {on
            ? `Each reserve / unreserve / batch sends ${liveTldCount} sequential txs (one per TLD).`
            : `Currently writes to ${tldSuffix(currentTld)} only. Toggle on to fan out to .ins / .igra / .ikas in one click.`}
        </div>
      </div>
      <button
        onClick={() => onToggle(!on)}
        disabled={disabled}
        aria-pressed={on}
        className={`relative inline-flex h-6 w-11 flex-none items-center rounded-full transition disabled:opacity-40 ${
          on ? "bg-cyan" : "bg-white/15"
        }`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
          on ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}

/** Inline row that exposes the one-shot Sync flow: read this TLD's
 *  reserved labels, diff against the other live TLDs, and offer to
 *  setReservedBatch the missing labels onto each. */
type SyncStatus =
  | { kind: "idle" }
  | { kind: "computing" }
  | { kind: "ready"; missingByTld?: Partial<Record<Tld, string[]>> }
  | { kind: "running"; missingByTld?: Partial<Record<Tld, string[]>> }
  | { kind: "done"; missingByTld?: Partial<Record<Tld, string[]>>; error?: string; message?: string };

function SyncReservationsRow({
  currentTld, liveTldCount, status, onSync, onStartSync, onDismiss, disabled,
}: {
  currentTld: Tld;
  liveTldCount: number;
  status: SyncStatus;
  onSync: () => void;
  onStartSync: () => void;
  onDismiss: () => void;
  disabled: boolean;
}) {
  if (liveTldCount < 2) return null;
  return (
    <div className="mb-3 rounded-xl border border-plum/30 bg-plum/[0.04] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-[11px] text-white/65">
          <span className="font-bold text-plum">Sync</span> — copy {tldSuffix(currentTld)}&rsquo;s on-chain reserved list onto the other {liveTldCount - 1} TLD{liveTldCount - 1 > 1 ? "s" : ""}.
        </div>
        {status.kind === "idle" && (
          <button
            onClick={onSync}
            disabled={disabled}
            className="rounded-lg border border-plum/40 bg-plum/10 px-3 py-1 text-xs font-bold text-plum transition hover:bg-plum/20 disabled:opacity-40"
          >
            Compute diff
          </button>
        )}
        {status.kind === "computing" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-plum">
            <Loader2 className="h-3 w-3 animate-spin" /> Reading other TLDs…
          </span>
        )}
        {status.kind === "ready" && status.missingByTld && (
          <button
            onClick={onStartSync}
            disabled={disabled}
            className="rounded-lg border border-plum/40 bg-plum/10 px-3 py-1 text-xs font-bold text-plum transition hover:bg-plum/20 disabled:opacity-40"
          >
            Apply diff
          </button>
        )}
        {status.kind === "running" && (
          <span className="inline-flex items-center gap-1.5 text-xs text-plum">
            <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
          </span>
        )}
        {status.kind === "done" && (
          <button
            onClick={onDismiss}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/60 hover:text-white"
          >
            Dismiss
          </button>
        )}
      </div>
      {status.kind === "ready" && status.missingByTld && (
        <div className="mt-2 space-y-1 text-[11px] text-white/55">
          {(Object.keys(status.missingByTld) as Tld[]).map((t) => (
            <div key={t}>
              <span className="font-mono text-white/70">{tldSuffix(t)}</span> ← {status.missingByTld![t]?.length ?? 0} label{(status.missingByTld![t]?.length ?? 0) === 1 ? "" : "s"} to add
            </div>
          ))}
        </div>
      )}
      {status.kind === "done" && status.message && (
        <div className="mt-2 text-[11px] text-emerald-300">{status.message}</div>
      )}
      {status.kind === "done" && status.error && (
        <div className="mt-2 text-[11px] text-amber-300">{status.error}</div>
      )}
    </div>
  );
}

/** Visual progress strip while a multi-TLD batch is in flight.
 *  Per-TLD chips: pending / signing / mined / failed. */
function MultiTldBatchProgress({
  op, statuses, txHashes, activeIdx, error, onRetry, onCancel,
}: {
  op: BatchOp;
  statuses: Record<Tld, BatchTldStatus>;
  /** hash of each TLD's confirmed tx (set as each step mines) */
  txHashes: Partial<Record<Tld, `0x${string}`>>;
  activeIdx: number;
  error: { message: string } | null;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const failed = op.tlds.find((t) => statuses[t] === "failed");
  const allMined = op.tlds.every((t) => statuses[t] === "mined");
  return (
    <div className={`mb-3 rounded-xl border p-3 transition ${
      failed   ? "border-red-500/40 bg-red-500/[0.04]" :
      allMined ? "border-emerald-500/40 bg-emerald-500/[0.05]" :
                 "border-cyan/40 bg-cyan/[0.04]"
    }`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white">
            {allMined ? <><Check className="mr-1 inline h-3 w-3 text-emerald-300" />{op.label} — done</> : op.label}
          </div>
          {!allMined && !failed && (
            <div className="mt-0.5 text-[11px] text-white/55">
              Step {Math.min(activeIdx + 1, op.tlds.length)} of {op.tlds.length}
            </div>
          )}
          {allMined && (
            <div className="mt-0.5 text-[11px] text-emerald-200/80">
              All {op.tlds.length} TLDs confirmed on-chain.
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {op.tlds.map((t) => {
            const s = statuses[t];
            const cls =
              s === "mined"   ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" :
              s === "signing" ? "border-cyan/40 bg-cyan/15 text-cyan" :
              s === "failed"  ? "border-red-500/40 bg-red-500/10 text-red-300" :
                                "border-white/15 bg-white/[0.04] text-white/55";
            const hash = txHashes[t];
            const inner = (
              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
                {s === "signing" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                {s === "mined"   && <Check className="h-2.5 w-2.5" />}
                {tldSuffix(t)}
              </span>
            );
            return s === "mined" && hash ? (
              <a
                key={t}
                href={`${IGRA_EXPLORER}/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
                title={`View ${tldSuffix(t)} tx on Igra explorer`}
                className="transition hover:opacity-90"
              >
                {inner}
              </a>
            ) : (
              <span key={t}>{inner}</span>
            );
          })}
        </div>
      </div>
      {failed && (
        <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-red-300">
          <span className="truncate" title={error?.message}>
            Failed on {tldSuffix(failed)} — {error?.message?.split("\n")[0] ?? "unknown error"}
          </span>
          <span className="flex flex-none gap-1">
            <button
              onClick={onRetry}
              className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-200 hover:bg-red-500/20"
            >
              Retry
            </button>
            <button
              onClick={onCancel}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/60 hover:text-white"
            >
              Cancel
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
