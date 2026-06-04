import Link from "next/link";
import { Code2, ArrowLeft, Boxes, Globe, KeyRound, ShieldCheck, Zap, BookOpen, Wallet, Award, Link2, Server, Puzzle, ExternalLink } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  REGISTRY_V2_ADDRESS,
  MARKETPLACE_V2_ADDRESS,
  REVERSE_RESOLVER_V2_ADDRESS,
  RESOLVER_ADDRESS,
  REGISTRY_ADDRESSES,
  TREASURY_SAFE_ADDRESS,
} from "@/lib/contracts";

export const metadata = {
  title: "Developers — INS · Igra Name Service",
  description:
    "Add .igra name resolution to your wallet or explorer in 5 minutes. Free public REST API, direct contract reads, or ENS-compatible namehash — V2-aware, zero infrastructure.",
};

const ZERO = "0x0000000000000000000000000000000000000000";
/* Verified mainnet deploys (ground truth from VPS env, 2026-05-25). Used as a
 * fallback so the page renders correct addresses even in a build without the
 * NEXT_PUBLIC_* vars set. When the env IS set, the live values win (auto-sync). */
const FALLBACK = {
  registryV2: "0x7E7018959bf44045F01D176D8db1594894CBf4E9",
  marketplaceV2: "0xd641dadd503d8beba2395cd72367cf4edaf4674f",
  reverseV2: "0xef449f577255ee1d6df37d982da086a7e22a6853",
  resolver: "0xcb2A450784849b85A797998EE220dC43d8B3f557",
  registryV1: "0x42c2f5AA0c4aACfD07e5fBe65B898212c1c2879c",
} as const;
const pick = (dyn: string | undefined, fb: string) =>
  dyn && dyn !== ZERO ? dyn : fb;

const A = {
  registryV2: pick(REGISTRY_V2_ADDRESS, FALLBACK.registryV2),
  marketplaceV2: pick(MARKETPLACE_V2_ADDRESS, FALLBACK.marketplaceV2),
  reverseV2: pick(REVERSE_RESOLVER_V2_ADDRESS, FALLBACK.reverseV2),
  resolver: pick(RESOLVER_ADDRESS, FALLBACK.resolver),
  registryV1: pick(REGISTRY_ADDRESSES.igra, FALLBACK.registryV1),
  treasury: TREASURY_SAFE_ADDRESS,
};

const EXPLORER = "https://explorer.igralabs.com/address/";

const REST_RESOLVE = `// Forward resolve (name -> address) — works for V1 + V2, no flags
async function resolveIgra(name) {
  const r = await fetch(
    "https://insdomains.org/api/resolve?name=" + encodeURIComponent(name)
  );
  if (!r.ok) return null;
  const d = await r.json();
  if (!d.exists) return null;
  return d.address;          // also: d.owner, d.registry_version,
                             //       d.tenure ("forever"|"annual"), d.expires_at
}

// in your send-flow:
const to = await resolveIgra("alice.igra");
if (to) sendTransaction(to);`;

const REST_REVERSE = `// Reverse (address -> primary name) for tx history / contacts
async function displayName(addr) {
  const r = await fetch("https://insdomains.org/api/reverse?address=" + addr);
  const { primary } = await r.json();
  return primary ?? (addr.slice(0, 6) + "\\u2026" + addr.slice(-4));
}`;

const CONTRACT_READ = `import { createPublicClient, http } from "viem";

const client = createPublicClient({
  transport: http("https://rpc.igralabs.com:8545"),
  chain: { id: 38833, name: "Igra",
           nativeCurrency: { name: "iKAS", symbol: "iKAS", decimals: 18 } },
});

// resolve(label) returns the target address directly. Label only — no ".igra".
// Query V2 first, fall through to V1 on a zero result (matches the dApp).
const addr = await client.readContract({
  address: "${A.registryV2}",
  abi: [{ name: "resolve", type: "function", stateMutability: "view",
          inputs: [{ name: "label", type: "string" }],
          outputs: [{ type: "address" }] }],
  functionName: "resolve",
  args: ["alice"],
});`;

