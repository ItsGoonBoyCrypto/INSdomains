"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { isAddress } from "viem";
import {
  Copy, Check, Wallet, ExternalLink, Plus, Star,
  Settings2, Send, GitBranch, Image as ImageIcon, Save, Loader2,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DEMO_OWNED } from "@/lib/mock-registry";
import { shortAddr } from "@/lib/names";
import { explorerAddr } from "@/lib/igra-chain";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "@/lib/contracts";

const REGISTRY_LIVE = REGISTRY_ADDRESS !== "0x0000000000000000000000000000000000000000";

type OwnedName = {
  tokenId: bigint;
  label: string;
  target: `0x${string}`;
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
        Your .ins names are NFTs held in your wallet. Connect to manage resolver
        records, set a primary name, and mint subnames.
      </p>
      <div className="mt-8 flex justify-center">
        <ConnectButton />
      </div>
    </div>
  );
}

function Dashboard({ address }: { address: `0x${string}` }) {
  const owned = useOwnedNames(address);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">My domains</h1>
          <p className="mt-2 text-sm text-white/60">
            {REGISTRY_LIVE
              ? `${owned.list.length} .ins name${owned.list.length === 1 ? "" : "s"} owned`
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

      {owned.loading && REGISTRY_LIVE && (
        <div className="mt-10 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading names from Igra…
        </div>
      )}

      {!owned.loading && REGISTRY_LIVE && owned.list.length === 0 && (
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center">
          <p className="text-white/70">You don&apos;t own any .ins names yet.</p>
          <Link href="/app" className="btn-primary mt-5 inline-flex">
            <Plus className="mr-1 inline h-4 w-4" /> Register your first
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {REGISTRY_LIVE
          ? owned.list.map((d) => (
              <LiveDomainCard key={d.tokenId.toString()} name={d} owner={address} />
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
  const { data: supply } = useReadContract({
    address: REGISTRY_ADDRESS,
    abi: REGISTRY_ABI,
    functionName: "totalSupply",
    query: { enabled: REGISTRY_LIVE },
  });

  const total = Number((supply as bigint | undefined) ?? 0n);
  const ids = useMemo(() => {
    const arr: bigint[] = [];
    for (let i = 1; i <= total; i++) arr.push(BigInt(i));
    return arr;
  }, [total]);

  const { data: batched, isLoading } = useReadContracts({
    contracts: ids.flatMap((id) => [
      { address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: "ownerOf", args: [id] },
      { address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: "labelOf", args: [id] },
      { address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: "targetOf", args: [id] },
    ]),
    query: { enabled: REGISTRY_LIVE && ids.length > 0 },
  });

  const list: OwnedName[] = [];
  if (batched) {
    for (let i = 0; i < ids.length; i++) {
      const o = batched[i * 3]?.result as `0x${string}` | undefined;
      const label = batched[i * 3 + 1]?.result as string | undefined;
      const target = batched[i * 3 + 2]?.result as `0x${string}` | undefined;
      if (o && label && target && o.toLowerCase() === address.toLowerCase()) {
        list.push({ tokenId: ids[i], label, target });
      }
    }
  }

  return { list, loading: isLoading };
}

function LiveDomainCard({ name, owner }: { name: OwnedName; owner: `0x${string}` }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [target, setTarget] = useState<string>(name.target);

  const copy = () => {
    navigator.clipboard.writeText(name.target);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const { writeContract, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const onSave = () => {
    if (!isAddress(target)) return;
    writeContract({
      address: REGISTRY_ADDRESS,
      abi: REGISTRY_ABI,
      functionName: "setTarget",
      args: [name.label, target as `0x${string}`],
    });
  };

  const busy = isPending || isConfirming;
  const targetIsValid = isAddress(target);
  const targetChanged = target.toLowerCase() !== name.target.toLowerCase();

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-cyan/30">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan/10 blur-3xl opacity-0 transition group-hover:opacity-100" />

      <div className="relative flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ins-gradient text-xl font-black text-black">
          {name.label[0]?.toUpperCase() ?? "?"}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
          Owned
        </span>
      </div>

      <h3 className="relative mt-5 text-2xl font-bold">
        <span className="ins-gradient-text">{name.label}</span>
        <span className="text-white/30">.ins</span>
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

      <div className="relative mt-5 flex flex-wrap gap-2">
        <IconBtn title="Edit target" icon={<Settings2 className="h-3.5 w-3.5" />} onClick={() => setExpanded(!expanded)} />
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
