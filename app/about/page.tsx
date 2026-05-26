import Link from "next/link";
import {
  Sparkles, Infinity as InfinityIcon, ShieldCheck,
  Layers, Coins, Globe, Github, Send, ArrowRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { RecentMintsCarousel } from "@/components/RecentMintsCarousel";
import { PartnersSection } from "@/components/PartnersSection";

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
            src="/opengraph-image?v=20260502dual"
            alt="INS — Igra Name Service overview: sample forever.igra NFT and the dual Annual / Forever iKAS pricing tiers"
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

        {/* Live mint carousel — pulls from /api/names/recent every 60s. The
            best social proof on the page since it shows real on-chain
            activity, not static copy. */}
        <section className="mt-12">
          <RecentMintsCarousel />
        </section>

        {/* Partners — orgs/teams formally collaborating. Day-1 = Igra Labs
            only; new tiles auto-add as integrations land. */}
        <PartnersSection />

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
            Two tiers per name length. Pick <span className="text-cyan font-semibold">Forever</span> at
            registration to lock the name in for life with no renewals; the cheaper{" "}
            <span className="text-emerald-300 font-semibold">Annual</span> tier launches
            with V2 (this quarter). Today every mint is Forever — V1 holders are
            grandfathered into V2 Forever for gas only.
          </p>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[1.2fr_1fr_1fr] items-center gap-3 bg-white/[0.04] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
              <div>Length tier</div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Annual <span className="text-white/30 normal-case tracking-normal text-[9px]">(V2 — soon)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
                Forever <span className="text-cyan/70 normal-case tracking-normal text-[9px]">(live now)</span>
              </div>
            </div>
            <PriceRow tier="1-char"  tag="ultra-premium" annual="1,000" forever="4,000" />
            <PriceRow tier="2-char"  tag="premium"       annual="800"   forever="2,000" />
            <PriceRow tier="3-char"  tag="rare"          annual="500"   forever="1,200" />
            <PriceRow tier="4-char"  tag="uncommon"      annual="250"   forever="800" />
            <PriceRow tier={"5\u201332"} tag="standard" annual="50"    forever="500"   last />
          </div>

          <ul className="mt-4 space-y-1.5 text-xs text-white/55">
            <li>· All prices in native iKAS, paid <span className="text-white/80">once</span> at registration (Forever) or per year (Annual).</li>
            <li>· Annual names get a <span className="text-white/80">30-day grace period</span> after expiry before re-entering the public registry.</li>
            <li>· Annual → Forever upgrade available any time at the price difference.</li>
            <li>· Marketplace: <span className="text-white/80">2% seller fee</span> on resale, <span className="text-white/80">0% buyer fee</span>. Hard cap 5% — even a compromised owner key can never extract more.</li>
          </ul>
        </section>

        <section className="mt-16">
          <h2 className="text-2xl font-bold">The stack</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <StackRow
              title="Registry + Resolver + Marketplace"
              body="Solidity 0.8.24 · Foundry · 170 tests across 5 suites (incl. 7 fuzz tests at 1024 runs each) covering Registry / Resolver / Marketplace / Subnames. Each contract deployed atomically with ownership transferred to the treasury Safe in the same broadcast — deployer EOA never retained control."
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
            <Milestone done title="Public REST API + integration docs" body="Free, no-auth REST API at /api/* + INTEGRATION.md guide for wallet/explorer devs. One fetch() resolves any name → address." />
            <Milestone done title="V2 — dual registration model (1-year + Forever)" body="V2 Registry live since 2026-05-02. Forever (pay once) or Annual (1-year renewable, 30-day grace) at registration. V1 holders get the new Forever tier grandfathered for gas only via claimV1Forever. 273 Foundry tests passing across V1 + V2." />
            <Milestone title="Emoji & Unicode names (Punycode now · one-click UX next)" body="The Registry already accepts Punycode-encoded names (xn--ls8h.igra renders as 🦄.igra in IDN-aware wallets) — the same standard ENS uses. What's still to come: a first-class dApp flow to type an emoji and see it render (today raw emoji input is stripped and we show the xn-- form), plus confusable/homograph protection and reserved popular-emoji slots for a fair launch." />
            <Milestone done title="Igra DAO partnership — ready, awaiting multisig" body="TreasurySplitter contract is built, audited, and tested (41 tests + 4 fuzz × 256 runs). Routes 20% of every INS revenue withdrawal directly to the Igra DAO multisig, atomically, on every flush. Activation is 1 forge command + 1 env var the moment Igra hands over their multisig address; the rest of the path (Safe ownership, Ownable2Step admin, send-order hardening) is already in place. Spec at docs/TREASURY_SPLITTER.md." />
            <Milestone title="Subnames (code complete · activates v2.1)" body="Free child names under any .igra parent — pay.alice.igra, vault.alice.igra, etc. SubnameExtension V2 deployed at 0x7E10…f280 with enabled=false on chain. Activation planned ~3-4 weeks post-V2-launch once root registrations stabilise (single Safe setEnabled(true) call to flip on). Full design at docs/SUBNAMES.md." />
            <Milestone title="Cross-chain reverse resolution" body="Explorer + wallet integrations to render .igra names natively across Kaspa L1 + Igra L2 + other EVMs that bridge to Igra. First wallets land via the public REST API." />
            <Milestone title=".eth interop (CCIP-Read gateway)" body="Resolver is namehash-compatible with ENS, so a CCIP-Read gateway lets .eth-aware wallets resolve .igra names natively + lets users link their alice.igra → alice.eth profiles. Coordinated rollout with the ENS team." />
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
            <a
              href="https://x.com/IgraNameService"
              target="_blank"
              rel="noreferrer noopener"
              className="btn-ghost inline-flex items-center gap-2"
            >
              {/* Inline X logo (lucide doesn't yet ship a clean X-brand glyph). */}
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              X
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

function PriceRow({
  tier, tag, annual, forever, last = false,
}: {
  tier: string;
  tag: string;
  annual: string;
  forever: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1.2fr_1fr_1fr] items-center gap-3 px-4 py-3 ${
        last ? "" : "border-b border-white/5"
      }`}
    >
      <div>
        <div className="text-sm font-bold text-white">{tier}</div>
        <div className="text-[10px] uppercase tracking-wider text-white/40">{tag}</div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-emerald-300/80">{annual}</span>
          <span className="text-[10px] text-white/40">iKAS / yr</span>
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-bold text-cyan">{forever}</span>
          <span className="text-[10px] text-white/40">iKAS · once</span>
        </div>
      </div>
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
