import Link from "next/link";
import {
  Sparkles, Infinity as InfinityIcon, ShieldCheck,
  Layers, Coins, Globe, Github, Send, Hourglass, ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const REGISTRY_INS  = "0x535ff4A6710C2b0d087c5afF01b16fE10bC34D46";
const REGISTRY_IGRA = "0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c";
const REGISTRY_IKAS = "0xe705e38DeF4970e23617d30D9774062FEeEBA610";
const RESOLVER       = "0x451D84002cE0eCFd4cc622c72FA40849a8Bb5f2A";
const REVERSE_INS   = "0x9afb263be198c35159FafDafa0729Fc8B13562DA";
const REVERSE_IGRA  = "0x1bbd46aec04330a90832faf1da91889dee67d931";
const REVERSE_IKAS  = "0x9963aa24327f513b4cd5ce8118027a1da2fe76b5";
const MARKET_INS    = "0xf9e41e0a6fa04B641F6Cf8C92562C551034Af9F7";
const MARKET_IGRA   = "0xde8df276e93394c0e5dd9fe7a7ff6fd144a3642a";
const MARKET_IKAS   = "0x7ec22c238e7392adcc367f332f301629e9f4ec33";
const OWNER_SAFE    = "0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1";
const EXPLORER      = "https://explorer.igralabs.com";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70">
          <Sparkles className="h-3.5 w-3.5 text-cyan" /> About INS
        </div>

        <h1 className="mt-6 text-5xl font-black tracking-tight">
          The permanent name service for{" "}
          <span className="ins-gradient-text">Igra</span>
        </h1>
        <p className="mt-4 text-lg text-white/60">
          INS gives every wallet, contract and community on the Igra Network a
          human-readable <span className="text-plum">.igra</span> identity. Pay
          once in native iKAS, own forever. No renewals, no squatters&rsquo;
          auctions, no rent-seeking.
        </p>

        {/* Hero card — reuses the /opengraph-image route. Cache-bust query
            param bumps each release so browsers don't serve a stale PNG. */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-[0_0_80px_rgba(0,240,255,0.08),0_0_120px_rgba(168,85,247,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/opengraph-image?v=20260426e"
            alt="INS — Igra Name Service overview: sample forever.igra NFT and tiered iKAS pricing"
            width={1200}
            height={630}
            className="block h-auto w-full"
          />
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          <Stat
            icon={<InfinityIcon className="h-5 w-5 text-cyan" />}
            title="Forever names"
            body="No expiry. The registry has no renewal function — ever."
          />
          <Stat
            icon={<Layers className="h-5 w-5 text-plum" />}
            title="On-chain art"
            body="Every INS name is a Base64 SVG NFT with the correct TLD suffix baked into the artwork. No IPFS pins, no dead links."
          />
          <Stat
            icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}
            title="Multisig-owned"
            body="Admin surface sits behind an Igra Safe multisig."
          />
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">Why forever?</h2>
          <div className="mt-4 space-y-3 leading-relaxed text-white/70">
            <p>
              ENS charges annual rent and auctions names after a grace period —
              names can expire and you can lose your identity. KNS on Kaspa
              inscribes names as Kasplex L1 tokens, permanent but L1-only and
              not natively composable with EVM dApps.
            </p>
            <p>
              <strong className="text-white">INS takes the best of both:</strong>{" "}
              pay once in native iKAS, own forever, and plug straight into every
              Igra EVM contract. The registry does not implement an expiry
              function. Once you hold the NFT, it&rsquo;s yours until you choose
              to sell it.
            </p>
          </div>

          {/* Renewal-fee comparison callout */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.04] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300/70">
                ENS (the old way)
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-red-300">$5+</span>
                <span className="text-xs text-white/50">/year, every year</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-white/55">
                <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 flex-none rounded-full bg-red-400/60" /> annual rent, denominated in USD</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 flex-none rounded-full bg-red-400/60" /> 90-day grace period then auction</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 flex-none rounded-full bg-red-400/60" /> miss a renewal → lose your identity</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-5 shadow-[0_0_40px_rgba(52,211,153,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                INS (forever)
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-300">0 iKAS</span>
                <span className="text-xs text-white/50">/year, forever</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-white/65">
                <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 flex-none rounded-full bg-emerald-400" /> zero renewal fees — no function to charge them</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 flex-none rounded-full bg-emerald-400" /> no expiry, no grace period, no auction</li>
                <li className="flex items-start gap-2"><span className="mt-1 h-1 w-1 flex-none rounded-full bg-emerald-400" /> your name is yours until you sell it</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">How the pricing works</h2>
          <p className="mt-3 text-white/60">
            Tiered iKAS pricing, baked into the contract. Shorter names are
            rarer, so they cost more. The fee stream funds the treasury Safe,
            deployed into grants, liquidity, and ecosystem spend under
            transparent multisig control.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            <TierChip color="plum"    len="1-char"  price="1,000 iKAS" tag="ultra-premium" />
            <TierChip color="plum"    len="2-char"  price="500 iKAS"   tag="premium" />
            <TierChip color="amber"   len="3-char"  price="250 iKAS"   tag="rare" />
            <TierChip color="cyan"    len="4-char"  price="50 iKAS"    tag="uncommon" />
            <TierChip color="emerald" len={"5\u201332"}   price="30 iKAS"    tag="standard" />
          </div>
          <p className="mt-4 text-xs text-white/45">
            Paid <span className="text-emerald-300">once</span> in native iKAS at registration.
            <span className="ml-2 text-white/30">\u00b7</span>{" "}
            <span className="ml-2">No renewal fee \u2014 the contract has no function to charge one.</span>
            <span className="ml-2 text-white/30">\u00b7</span>{" "}
            <span className="ml-2">Marketplace: 2% seller fee on resale, 0% buyer fee.</span>
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">The stack</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StackRow
              title="Registry + Resolver + Marketplace"
              body="Solidity 0.8.24 · Foundry · 116 tests across 4 suites (incl. 3 × 256-run fuzz) covering all 3 TLDs. Each contract deployed atomically with ownership transferred to the treasury Safe in the same broadcast — deployer EOA never retained control."
            />
            <StackRow
              title="Frontend"
              body="Next.js 15 · React 19 · wagmi 2 + RainbowKit 2 · viem 2. Kaspa-native wallets (KasWare, Kastle) sit first-class alongside MetaMask, Rabby and WalletConnect."
            />
            <StackRow
              title="Chain"
              body="Igra Network (chain 38833) · EVM L2 secured by Kaspa BlockDAG. Native gas token is iKAS, same as the registration currency."
            />
            <StackRow
              title="AI suggestions"
              body="Anthropic Claude Haiku 4.5 powers the name-ideation endpoint at /api/suggest. No key ever leaves the server."
            />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">Contracts</h2>
          <p className="mt-3 text-sm text-white/60">
            Everything is verifiable on-chain. Click to view on the Igra
            explorer.
          </p>
          <div className="mt-4 space-y-2">
            <ContractRow label="Registry (.igra)"        addr={REGISTRY_IGRA} />
            <ContractRow label="Marketplace (.igra)"     addr={MARKET_IGRA} />
            <ContractRow label="ReverseResolver (.igra)" addr={REVERSE_IGRA} />
            <ContractRow label="Resolver (shared)"       addr={RESOLVER} />
            <ContractRow label="Treasury Safe"           addr={OWNER_SAFE} />
          </div>

          <details className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm">
            <summary className="cursor-pointer text-white/50 hover:text-white/80">
              Legacy contracts (paused) — <span className="font-mono">.ins</span> + <span className="font-mono">.ikas</span>
            </summary>
            <p className="mt-3 text-xs text-white/45">
              Earlier this year we shipped sister TLDs <code className="text-white/65">.ins</code> and <code className="text-white/65">.ikas</code>. Their Registries + ReverseResolvers remain on chain forever (existing holders&rsquo; NFTs are permanent, by design), but their Marketplaces are paused and the platform now focuses on <span className="text-plum">.igra</span> as the canonical Igra TLD. Holders can transfer / setPrimary their legacy names directly via the contracts below.
            </p>
            <div className="mt-3 space-y-2">
              <ContractRow label="Registry (.ins) · legacy"         addr={REGISTRY_INS} />
              <ContractRow label="Marketplace (.ins) · paused"      addr={MARKET_INS} />
              <ContractRow label="ReverseResolver (.ins)"           addr={REVERSE_INS} />
              <ContractRow label="Registry (.ikas) · legacy"        addr={REGISTRY_IKAS} />
              <ContractRow label="Marketplace (.ikas) · paused"     addr={MARKET_IKAS} />
              <ContractRow label="ReverseResolver (.ikas)"          addr={REVERSE_IKAS} />
            </div>
          </details>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">Roadmap</h2>
          <ol className="mt-4 space-y-3 text-sm text-white/70">
            <Milestone done title="Mainnet launch" body=".igra Registry + Resolver live on Igra, on-chain SVG art, Safe-owned admin surface." />
            <Milestone done title="Kaspa-native wallets" body="KasWare + Kastle first-class alongside MetaMask, Rabby, WalletConnect." />
            <Milestone done title="Reverse resolution" body="primaryName(address) so block explorers, bots and dApps can render a name next to an address." />
            <Milestone done title="Zero-custody marketplace" body="Fixed-price listings, 2% seller fee + 1% optional featured promotion. Buyer pays 0%. NFT stays in the seller's wallet until the moment of sale." />
            <Milestone done title="Live activity feed" body="@insdomainsbot in the INS Telegram posts every mint, listing, and sale in real time so the community sees activity happen." />
            <Milestone title="Subnames (code complete · activates v1.1)" body="Free child names under any .igra parent — pay.alice.igra, vault.alice.igra, etc. Contract + 27 Foundry tests + full UI shipped today; launches with enabled=false on chain. Activation planned ~1 month post-mainnet once v1 is stable. Full design at docs/SUBNAMES.md." />
            <Milestone title="Cross-chain reverse resolution" body="Explorer + wallet integrations to render .igra names natively across Kaspa L1 + Igra L2 + other EVMs that bridge to Igra." />
            <Milestone title="Renounce admin on parameter knobs" body="Once tier pricing + marketplace fees prove out, renounce the admin ability to change them. The Safe keeps emergency pause; the rest becomes immutable." />
          </ol>
        </section>

        <section className="mt-16 rounded-3xl border border-cyan/20 bg-cyan/[0.04] p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app" className="btn-primary">
              Register a name <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
            <a
              href="https://t.me/IgraNameService"
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" /> Telegram
            </a>
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains"
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <span
              title="Launching once account security is finalised"
              className="btn-ghost inline-flex cursor-default items-center gap-2 opacity-60"
            >
              <Hourglass className="h-4 w-4" /> X · soon
            </span>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Stat({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-white/60">{body}</p>
    </div>
  );
}

function TierChip({
  color, len, price, tag,
}: {
  color: "red" | "plum" | "amber" | "cyan" | "emerald";
  len: string; price: string; tag: string;
}) {
  const map: Record<typeof color, string> = {
    red:     "border-red-500/30 bg-red-500/10 text-red-300",
    plum:    "border-plum/30 bg-plum/10 text-plum",
    amber:   "border-amber-500/30 bg-amber-500/10 text-amber-300",
    cyan:    "border-cyan/30 bg-cyan/10 text-cyan",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${map[color]}`}>
      <div className="text-[11px] uppercase tracking-wider opacity-70">{len}</div>
      <div className="text-sm font-bold">{price}</div>
      <div className="text-[10px] opacity-60">{tag}</div>
    </div>
  );
}

function StackRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-cyan" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-white/60">{body}</p>
    </div>
  );
}

function ContractRow({ label, addr }: { label: string; addr: string }) {
  return (
    <a
      href={`${EXPLORER}/address/${addr}`}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm transition hover:border-cyan/30"
    >
      <div className="flex items-center gap-3">
        <Globe className="h-4 w-4 text-cyan" />
        <span className="font-semibold text-white">{label}</span>
      </div>
      <span className="font-mono text-xs text-white/70">{addr}</span>
    </a>
  );
}

function Milestone({
  title, body, done = false,
}: { title: string; body: string; done?: boolean }) {
  return (
    <li className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <span
        className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
          done ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/40"
        }`}
      >
        {done ? "\u2713" : "\u00b7"}
      </span>
      <div>
        <div className="font-semibold text-white">{title}</div>
        <div className="mt-0.5 text-white/60">{body}</div>
      </div>
    </li>
  );
}
