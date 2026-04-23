"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Check, X, Sparkles, Loader2, ArrowRight, Lock, Gem, ExternalLink } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { cleanLabel, isValidLabel } from "@/lib/names";
import { mockAvailable, TAKEN_NAMES, RESERVED_NAMES } from "@/lib/mock-registry";
import { rarityFor, tierLabel, formatPrice, type Rarity } from "@/lib/pricing";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "@/lib/contracts";
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

  // Live on-chain availability (active when registry is deployed); mocks in dev.
  const { data: chainAvailable } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "available",
    args: valid ? [label] : undefined,
    query: { enabled: REGISTRY_LIVE && valid },
  });
  const available = valid
    ? (REGISTRY_LIVE ? (chainAvailable as boolean | undefined ?? null) : mockAvailable(label))
    : null;
  const rarity = valid ? rarityFor(label, RESERVED_NAMES) : null;

  const suggestions = useMemo(() => genSuggestions(label), [label]);

  return (
    <main className="mx-auto max-w-4xl px-6 pt-16 pb-24">
      <h1 className="text-center text-4xl font-black tracking-tight sm:text-5xl">
        Search the <span className="ins-gradient-text">.ins</span> registry
      </h1>
      <p className="mt-3 text-center text-white/60">
        Mint once, own forever. Tiered pricing in iKAS — shorter names are rarer.
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
          {valid && (
            <span className="text-sm text-white/50 mr-2 hidden sm:inline">.ins</span>
          )}
        </div>
      </div>

      {!label && <EmptyHint />}

      {label && !valid && <InvalidHint label={label} />}

      {valid && rarity && (
        <>
          <div className="mt-10">
            <NameResult label={label} available={available} owner={address} rarity={rarity} />
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
      <p className="text-white/60">
        Type a name to check availability. Names are lowercase letters, digits, and hyphens — 3–32 chars.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {["vitalik", "satoshi", "grok", "kaspa", "igra", "alice"].map((s) => (
          <Link
            key={s}
            href={`/app?q=${s}`}
            className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs text-white/70 transition hover:border-cyan/30 hover:text-white"
          >
            {s}.ins →
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-2 text-left text-xs text-white/50 sm:grid-cols-5">
        <TierSample color="plum"    label="2-char"  price="5,000 iKAS" tag="ultra-rare" />
        <TierSample color="amber"   label="3-char"  price="500 iKAS"   tag="rare" />
        <TierSample color="cyan"    label="4-char"  price="50 iKAS"    tag="uncommon" />
        <TierSample color="emerald" label="5–32"    price="10 iKAS"    tag="standard" />
        <TierSample color="red"     label="1-char"  price="reserved"   tag="DAO auction" />
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
      <strong>"{label}"</strong> isn't a valid .ins name — use 3–32 lowercase letters, digits, or hyphens (no leading / trailing hyphen).
    </div>
  );
}

function NameResult({
  label, available, owner, rarity,
}: { label: string; available: boolean | null; owner?: `0x${string}`; rarity: Rarity }) {
  if (available === null) return null;

  const isReserved = rarity.kind === "reserved";
  const price =
    rarity.kind === "length" ? rarity.price :
    rarity.kind === "premium" ? rarity.price : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-8 sm:p-10",
        isReserved
          ? "border-red-500/30 bg-red-500/[0.05]"
          : available
          ? "border-cyan/30 bg-gradient-to-r from-cyan/[0.08] to-plum/[0.08]"
          : "border-white/10 bg-white/[0.03]"
      )}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ins-gradient text-2xl font-black text-black">
            {label[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="text-3xl font-bold">
              <span className="ins-gradient-text">{label}</span>
              <span className="text-white/30">.ins</span>
            </div>
            <div className="mt-1 text-sm text-white/60">
              {isReserved ? (
                <span className="inline-flex items-center gap-1.5 text-red-300">
                  <Lock className="h-3.5 w-3.5" /> Reserved — not available for public mint
                </span>
              ) : available ? (
                <span className="inline-flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  Available · forever
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-red-300">
                  <X className="h-3.5 w-3.5" /> Taken — owned on-chain
                </span>
              )}
            </div>
            <div className="mt-2">
              <RarityBadge rarity={rarity} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isReserved ? (
            <div className="text-right">
              <div className="text-sm text-red-300">Not for sale</div>
              <div className="text-xs text-white/40">Contact team for ecosystem allocation</div>
            </div>
          ) : available && price !== null ? (
            <>
              <div className="text-right">
                <div className="text-2xl font-black text-white">{formatPrice(price)}</div>
                <div className="text-xs text-white/40">one-time, forever</div>
              </div>
              <RegisterButton label={label} owner={owner} />
            </>
          ) : (
            <Link href={`/marketplace?name=${label}`} className="btn-ghost">
              View on marketplace <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
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
  label, owner,
}: { label: string; owner?: `0x${string}` }) {
  // Pull the exact on-chain price so we send the right msg.value (falls back to
  // the tier price when the registry isn't deployed).
  const { data: onchainPrice } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "priceFor",
    args: [label],
    query: { enabled: REGISTRY_LIVE && !!label },
  });

  const { writeContract, data: hash, error: writeError, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Stub mode status — used when the registry is not deployed.
  const [stubStatus, setStubStatus] = useState<"idle" | "confirm" | "minting" | "done">("idle");

  if (!owner) {
    return (
      <div className="flex flex-col items-end gap-2">
        <span className="text-xs text-white/40">Connect wallet to register</span>
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button onClick={openConnectModal} className="btn-primary">
              Connect & Register
            </button>
          )}
        </ConnectButton.Custom>
      </div>
    );
  }

  // Stub flow while Registry.sol isn't deployed yet.
  if (!REGISTRY_LIVE) {
    const onStubMint = async () => {
      setStubStatus("confirm");
      await new Promise((r) => setTimeout(r, 700));
      setStubStatus("minting");
      await new Promise((r) => setTimeout(r, 1400));
      setStubStatus("done");
    };
    if (stubStatus === "done") {
      return (
        <Link href="/domains" className="btn-primary bg-emerald-400">
          <Check className="mr-1 inline h-4 w-4" />
          Minted (demo)! View →
        </Link>
      );
    }
    return (
      <button onClick={onStubMint} disabled={stubStatus !== "idle"} className="btn-primary">
        {stubStatus === "confirm" ? (
          <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Confirm in wallet…</>
        ) : stubStatus === "minting" ? (
          <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Inscribing…</>
        ) : (
          <>Register forever →</>
        )}
      </button>
    );
  }

  // On-chain flow.
  if (isConfirmed && hash) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Link href="/domains" className="btn-primary bg-emerald-400">
          <Check className="mr-1 inline h-4 w-4" />
          Minted! View →
        </Link>
        <a
          href={`${IGRA_EXPLORER}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-white/50 hover:text-cyan"
        >
          View tx <ExternalLink className="inline h-3 w-3" />
        </a>
      </div>
    );
  }

  const onMint = () => {
    if (!onchainPrice) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "register",
      args: [label, owner],
      value: onchainPrice as bigint,
    });
  };

  const label2 = isPending
    ? <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Confirm in wallet…</>
    : isConfirming
    ? <><Loader2 className="mr-1 inline h-4 w-4 animate-spin" />Inscribing…</>
    : <>Register forever →</>;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={onMint}
        disabled={isPending || isConfirming || !onchainPrice}
        className="btn-primary"
      >
        {label2}
      </button>
      {writeError && (
        <button
          onClick={() => reset()}
          className="max-w-[240px] truncate text-right text-[11px] text-red-300 hover:text-red-200"
          title={writeError.message}
        >
          {writeError.message.split("\n")[0] || "Transaction failed"} — retry
        </button>
      )}
    </div>
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
          {label}<span className="text-white/40">.ins</span>
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
    `${label}x`, `${label}1`, `${label}-dao`,
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
              <span className="text-white/40">.ins</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
