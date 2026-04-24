import Link from "next/link";
import {
  Sparkles, Infinity as InfinityIcon, ShieldCheck,
  Layers, Coins, Globe, Github, Twitter, ArrowRight,
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
          human-readable identity across three TLDs — <span className="text-cyan">.ins</span>,{" "}
          <span className="text-plum">.igra</span>, <span className="text-emerald-300">.ikas</span>.
          Pay once in native iKAS, own forever. No renewals, no squatters&rsquo; auctions,
          no rent-seeking.
        </p>

        {/* Hero card — reuses the /opengraph-image route */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] shadow-[0_0_80px_rgba(0,240,255,0.08),0_0_120px_rgba(168,85,247,0.06)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/opengraph-image"
            alt="INS — Igra Name Service overview: sample igra.ins NFT and tiered iKAS pricing"
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
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">How the pricing works</h2>
          <p className="mt-3 text-white/60">
            Tiered iKAS pricing, baked into the contract. Shorter names are
            rarer, so they cost more. The fee stream funds the treasury Safe —
            future governance decides how it gets spent.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-5">
            <TierChip color="red"     len="1-char"  price="Reserved" tag="DAO auction" />
            <TierChip color="plum"    len="2-char"  price="5,000 iKAS" tag="ultra-rare" />
            <TierChip color="amber"   len="3-char"  price="500 iKAS"   tag="rare" />
            <TierChip color="cyan"    len="4-char"  price="50 iKAS"    tag="uncommon" />
            <TierChip color="emerald" len={"5\u201332"}   price="10 iKAS"    tag="standard" />
          </div>
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
            <ContractRow label="Registry (.ins)"         addr={REGISTRY_INS} />
            <ContractRow label="Registry (.igra)"        addr={REGISTRY_IGRA} />
            <ContractRow label="Registry (.ikas)"        addr={REGISTRY_IKAS} />
            <ContractRow label="Marketplace (.ins)"      addr={MARKET_INS} />
            <ContractRow label="Marketplace (.igra)"     addr={MARKET_IGRA} />
            <ContractRow label="Marketplace (.ikas)"     addr={MARKET_IKAS} />
            <ContractRow label="ReverseResolver (.ins)"  addr={REVERSE_INS} />
            <ContractRow label="ReverseResolver (.igra)" addr={REVERSE_IGRA} />
            <ContractRow label="ReverseResolver (.ikas)" addr={REVERSE_IKAS} />
            <ContractRow label="Resolver (shared)"       addr={RESOLVER} />
            <ContractRow label="Treasury Safe"           addr={OWNER_SAFE} />
          </div>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">Roadmap</h2>
          <ol className="mt-4 space-y-3 text-sm text-white/70">
            <Milestone done title="Mainnet launch" body="Registry + Resolver live on Igra, on-chain SVG art, Safe-owned admin surface." />
            <Milestone done title="Kaspa-native wallets" body="KasWare + Kastle first-class alongside MetaMask, Rabby, WalletConnect." />
            <Milestone done title="Reverse resolution" body="primaryName(address) so block explorers, bots and dApps can render a name next to an address. Live per-TLD." />
            <Milestone done title="Multi-TLD: .ins, .igra, .ikas" body="Three sister Registries + Marketplaces + ReverseResolvers. Claim any name on one, two, or all three with a single batch flow on /app." />
            <Milestone done title="Zero-custody marketplace" body="Fixed-price listings, 2% seller fee + 1% optional featured promotion. Buyer pays 0%. Aggregated across all three TLDs on /marketplace." />
            <Milestone title="Admin across all TLDs" body="First-class TLD switcher on /admin so reservations + pricing + pause can be tuned per-TLD from the UI (currently .ins-only in the UI; Safe can call directly)." />
            <Milestone title="Subnames" body="Zero-cost subdomains — alice.ins can mint pay.alice.ins, vault.alice.ins, etc." />
            <Milestone title="DAO handover" body="Governance takes the Safe keys; the team burns its own signer." />
          </ol>
        </section>

        <section className="mt-16 rounded-3xl border border-cyan/20 bg-cyan/[0.04] p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app" className="btn-primary">
              Register a name <ArrowRight className="ml-1 inline h-4 w-4" />
            </Link>
            <a
              href="https://github.com/ItsGoonBoyCrypto"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Github className="h-4 w-4" /> GitHub
            </a>
            <a
              href="https://x.com/GoonBoyCrypto"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost inline-flex items-center gap-2"
            >
              <Twitter className="h-4 w-4" /> X / Twitter
            </a>
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
