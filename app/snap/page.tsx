import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Search, Zap, Keyboard,
  Send, Inbox, Globe, ExternalLink, Code2, ShieldCheck, KeyRound,
} from "lucide-react";

export const metadata = {
  title: "INS Snap — Native .igra resolution in MetaMask",
  description:
    "The INS MetaMask Snap is LIVE in the official Snap Directory. Type any .igra name in MetaMask's send field — it resolves natively. One-click install, no extension juggling.",
};

const SNAP_URL = "https://snaps.metamask.io/snap/npm/ins-snap-resolver/";
const NPM_URL  = "https://www.npmjs.com/package/ins-snap-resolver";
const REGISTRY_PR = "https://github.com/MetaMask/snaps-registry/pull/1504";
const RESOLVE_EXAMPLE =
`// Free public REST API — no auth, no SDK
GET https://insdomains.org/api/resolve?name=yourname.igra
// →
{ "address": "0x71C7…F39a2bE9",
  "name":    "yourname.igra" }`;

export default function SnapPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pt-12 pb-24">
        <HeroSection />
        <UserGuideSection />
        <UnlocksSection />
        <BuildersSection />

        {/* Bottom CTAs + back link */}
        <div className="mt-16 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.04] p-6 sm:p-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-emerald-300/80">
                Ready when you are
              </div>
              <h2 className="mt-1 text-2xl font-black text-white">
                Install the snap in one click.
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Verified in the official directory. No warnings, no second
                extension, no extra app. Works in every MetaMask on every
                EVM chain.
              </p>
            </div>
            <a
              href={SNAP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 text-sm font-black text-black shadow-[0_0_40px_rgba(52,211,153,0.35)] transition hover:brightness-110"
            >
              Add to MetaMask <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </main>
      <Footer />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * HERO — mirrors "Now Live in MetaMask" pasted concept
 * ───────────────────────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-10">
      {/* subtle grid glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(700px 400px at 20% 0%, rgba(94,231,141,0.10), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(246,133,27,0.08), transparent 62%)",
        }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-white/50">
            registry / <span className="text-white/80">ins-snap-resolver</span> /
            <a
              href={REGISTRY_PR}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-300 underline decoration-dotted underline-offset-2"
            >
              merged #1504
            </a>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
            In Registry
          </div>
        </div>

        <div className="mt-6 font-mono text-xs uppercase tracking-widest text-emerald-300/80">
          Now <span className="text-emerald-300">LIVE</span> in MetaMask
        </div>
        <h1 className="mt-3 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          <span className="text-emerald-300">.igra</span> names resolve
          <br className="hidden sm:block" />{" "}
          natively in{" "}
          <span className="text-[#f6851b]">MetaMask.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm text-white/60 sm:text-base">
          Type any <code className="font-mono text-emerald-300">.igra</code> name
          in MetaMask's send field — the snap resolves it to the on-chain
          address before you hit Send. No extension juggling, no copy-paste.
        </p>

        {/* resolver preview */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <div className="rounded-2xl border border-white/10 bg-black/60 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
              <div className="h-2 w-2 rounded-full bg-white/20" />
              <div className="h-2 w-2 rounded-full bg-white/20" />
              <div className="h-2 w-2 rounded-full bg-white/20" />
              <span className="ml-2">metamask · send</span>
            </div>
            <div className="mt-4 flex items-center gap-3 font-mono">
              <span className="text-emerald-300">&gt;</span>
              <span className="text-lg text-white sm:text-2xl">
                metamask<span className="text-emerald-300">.igra</span>
              </span>
              <span className="inline-block h-5 w-2 animate-pulse rounded-sm bg-emerald-300" />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
              <div className="flex items-center gap-2 font-mono text-xs text-white/70">
                <span className="text-emerald-300">→</span>
                <span>0x71C7…F39a2bE9</span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] font-black uppercase tracking-wider text-emerald-300">
                Resolved
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="flex items-start gap-3 text-sm">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6851b]">
                <span className="text-lg font-black text-black">M</span>
              </div>
              <div className="text-white/70 leading-relaxed">
                <div className="font-black text-white">No extension.</div>
                <div className="font-black text-white">No workaround.</div>
                <div className="font-black text-[#f6851b]">It just resolves.</div>
                <div className="mt-2 text-xs text-white/50">
                  Every MetaMask user, every app on Igra.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={SNAP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-black text-black shadow-[0_0_30px_rgba(52,211,153,0.35)] transition hover:brightness-110"
          >
            Install in MetaMask <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/80 hover:text-white"
          >
            npm:ins-snap-resolver <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * USER GUIDE — 4 steps, mirrors "Send to a .igra name" pasted concept
 * ───────────────────────────────────────────────────────────────────────── */
function UserGuideSection() {
  return (
    <section className="mt-16 rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-10">
      <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/80">
        User guide
      </div>
      <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
        Send to a <span className="text-emerald-300">.igra</span> name
      </h2>
      <p className="mt-2 text-sm text-white/60">
        in four steps — about 30 seconds <span aria-label="fox">🦊</span>
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Step n="1" icon={<Search className="h-5 w-5" />} title="Find the snap" chip="snaps.metamask.io">
          Open{" "}
          <a
            href={SNAP_URL}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-300 underline decoration-dotted underline-offset-2"
          >
            the directory page
          </a>{" "}
          or search Snaps for <b>INS Resolver</b>.
        </Step>
        <Step n="2" icon={<Zap className="h-5 w-5" />} title="Install it" chip="✓ One-tap install">
          One approval. No extra app, no second extension.
        </Step>
        <Step n="3" icon={<Keyboard className="h-5 w-5" />} title="Type the name" chip="> yourname.igra">
          In the recipient field, enter any <code className="font-mono text-emerald-300">.igra</code> name instead of a 0x address.
        </Step>
        <Step n="4" icon={<CheckCircle2 className="h-5 w-5" />} title="It resolves" chip="→ 0x71C7…F39a2bE9">
          MetaMask resolves it to the address. <b>Send. Done.</b>
        </Step>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[11px] font-mono uppercase tracking-widest text-white/50">
        <span>ENS-compatible</span>
        <span className="text-white/30">·</span>
        <span>free REST API</span>
        <span className="text-white/30">·</span>
        <span className="text-[#f6851b]">4 verified contracts</span>
      </div>
    </section>
  );
}

function Step({ n, icon, title, chip, children }: {
  n: string; icon: React.ReactNode; title: string; chip: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center justify-between">
        <div className="inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-emerald-400 px-2 text-sm font-black text-black">
          {n}
        </div>
        <div className="text-emerald-300/80">{icon}</div>
      </div>
      <h3 className="mt-4 text-base font-black text-white">{title}</h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-white/60">{children}</p>
      <div className="mt-4 rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[11px] text-emerald-300">
        {chip}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * UNLOCKS — mirrors "One identity, every app on Igra" pasted concept
 * ───────────────────────────────────────────────────────────────────────── */
function UnlocksSection() {
  return (
    <section className="mt-16 rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-10">
      <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/80">
        What it unlocks
      </div>
      <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
        One identity, <span className="text-emerald-300">every app</span> on Igra —
        <br className="hidden sm:block" /> now in the wallet you already have.{" "}
        <span aria-label="fox">🦊</span>
      </h2>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Unlock icon={<Send className="h-5 w-5 text-[#f6851b]" />} title={<>Send to a <span className="text-emerald-300">name</span></>}>
          Type <code className="font-mono text-emerald-300">name.igra</code>{" "}
          instead of a long 0x address. No more copy-paste roulette.
        </Unlock>
        <Unlock icon={<Inbox className="h-5 w-5 text-[#f6851b]" />} title={<>Receive at a <span className="text-emerald-300">name</span></>}>
          Share something people can actually remember and read back to you.
        </Unlock>
        <Unlock icon={<Globe className="h-5 w-5 text-[#4a90ff]" />} title={<>One name, <span className="text-[#f6851b]">everywhere</span></>}>
          The same identity across every app on Igra — now including MetaMask itself.
        </Unlock>
      </div>
    </section>
  );
}

function Unlock({ icon, title, children }: { icon: React.ReactNode; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3">{icon}</div>
      <h3 className="text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-white/60 font-mono">{children}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * BUILDERS — mirrors "If you speak ENS, you already speak INS" pasted concept
 * ───────────────────────────────────────────────────────────────────────── */
function BuildersSection() {
  return (
    <section className="mt-16 rounded-3xl border border-white/10 bg-black/40 p-6 sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/80">
          For builders
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          Live in MetaMask
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,1.05fr]">
        <div>
          <h2 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
            If you speak <span className="text-emerald-300">ENS,</span>
            <br className="hidden sm:block" /> you already speak{" "}
            <span className="text-emerald-300">INS.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/70 leading-relaxed">
            Resolution uses <span className="text-emerald-300">ENS-compatible namehash</span> — drop-in
            for anything already wired for ENS. Free public REST API, four
            verified contracts under an Igra Safe multisig.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Chip><ShieldCheck className="h-3.5 w-3.5" /> ENS-compatible namehash</Chip>
            <Chip><Zap className="h-3.5 w-3.5" /> Free REST API</Chip>
            <Chip><KeyRound className="h-3.5 w-3.5" /> 4 verified contracts</Chip>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link
              href="/developers"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 font-medium text-white/80 transition hover:text-white"
            >
              <Code2 className="h-4 w-4 text-emerald-300" /> Developer docs
            </Link>
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 font-medium text-white/80 transition hover:text-white"
            >
              INTEGRATION.md <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/60 p-5">
          <div className="flex items-center gap-2 text-[11px] font-mono text-white/40">
            <div className="h-2 w-2 rounded-full bg-emerald-400/60" />
            <div className="h-2 w-2 rounded-full bg-white/20" />
            <div className="h-2 w-2 rounded-full bg-white/20" />
          </div>
          <pre className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-white/85">
            <code>
              <span className="text-white/40"># free public REST API</span>{"\n"}
              <span className="text-emerald-300">GET</span> insdomains.org/api/resolve{"\n"}
              {"    "}?name=<span className="text-[#f6851b]">yourname.igra</span>{"\n"}
              {"\n"}
              <span className="text-white/40"># → returns</span>{"\n"}
              {"{ "}<span className="text-emerald-300">"address"</span>: {"\""}0x71C7…F39a2bE9{"\""},{"\n"}
              {"  "}<span className="text-emerald-300">"name"</span>:    {"\""}yourname.igra{"\""}{" }"}
            </code>
          </pre>
        </div>
      </div>

      <div className="mt-6 text-[11px] font-mono uppercase tracking-widest text-white/40">
        insdomains <span className="mx-2 text-white/25">·</span> docs + API at insdomains.org
      </div>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 font-mono text-[11px] font-bold text-emerald-300">
      {children}
    </span>
  );
}
