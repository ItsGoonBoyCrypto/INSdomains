"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ShieldCheck, Lock, Gift, Tag, Gem, ArrowRight, Loader2,
  Check, Plus, Trash2, Wallet, AlertTriangle, Settings2, ExternalLink,
  ClipboardList, X,
} from "lucide-react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther, parseEther } from "viem";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ADMIN_WALLET, isAdmin } from "@/lib/admin";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "@/lib/contracts";
import { cleanLabel, isValidLabel, shortAddr } from "@/lib/names";
import { RESERVED_NAMES } from "@/lib/mock-registry";
import { formatPrice, TIER_RESERVED } from "@/lib/pricing";

const REGISTRY_LIVE =
  REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";
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

        {!REGISTRY_LIVE && <RegistryNotLiveBanner />}

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
  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-2">
      <AdminMintCard />
      <ReservedNamesCard />
      <TierPricingCard />
      <PremiumOverridesCard />
      <TreasuryCard />
      <OwnershipCard />
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
function AdminMintCard() {
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const clean = cleanLabel(label);
  const valid = isValidLabel(clean);
  const targetValid = /^0x[a-fA-F0-9]{40}$/.test(target.trim());
  const busy = isPending || isConfirming;

  const onMint = () => {
    if (!valid || !targetValid) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "adminMint",
      args: [clean, target as `0x${string}`],
    });
  };

  useEffect(() => {
    if (isConfirmed) {
      const t = setTimeout(() => { setLabel(""); setTarget(""); reset(); }, 2500);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, reset]);

  return (
    <Card
      icon={<Gift className="h-5 w-5 text-plum" />}
      title="Gift a name"
      subtitle="adminMint — bypasses payment + reservation"
    >
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
            <span className="text-sm text-white/40">.ins</span>
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
          disabled={!valid || !targetValid || !REGISTRY_LIVE || busy || isConfirmed}
          className="btn-primary w-full justify-center"
        >
          {isPending ? (
            <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Confirm in wallet…</>
          ) : isConfirming ? (
            <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Minting…</>
          ) : isConfirmed ? (
            <><Check className="mr-1 inline h-4 w-4" />Gifted!</>
          ) : (
            <>Mint &amp; send →</>
          )}
        </button>

        <div className="flex items-center justify-between text-xs text-white/40">
          {valid && clean ? (
            <span>
              Will mint <span className="font-mono text-white/70">{clean}.ins</span>
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

function ReservedNamesCard() {
  // Candidate pool: seed + every label this client has ever reserved or imported (localStorage).
  // On-chain `reserved(label)` is the source of truth per row.
  const [candidates, setCandidates] = useState<string[]>(() =>
    Array.from(new Set([...Array.from(RESERVED_NAMES), ...loadCandidates()])).sort(),
  );
  useEffect(() => {
    saveCandidates(candidates);
  }, [candidates]);

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
      setNewLabel("");
      setPendingAction(null);
      const t = setTimeout(reset, 1200);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, pendingAction, reset, refetchReserved]);

  const onAdd = () => {
    if (!valid) return;
    setPendingAction({ kind: "add", label: clean });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setReserved",
      args: [clean, true],
    });
  };

  const onRemove = (label: string) => {
    setPendingAction({ kind: "remove", label });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setReserved",
      args: [label, false],
    });
  };

  const onUntrack = (label: string) => {
    // Remove from local candidate pool only — does NOT unreserve on-chain.
    setCandidates((prev) => prev.filter((x) => x !== label));
  };

  const onBatchSeed = () => {
    const toAdd = Array.from(RESERVED_NAMES).filter((n) => !reservedSet.has(n));
    if (toAdd.length === 0) return;
    setCandidates((prev) => Array.from(new Set([...prev, ...toAdd])).sort());
    setPendingAction({ kind: "add", label: "(batch)" });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setReservedBatch",
      args: [toAdd, true],
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

  const subtitle = isLoadingChain && onChainCount === 0
    ? "reading on-chain state…"
    : `${onChainCount} on-chain / ${candidates.length} tracked`;

  return (
    <Card
      icon={<Lock className="h-5 w-5 text-red-300" />}
      title="Reserved names"
      subtitle={subtitle}
    >
      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="add a name…"
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/30 focus:outline-none focus:border-red-500/40"
          spellCheck={false}
        />
        <button
          onClick={onAdd}
          disabled={!valid || !REGISTRY_LIVE || busy}
          className="inline-flex items-center gap-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
        >
          {busy && pendingAction?.kind === "add" && pendingAction.label === clean
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Plus className="h-4 w-4" />}
          Reserve
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onBatchSeed}
          disabled={!REGISTRY_LIVE || busy}
          className="text-[11px] text-white/50 underline decoration-dotted hover:text-cyan disabled:opacity-40"
        >
          Batch-reserve full ecosystem seed list ({Array.from(RESERVED_NAMES).length})
        </button>
        <TxLink hash={hash} />
      </div>

      <TxError message={error?.message} onReset={reset} />

      <BulkReserveSection
        currentReserved={Array.from(reservedSet)}
        disabled={!REGISTRY_LIVE || busy}
        onBatchDone={(labels) => {
          setCandidates((prev) =>
            Array.from(new Set([...prev, ...labels])).sort(),
          );
          refetchReserved();
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
                    disabled={!REGISTRY_LIVE || busy}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-white/60 transition hover:border-red-500/30 hover:text-red-300 disabled:opacity-40"
                    title="Call setReserved(label, false) on-chain"
                  >
                    {busy && pendingAction?.kind === "remove" && pendingAction.label === label
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Trash2 className="h-3 w-3" />}
                    Unreserve
                  </button>
                )}
                {!isOnChain && (
                  <button
                    onClick={() => onUntrack(label)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/5 bg-white/[0.02] px-2 py-0.5 text-[10px] text-white/40 transition hover:border-white/20 hover:text-white/70"
                    title="Remove from local tracking list (does not touch chain)"
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
  currentReserved,
  disabled,
  onBatchDone,
}: {
  currentReserved: string[];
  disabled: boolean;
  onBatchDone: (labels: string[]) => void;
}) {
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
function TierPricingCard() {
  const tiers = [
    { bucket: 1, label: "1-char", hint: "reserved (auction)" },
    { bucket: 2, label: "2-char", hint: "ultra-rare" },
    { bucket: 3, label: "3-char", hint: "rare" },
    { bucket: 4, label: "4-char", hint: "uncommon" },
    { bucket: 5, label: "5–32", hint: "standard" },
  ] as const;

  // Read all 5 buckets in one batch (reads are always enabled to reflect on-chain state).
  const { data: prices, refetch } = useReadContracts({
    contracts: tiers.map((t) => ({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "lengthPrice",
      args: [t.bucket],
    })),
    query: { enabled: REGISTRY_LIVE },
  });

  return (
    <Card
      icon={<Tag className="h-5 w-5 text-cyan" />}
      title="Length tier pricing"
      subtitle="setLengthPrice(bucket, price) · price in iKAS"
    >
      <div className="space-y-2">
        {tiers.map((t, i) => {
          const raw = prices?.[i]?.result as bigint | undefined;
          const current: number | "RESERVED" | null = !REGISTRY_LIVE
            ? ({ 1: "RESERVED", 2: 5000, 3: 500, 4: 50, 5: 10 } as const)[t.bucket as 1 | 2 | 3 | 4 | 5]
            : raw === undefined
            ? null
            : raw === BigInt(TIER_RESERVED) || raw > 10n ** 30n
            ? "RESERVED"
            : Number(formatEther(raw));
          return (
            <TierRow
              key={t.bucket}
              bucket={t.bucket}
              label={t.label}
              hint={t.hint}
              current={current}
              onSaved={() => refetch()}
            />
          );
        })}
      </div>
    </Card>
  );
}

function TierRow({
  bucket, label, hint, current, onSaved,
}: {
  bucket: number;
  label: string;
  hint: string;
  current: number | "RESERVED" | null;
  onSaved: () => void;
}) {
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
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setLengthPrice",
      args: [bucket, priceBig],
    });
  };

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
        disabled={!validInput || !dirty || !REGISTRY_LIVE || busy || isConfirmed}
        className="rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-bold text-cyan transition hover:bg-cyan/20 disabled:opacity-40"
        title={error?.message}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : isConfirmed ? "Saved" : "Save"}
      </button>
    </div>
  );
}

