import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Sparkles, ArrowRight, Tag, Star, Lock, Copy, ExternalLink,
  ShieldCheck, Coins, Globe, AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { resolveName, type ResolveResult } from "@/lib/server-resolver";
import { TLDS, tldSuffix, REGISTRY_ADDRESSES, type Tld } from "@/lib/contracts";
import { isValidLabel } from "@/lib/names";
import { rarityFor, formatPrice, tierLabel } from "@/lib/pricing";

// Revalidate per-name pages every 60s — fresh enough that a mint shows up
// quickly, slow enough that we cache aggressively at the edge.
export const revalidate = 60;

const EXPLORER = process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";
const TLD_ACCENT: Record<Tld, { bg: string; text: string; border: string; glow: string }> = {
  ins:  { bg: "bg-cyan/10",    text: "text-cyan",    border: "border-cyan/40",    glow: "shadow-cyan/20" },
  igra: { bg: "bg-plum/10",    text: "text-plum",    border: "border-plum/40",    glow: "shadow-plum/20" },
  ikas: { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/40", glow: "shadow-emerald-500/20" },
};

function shortAddr(a: string): string {
  const lower = a.toLowerCase();
  return `${lower.slice(0, 6)}…${lower.slice(-4)}`;
}

function parseRouteName(raw: string): { label: string; tld: Tld | null } {
  const s = decodeURIComponent(raw).trim().toLowerCase();
  for (const tld of TLDS) {
    if (s.endsWith("." + tld)) return { label: s.slice(0, -(tld.length + 1)), tld };
  }
  return { label: s, tld: null };
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const { label, tld } = parseRouteName(name);
  const display = tld ? `${label}${tldSuffix(tld)}` : label;
  return {
    title: `${display} — INS · Igra Name Service`,
    description: `Public profile for ${display} on the Igra Name Service. Permanent on-chain identity, pay once, own forever.`,
    openGraph: {
      title: display,
      description: `${display} on Igra. Pay once, own forever.`,
      type: "profile",
    },
    twitter: { card: "summary_large_image", title: display },
  };
}

export default async function NamePage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const parsed = parseRouteName(name);

  if (!parsed.label || !isValidLabel(parsed.label)) {
    return notFound();
  }

  // Resolve across the requested TLD or fall back to all 3.
  const tldsToTry: Tld[] = parsed.tld ? [parsed.tld] : [...TLDS];
  const allResults: ResolveResult[] = [];
  for (const t of tldsToTry) {
    const r = await resolveName(parsed.label, t);
    allResults.push(r);
  }

  // Pick primary result: first minted one if any, else first valid TLD result.
  const primary = allResults.find((r) => r.exists) ?? allResults[0];
  const display = `${primary.label}${tldSuffix(primary.tld)}`;
  const accent = TLD_ACCENT[primary.tld];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pt-14 pb-24">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
        >
          ← Back to search
        </Link>

        <header className="mt-6 grid gap-10 lg:grid-cols-[420px_1fr] lg:items-start">
          {/* On-chain art preview — built from same SVG style the registry mints */}
          <NameCard label={primary.label} tld={primary.tld} tokenId={primary.tokenId ?? null} accent={accent} />

          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border ${accent.border} ${accent.bg} px-3 py-1 text-xs font-semibold uppercase tracking-wider ${accent.text}`}>
              <Sparkles className="h-3 w-3" /> {tldSuffix(primary.tld)} domain
            </div>

            <h1 className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
              <span className="text-white">{primary.label}</span>
              <span className={accent.text}>{tldSuffix(primary.tld)}</span>
            </h1>

            <p className="mt-3 max-w-prose text-base text-white/65">
              Permanent on-chain identity on Igra. <span className="font-bold text-emerald-300">Zero renewal fee, forever.</span>{" "}
              Owned via Safe-multisig contract — verifiable, censorship-resistant, no central registrar.
            </p>

            <PrimaryStateBlock primary={primary} />

            {/* Sibling availability across other TLDs */}
            <SiblingsGrid label={primary.label} all={allResults} primaryTld={primary.tld} />
          </div>
        </header>

        {/* Education + share section */}
        <section className="mt-14 grid gap-6 sm:grid-cols-3">
          <Stat
            icon={<Lock className="h-4 w-4 text-cyan" />}
            label="Renewal fee"
            value="0 iKAS / forever"
            sub="No expiry. Pay once, own forever."
          />
          <Stat
            icon={<ShieldCheck className="h-4 w-4 text-plum" />}
            label="Owner"
            value="Safe multisig"
            sub="No single key controls the registry."
          />
          <Stat
            icon={<Globe className="h-4 w-4 text-emerald-300" />}
            label="Network"
            value="Igra L2"
            sub="EVM rollup secured by Kaspa BlockDAG."
          />
        </section>

        <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm text-white/70">
            Like this name? Share the link or grab one yourself.
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ShareButtons name={display} />
            <Link
              href={`/app?q=${primary.label}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm font-bold text-cyan transition hover:bg-cyan/20"
            >
              Search <span className="font-mono">{primary.label}</span> across all TLDs <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

/* ── Subcomponents ───────────────────────────────────────────── */

function NameCard({
  label, tld, tokenId, accent,
}: { label: string; tld: Tld; tokenId: bigint | null; accent: typeof TLD_ACCENT[Tld] }) {
  // Render a JSX preview that matches the on-chain SVG style.
  // (Could also <img> the actual tokenURI SVG, but rendering here is faster + caches nicely.)
  const sizeClass = label.length <= 4 ? "text-7xl" : label.length <= 10 ? "text-5xl" : label.length <= 18 ? "text-3xl" : "text-2xl";
  return (
    <div className={`relative aspect-square w-full max-w-[420px] overflow-hidden rounded-3xl border ${accent.border} ${accent.bg} shadow-2xl ${accent.glow}`}>
      <div className="absolute inset-0 bg-orb opacity-60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
        <div className={`text-[10px] font-bold uppercase tracking-[0.32em] text-white/40`}>
          INS · Igra Name Service
        </div>
        <div className={`mt-6 ${sizeClass} font-black leading-none tracking-tight text-white break-all`}>
          {label}
          <span className={`${accent.text}`}>{tldSuffix(tld)}</span>
        </div>
        {tokenId !== null && (
          <div className="mt-6 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-mono text-white/60">
            <Tag className="h-3 w-3" /> #{tokenId.toString()}
          </div>
        )}
      </div>
    </div>
  );
}

function PrimaryStateBlock({ primary }: { primary: ResolveResult }) {
  const accent = TLD_ACCENT[primary.tld];

  if (!primary.exists) {
    // AVAILABLE state
    const r = rarityFor(primary.label, new Set());
    const isReserved = r.kind === "reserved";
    return (
      <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" /> Available {isReserved && "(reserved by ecosystem)"}
        </div>
        <div className="mt-2 text-2xl font-black text-white">
          Mint price: <span className="text-emerald-300">{r.kind === "reserved" ? "—" : formatPrice(r.kind === "premium" ? r.price : r.price)}</span>
        </div>
        <div className="mt-1 text-xs text-white/50">
          {tierLabel(r)} · paid once in iKAS, owned forever, no renewal
        </div>
        <Link
          href={`/app?q=${primary.label}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
        >
          Claim {primary.label}{tldSuffix(primary.tld)} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  // MINTED state — show owner / target / listing
  const targetMatchesOwner = primary.address?.toLowerCase() === primary.owner?.toLowerCase();

  return (
    <div className="mt-6 space-y-3">
      <Row label="Owner" value={primary.owner!} link />
      <Row
        label="Resolves to"
        value={primary.address!}
        link
        subtle={!targetMatchesOwner ? "⚠ different from owner — target may be stale" : undefined}
      />
      {primary.tokenId !== undefined && (
        <Row label="Token ID" value={`#${primary.tokenId.toString()}`} link={false} mono />
      )}
      <div className={`mt-2 inline-flex items-center gap-2 rounded-lg border ${accent.border} ${accent.bg} px-3 py-1.5 text-xs font-bold ${accent.text}`}>
        <Star className="h-3 w-3" /> Live on Igra mainnet
      </div>
    </div>
  );
}

function Row({
  label, value, link, mono, subtle,
}: { label: string; value: string; link?: boolean; mono?: boolean; subtle?: string }) {
  const display = link && /^0x[a-f0-9]{40}$/i.test(value) ? shortAddr(value) : value;
  const href = link ? `${EXPLORER}/address/${value}` : null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono" : "font-mono"} text-sm text-white/85`}>
        {href ? (
          <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-cyan">
            {display}
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        ) : display}
      </div>
      {subtle && <div className="mt-0.5 text-[11px] text-amber-300/80">{subtle}</div>}
    </div>
  );
}

