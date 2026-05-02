import Link from "next/link";
import { Search, Sparkles, Wallet, Zap, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroSearch } from "@/components/HeroSearch";
import { FeatureCard } from "@/components/FeatureCard";
import { DomainMarquee } from "@/components/DomainMarquee";
import { StatsRow } from "@/components/StatsRow";
import { IntegrationsRow } from "@/components/IntegrationsRow";
import { NameCard } from "@/components/NameCard";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pb-24 pt-24 text-center sm:pt-32">
        {/* Eyebrow */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium tracking-wide text-white/70 backdrop-blur-xl animate-fade-up">
          <Zap className="h-3.5 w-3.5 text-cyan" />
          Native on Igra L2 · Forever on-chain
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.04em] sm:text-7xl lg:text-[96px] animate-fade-up">
          Your forever{" "}
          <span className="text-plum">.igra</span>{" "}
          name on Igra
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-white/60 sm:text-xl animate-fade-up">
          Permanent on-chain identity for every wallet, contract, and community
          on the Igra Network. No renewals. No expiry. Send crypto to{" "}
          <span className="font-medium text-plum">alice.igra</span>{" "}
          instead of <span className="font-mono text-white/50">0x71C4…f3a2</span>.
        </p>

        <HeroSearch />

        {/* Zero-renewal callout — the product's core promise. New copy
            references the dual model that lands in V2 (Annual coming soon),
            keeping Forever as the headline. */}
        <div className="mx-auto mt-10 inline-flex max-w-xl items-center gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] px-5 py-4 text-left shadow-[0_0_40px_rgba(52,211,153,0.08)]">
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-emerald-500/15 text-2xl font-black text-emerald-300">
            ∞
          </div>
          <div>
            <div className="text-sm font-bold text-white">
              Forever from <span className="text-cyan">500 iKAS</span> · Annual tier coming soon
            </div>
            <p className="mt-0.5 text-xs text-white/60">
              Pick Forever to lock your name in for life with no renewals
              ever. Cheaper 1-year Annual tier launches with V2; current
              holders get the new Forever tier grandfathered for gas only.
            </p>
          </div>
        </div>

        {/* Inline NFT-card preview — what you actually get when you mint */}
        <div className="mt-14 flex flex-col items-center">
          <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-white/40">
            What you get
          </p>
          <div className="w-full max-w-[420px]">
            <Link href="/app?q=forever" className="block transition hover:opacity-95">
              <NameCard label="forever" tld="igra" tier="FOREVER · 500 iKAS" tokenId={null} />
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/40">
            On-chain SVG NFT · rendered live by the registry · no IPFS pin
          </p>
        </div>

        {/* Trust row */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] uppercase tracking-[0.2em] text-white/40">
          <span>Powered by Igra EVM</span>
          <span className="dot-sep" />
          <span>3,000+ TPS</span>
          <span className="dot-sep" />
          <span>Sub-second finality</span>
          <span className="dot-sep" />
          <span>Kaspa-secured</span>
          <span className="dot-sep" />
          <span className="text-emerald-300">Pay once · own forever</span>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Search className="h-6 w-6" />}
            tint="cyan"
            title="Search"
            body="Find any .igra name instantly. Check availability on the Igra registry in milliseconds — no signups, no rate limits."
            href="/app"
          />
          <FeatureCard
            icon={<Sparkles className="h-6 w-6" />}
            tint="plum"
            title="Register"
            body="Mint your name forever. Pay once in iKAS, own for life. 0 renewal fees — ever. No expiry, no grace-period auctions, no hidden costs."
            href="/app"
          />
          <FeatureCard
            icon={<Wallet className="h-6 w-6" />}
            tint="mix"
            title="Manage"
            body="Point anywhere. Resolve to addresses, websites, avatars, socials — fully EVM-composable."
            href="/domains"
          />
        </div>

        <StatsRow />

        {/* Wallet / explorer / dApp integration logos — auto-renders when
            lib/integrations.ts has at least one entry, otherwise null */}
        <IntegrationsRow />

        {/* Domain marquee */}
        <div className="mt-24 w-full">
          <p className="mb-6 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">
            Recently inscribed
          </p>
          <DomainMarquee />
        </div>

        {/* Resolve demo */}
        <div className="mt-20 inline-flex flex-wrap items-center justify-center gap-4 rounded-2xl glass px-6 py-4">
          <span className="ins-gradient-text text-xl font-bold">alice.igra</span>
          <ArrowRight className="h-4 w-4 text-cyan" />
          <span className="font-mono text-sm text-white/70">0x71C4…f3a2</span>
          <span className="ml-2 rounded-full bg-cyan/10 px-2 py-0.5 text-[10px] font-medium text-cyan">
            resolved instantly
          </span>
        </div>

        {/* CTA row */}
        <div className="mt-24 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/app" className="btn-primary text-base px-7 py-3.5">
            Get your INS name →
          </Link>
          <Link href="/about" className="btn-ghost text-base px-7 py-3.5">
            About INS
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