/* ── Premium overrides ──────────────────────────────────── */
function PremiumOverridesCard() {
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

  useEffect(() => {
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
  }, [isConfirmed, pending, reset]);

  const onSet = () => {
    if (!valid) return;
    setPending({ kind: "set", label: clean, price: parsed });
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setPremiumPrice",
      args: [clean, parseEther(String(parsed))],
    });
  };

  const onClear = (l: string) => {
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
          disabled={!valid || !REGISTRY_LIVE || busy}
          className="rounded-xl border border-plum/30 bg-plum/10 px-4 text-sm font-semibold text-plum transition hover:bg-plum/20 disabled:opacity-40"
        >
          {busy && pending?.kind === "set" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set"}
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
              {x.label}<span className="text-white/30">.ins</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-plum">{formatPrice(x.price)}</span>
              <button
                onClick={() => onClear(x.label)}
                disabled={!REGISTRY_LIVE || busy}
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
function TreasuryCard() {
  const { data: balance, refetch } = useBalance({
    address: REGISTRY_ADDRESS,
    query: { enabled: REGISTRY_LIVE },
  });
  const [to, setTo] = useState("");
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || isConfirming;
  const valid = /^0x[a-fA-F0-9]{40}$/.test(to.trim());

  useEffect(() => {
    if (isConfirmed) {
      refetch();
      setTo("");
      const t = setTimeout(reset, 1200);
      return () => clearTimeout(t);
    }
  }, [isConfirmed, refetch, reset]);

  const onWithdraw = () => {
    if (!valid) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "withdraw",
      args: [to as `0x${string}`],
    });
  };

  const displayBalance = REGISTRY_LIVE && balance ? `${Number(balance.formatted).toFixed(4)} iKAS` : "0 iKAS";

  return (
    <Card
      icon={<Wallet className="h-5 w-5 text-cyan" />}
      title="Treasury"
      subtitle="withdraw contract balance to a destination"
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
    </Card>
  );
}

/* ── Ownership ──────────────────────────────────────────── */
function OwnershipCard() {
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

/* ─────────────────────────── Field ─────────────────────────── */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      {children}
    </label>
  );
}