export default function DevelopersPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70">
          <Code2 className="h-3.5 w-3.5 text-cyan" /> Developers
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Add <span className="ins-gradient-text">.igra</span> resolution in 5 minutes.
        </h1>
        <p className="mt-3 text-white/60">
          INS is the permanent name service native to Igra L2 (chain{" "}
          <code className="font-mono text-cyan">38833</code>, native iKAS). Every
          name is an ERC-721 with on-chain SVG art. Resolve a name to an address
          with one <code className="font-mono text-cyan">fetch()</code> — the API
          unions the V1 + V2 registries automatically. No SDK, no indexer, no
          infrastructure on your side.
        </p>

        {/* Quick start */}
        <SectionTitle icon={<Zap className="h-4 w-4 text-cyan" />}>
          Quick start — REST API
        </SectionTitle>
        <p className="mt-2 text-sm text-white/60">
          Free, public, CORS-enabled, no auth, no rate limit. The fastest path —
          hit it from your wallet&apos;s existing fetch layer.
        </p>
        <CodeBlock>{REST_RESOLVE}</CodeBlock>
        <CodeBlock>{REST_REVERSE}</CodeBlock>

        {/* Endpoints */}
        <SectionTitle icon={<Globe className="h-4 w-4 text-cyan" />}>
          Live endpoints
        </SectionTitle>
        <p className="mt-2 text-sm text-white/60">
          Click any example — they return real JSON from chain right now.
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-white/5">
              <EndpointRow
                path="/api/resolve?name=igranetwork.igra"
                desc="name → address (+ tenure, expires_at, registry_version)"
              />
              <EndpointRow
                path="/api/reverse?address=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
                desc="address → primary name"
              />
              <EndpointRow
                path="/api/names/by-owner?address=0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
                desc="all names owned by an address"
              />
              <EndpointRow
                path="/api/names/recent?limit=5"
                desc="most-recent registrations (V1 + V2)"
              />
              <EndpointRow path="/api/stats" desc="supply, volume, fees, V2 breakdown" />
              <EndpointRow
                path="/api/nft-image/100?size=400&v=2"
                desc="rendered NFT card PNG (pass v=2 for V2 token ids)"
              />
            </tbody>
          </table>
        </div>

        {/* Paths */}
        <SectionTitle icon={<Boxes className="h-4 w-4 text-cyan" />}>
          Three ways to integrate
        </SectionTitle>
        <div className="mt-4 space-y-4">
          <PathCard n="1" title="REST API — 5 min, zero infra" tint="cyan">
            The snippets above. Edge-cached 30–60s, V2-aware out of the box.
            Best for almost every wallet.
          </PathCard>
          <PathCard n="2" title="Read contracts directly — no HTTP layer" tint="plum">
            Skip our API and read the chain yourself. Every endpoint is a thin
            wrapper over public view functions on the Registry.
            <CodeBlock>{CONTRACT_READ}</CodeBlock>
            V2 adds <code className="font-mono text-cyan">priceAnnualFor</code>,{" "}
            <code className="font-mono text-cyan">expiresAt</code>,{" "}
            <code className="font-mono text-cyan">isExpired</code>, and{" "}
            <code className="font-mono text-cyan">isInGrace</code> for Annual
            names (Forever names report <code className="font-mono text-cyan">expiresAt = 0</code>).
          </PathCard>
          <PathCard n="3" title="ENS-compatible namehash — for ENS-only tooling" tint="emerald">
            The hardened resolver below exposes{" "}
            <code className="font-mono text-cyan">addr(bytes32 node)</code> /{" "}
            <code className="font-mono text-cyan">text(bytes32, string)</code>{" "}
            with trustless node→label binding (poisoning impossible by
            construction; expired names resolve to <code className="font-mono text-cyan">address(0)</code>).
            Use only if you have an existing ENS pipeline — otherwise Path 1 or 2
            is simpler.
          </PathCard>
        </div>

        {/* Contracts */}
        <SectionTitle icon={<KeyRound className="h-4 w-4 text-cyan" />}>
          Contracts on Igra mainnet
        </SectionTitle>
        <p className="mt-2 text-sm text-white/60">
          All explorer-verified. V2 is canonical; V1 is legacy read-only.
        </p>
        <div className="mt-4 space-y-2">
          <ContractRow label="Registry V2 (.igra)" addr={A.registryV2} primary />
          <ContractRow label="Marketplace V2" addr={A.marketplaceV2} />
          <ContractRow label="ReverseResolver V2" addr={A.reverseV2} />
          <ContractRow label="Resolver (ENS-compatible, hardened)" addr={A.resolver} />
          <ContractRow label="Registry V1 (legacy, read-only)" addr={A.registryV1} />
          <ContractRow label="Treasury (Safe multisig — owns everything)" addr={A.treasury} />
        </div>
        <p className="mt-3 text-xs text-white/40">
          RPC: <code className="font-mono text-cyan">https://rpc.igralabs.com:8545</code>{" "}
          · Explorer:{" "}
          <a href="https://explorer.igralabs.com" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">explorer.igralabs.com</a>
          {" "}· strip the <code className="font-mono">.igra</code> suffix before calling label-based functions.
        </p>

        {/* Audit */}
        <SectionTitle icon={<ShieldCheck className="h-4 w-4 text-cyan" />}>
          Audit posture
        </SectionTitle>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat big="356" small="Foundry tests · 0 fail" />
          <Stat big="12" small="contract suites" />
          <Stat big="1024" small="runs per fuzz test" />
          <Stat big="5%" small="hard fee cap (on-chain)" />
        </div>
        <p className="mt-3 text-xs text-white/40">
          Reverse resolution is stale-safe, fees are capped in code (even a
          compromised owner can&apos;t exceed 5%), and registration overpayment
          is refunded in-tx. Reproduce with{" "}
          <code className="font-mono text-cyan">cd contracts &amp;&amp; forge test</code>.
        </p>

        {/* What we'd love */}
        <SectionTitle icon={<Zap className="h-4 w-4 text-cyan" />}>
          What we&apos;d love your help with
        </SectionTitle>
        <ul className="mt-3 space-y-2 text-sm text-white/70">
          <Bullet><b>Send-flow resolution</b> — type <code className="font-mono text-cyan">alice.igra</code> in the to-field, resolve, send. Show the name next to the 0x on confirmations.</Bullet>
          <Bullet><b>Reverse-resolve display</b> — render <code className="font-mono text-cyan">alice.igra</code> wherever you show a raw address.</Bullet>
          <Bullet><b>&ldquo;My names&rdquo; tile</b> — on connect, fetch <code className="font-mono text-cyan">/api/names/by-owner</code>.</Bullet>
          <Bullet><b>Annual expiry reminders</b> — for <code className="font-mono text-cyan">tenure === &quot;annual&quot;</code>, nudge when <code className="font-mono text-cyan">expires_at</code> is within 60 days.</Bullet>
          <Bullet><b>Native NFT art</b> — <code className="font-mono text-cyan">tokenURI()</code> returns a Base64 SVG; no extra fetch.</Bullet>
        </ul>

        {/* Full docs hub — pick by use case */}
        <SectionTitle icon={<BookOpen className="h-4 w-4 text-cyan" />}>
          Full integration guides
        </SectionTitle>
        <p className="mt-2 text-sm text-white/60">
          The page above is the 5-minute quick start. For deeper docs, pick by
          what you&apos;re building — every guide is a single markdown file on
          GitHub, public + copy-pasteable.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <DocCard
            icon={<Wallet className="h-4 w-4 text-cyan" />}
            title="Wallet & explorer integration"
            desc="Send-flow resolution, reverse-name display, on-chain NFT art, three integration paths (REST / contract / namehash)."
            href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md"
            tag="INTEGRATION.md"
          />
          <DocCard
            icon={<Award className="h-4 w-4 text-cyan" />}
            title="Attribution / leaderboard pages"
            desc="Drop-in vanilla JS for mining pools, validator leaderboards, hall-of-fame pages — humanise 0x… into alice.igra in 30 lines."
            href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION_ATTRIBUTION.md"
            tag="INTEGRATION_ATTRIBUTION.md"
            badge="NEW"
          />
          <DocCard
            icon={<Link2 className="h-4 w-4 text-cyan" />}
            title="ENS interop (.insdomains.eth)"
            desc="CCIP-Read wildcard resolver — makes *.insdomains.eth resolve in every ENS-aware wallet (MetaMask, Rabby, Uniswap, Coinbase Wallet, Frame, Brave, Trust, Rainbow)."
            href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/ETH_INTEGRATION.md"
            tag="ETH_INTEGRATION.md"
          />
          <DocCard
            icon={<Server className="h-4 w-4 text-cyan" />}
            title="REST API reference"
            desc="Full endpoint catalogue: resolve, reverse, names-by-owner, names-recent, stats, nft-image, ccip — request/response schemas + caching guidance."
            href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/API.md"
            tag="API.md"
          />
          <DocCard
            icon={<Puzzle className="h-4 w-4 text-cyan" />}
            title="MetaMask Snap (end-user)"
            desc="Install INS Snap in MetaMask Flask. Native .igra resolution in the send field. Snap Directory submission filed for regular MetaMask."
            href="/snap-help"
            tag="/snap-help"
            internal
          />
          <DocCard
            icon={<ShieldCheck className="h-4 w-4 text-cyan" />}
            title="Snap threat model"
            desc="Permission scope, attacker capability analysis, network call surface area, reproducible builds, vulnerability reporting."
            href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/snap/SECURITY.md"
            tag="SECURITY.md"
          />
        </div>

        {/* Contact */}
        <div className="mt-12 rounded-2xl border border-cyan/20 bg-cyan/[0.04] p-6">
          <h2 className="text-base font-bold text-white">Get a hand integrating</h2>
          <p className="mt-2 text-sm text-white/70">
            Happy to do a 15-minute walk-through, debug a call against the live
            RPC, or open a PR into your wallet repo. The API is free forever and
            there are real users + volume on chain today.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <a href="https://t.me/GoonBoyCrypto" target="_blank" rel="noreferrer" className="rounded-xl bg-ins-gradient px-4 py-2 font-bold text-black">DM @GoonBoyCrypto</a>
            <a href="https://x.com/IgraNameService" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-medium text-white/80 hover:text-white">@IgraNameService</a>
            <a href="https://t.me/insdomainsbot" target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-medium text-white/80 hover:text-white">Live mint feed</a>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Full source (MIT) is on GitHub — private during launch; ping{" "}
            <a href="https://t.me/GoonBoyCrypto" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">@GoonBoyCrypto</a>{" "}
            for read access.
          </p>
        </div>

        <Link href="/" className="mt-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </main>
      <Footer />
    </>
  );
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mt-12 flex items-center gap-2 text-xl font-black tracking-tight">
      {icon} {children}
    </h2>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-relaxed text-white/85">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