function SiblingsGrid({
  label, all, primaryTld,
}: { label: string; all: ResolveResult[]; primaryTld: Tld }) {
  const others = all.filter((r) => r.tld !== primaryTld);
  if (others.length === 0) return null;
  return (
    <div className="mt-8">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        Sibling TLDs
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {others.map((r) => {
          const a = TLD_ACCENT[r.tld];
          if (r.exists) {
            return (
              <Link
                key={r.tld}
                href={`/n/${label}${tldSuffix(r.tld)}`}
                className={`flex items-center justify-between rounded-xl border ${a.border} ${a.bg} px-3 py-2 text-sm transition hover:opacity-90`}
              >
                <span className="font-mono">{label}<span className={a.text}>{tldSuffix(r.tld)}</span></span>
                <span className={`text-[10px] font-bold uppercase ${a.text}`}>minted ✓</span>
              </Link>
            );
          }
          return (
            <Link
              key={r.tld}
              href={`/app?q=${label}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm hover:border-emerald-500/30 hover:bg-emerald-500/[0.04]"
            >
              <span className="font-mono">{label}<span className="text-white/40">{tldSuffix(r.tld)}</span></span>
              <span className="text-[10px] font-bold uppercase text-emerald-300">claim →</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
        {icon} {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
      <div className="mt-1 text-xs text-white/50">{sub}</div>
    </div>
  );
}

function ShareButtons({ name }: { name: string }) {
  const url = `https://insdomains.org/n/${encodeURIComponent(name)}`;
  const text = `${name} on Igra — pay once, own forever. ${url}`;
  return (
    <>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 hover:border-cyan/30 hover:text-cyan"
      >
        Share on X
      </a>
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${name} on Igra · pay once, own forever`)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 hover:border-cyan/30 hover:text-cyan"
      >
        Share on Telegram
      </a>
    </>
  );
}