function EndpointRow({ path, desc }: { path: string; desc: string }) {
  return (
    <tr className="hover:bg-white/[0.02]">
      <td className="p-3 align-top">
        <a
          href={"https://insdomains.org" + path}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-cyan underline decoration-dotted underline-offset-2 break-all"
        >
          {path}
        </a>
      </td>
      <td className="p-3 align-top text-white/55">{desc}</td>
    </tr>
  );
}

function PathCard({ n, title, tint, children }: { n: string; title: string; tint: "cyan" | "plum" | "emerald"; children: React.ReactNode }) {
  const ring: Record<string, string> = {
    cyan: "border-cyan/25",
    plum: "border-plum/25",
    emerald: "border-emerald-500/25",
  };
  return (
    <div className={"rounded-2xl border bg-white/[0.02] p-5 " + ring[tint]}>
      <h3 className="flex items-center gap-2 text-base font-bold text-white">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-black">{n}</span>
        {title}
      </h3>
      <div className="mt-2 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

function ContractRow({ label, addr, primary }: { label: string; addr: string; primary?: boolean }) {
  return (
    <div className={"flex flex-col gap-1 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between " + (primary ? "border-cyan/30 bg-cyan/[0.04]" : "border-white/10 bg-white/[0.02]")}>
      <span className="text-sm font-medium text-white/80">{label}</span>
      <a
        href={EXPLORER + addr}
        target="_blank"
        rel="noreferrer"
        className="font-mono text-xs text-cyan underline decoration-dotted underline-offset-2 break-all"
      >
        {addr}
      </a>
    </div>
  );
}

function Stat({ big, small }: { big: string; small: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
      <div className="text-2xl font-black ins-gradient-text">{big}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-white/45">{small}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
      <span>{children}</span>
    </li>
  );
}

function DocCard({
  icon, title, desc, href, tag, internal, badge,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href: string;
  tag: string;
  internal?: boolean;
  badge?: string;
}) {
  const cls =
    "group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:border-cyan/40 hover:bg-white/[0.04] hover:shadow-[0_0_30px_rgba(0,240,255,0.08)]";
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-bold text-white">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {badge && (
            <span className="rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
              {badge}
            </span>
          )}
          {!internal && <ExternalLink className="h-3.5 w-3.5 text-white/30 transition group-hover:text-white/70" />}
        </div>
      </div>
      <p className="text-xs leading-relaxed text-white/55">{desc}</p>
      <code className="mt-auto font-mono text-[11px] text-cyan/70">{tag}</code>
    </>
  );
  return internal ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer noopener" className={cls}>{inner}</a>
  );
}
