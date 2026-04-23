import Link from "next/link";
import { BookOpen, Code2, Shield, Coins, GitBranch } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70">
          <BookOpen className="h-3.5 w-3.5 text-cyan" /> Documentation
        </div>
        <h1 className="mt-6 text-5xl font-black tracking-tight">
          Build with <span className="ins-gradient-text">INS</span>
        </h1>
        <p className="mt-4 text-lg text-white/60">
          Everything you need to integrate .ins names into your Igra dApp — resolvers, reverse lookup, subnames.
        </p>

        <section id="quickstart" className="mt-16">
          <h2 className="text-2xl font-bold">Quickstart</h2>
          <p className="mt-3 text-white/60">
            Resolve a name to an address in ~5 lines with viem.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-6 text-sm leading-relaxed">
{`import { createPublicClient, http } from "viem";
import { igra } from "./igra-chain";
import { RESOLVER_ABI, RESOLVER_ADDRESS } from "./contracts";
import { namehash } from "./names";

const client = createPublicClient({ chain: igra, transport: http() });

const target = await client.readContract({
  address: RESOLVER_ADDRESS,
  abi: RESOLVER_ABI,
  functionName: "addr",
  args: [namehash("alice.ins")],
});
// → 0x71C4c2B1f3a2...`}
          </pre>
        </section>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <DocCard
            icon={<Code2 className="h-5 w-5 text-cyan" />}
            title="Registry.sol"
            body="ERC-721 name NFTs. register() is payable and mints forever."
            href="#registry"
          />
          <DocCard
            icon={<Shield className="h-5 w-5 text-plum" />}
            title="Resolver.sol"
            body="Maps namehash → address, text records (avatar, url, socials)."
            href="#resolver"
          />
          <DocCard
            icon={<Coins className="h-5 w-5 text-cyan" />}
            title="Pricing"
            body="Tiered iKAS pricing — 2-char 5k, 3-char 500, 4-char 50, 5+ 10 iKAS. Forever."
            href="#pricing"
          />
          <DocCard
            icon={<GitBranch className="h-5 w-5 text-plum" />}
            title="Subnames"
            body="Holders mint unlimited subnames at zero cost (just gas)."
            href="#subnames"
          />
        </div>

        <section id="pricing" className="mt-16">
          <h2 className="text-2xl font-bold">Why forever?</h2>
          <div className="mt-4 space-y-3 text-white/70 leading-relaxed">
            <p>
              ENS charges annual rent and will auction names after a grace period — names expire. KNS on Kaspa
              inscribes names as Kasplex L1 tokens, permanent but L1-only.
            </p>
            <p>
              <strong className="text-white">INS takes the best of both:</strong> pay once in native iKAS,
              own forever, fully composable with any Igra EVM contract. No vault, no auction, no renewal stress.
              The registry does not implement an expiry function.
            </p>
            <p className="text-sm text-white/60">
              Pricing is tiered by length — shorter names are rarer, so they cost more. 1-char names are
              reserved for DAO auction. Premium names may carry a custom price set by the team. All pricing
              lives in <span className="font-mono">priceFor(label)</span> on the registry so your UI can quote
              the exact cost before you sign.
            </p>
          </div>
        </section>

        <section id="registry" className="mt-16">
          <h2 className="text-2xl font-bold">Registry contract</h2>
          <p className="mt-3 text-white/60">Key methods on <span className="font-mono text-cyan">INSRegistry</span>:</p>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <MethodRow sig="available(string label) → bool" desc="true if mintable (not taken, not reserved, tier enabled)" />
            <MethodRow sig="priceFor(string label) → uint256" desc="effective price in wei (premium ?? length tier)" />
            <MethodRow sig="register(string label, address target) payable → uint256" desc="mints + sets target; refunds overpayment" />
            <MethodRow sig="setTarget(string label, address target)" desc="only NFT holder" />
            <MethodRow sig="ownerOfName(string label) → address" desc="resolves label to owner" />
            <MethodRow sig="reserved(string label) → bool" desc="admin-set reservation flag" />
            <MethodRow sig="adminMint(string label, address to)" desc="owner-only · bypass payment + reservation to gift" />
            <MethodRow sig="setReserved(string label, bool)" desc="owner-only · flip reservation" />
          </div>
        </section>

        <div className="mt-16 rounded-3xl border border-cyan/20 bg-cyan/[0.04] p-8 text-center">
          <h3 className="text-xl font-bold">Ready to integrate?</h3>
          <p className="mt-2 text-sm text-white/60">Grab the contracts on GitHub or mint your first name.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/app" className="btn-primary">Register a name →</Link>
            <a href="https://github.com/ItsGoonBoyCrypto" target="_blank" rel="noreferrer" className="btn-ghost">GitHub</a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function DocCard({
  icon, title, body, href,
}: { icon: React.ReactNode; title: string; body: string; href: string }) {
  return (
    <a href={href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan/30">
      <div className="flex items-center gap-2">{icon}<h3 className="font-bold">{title}</h3></div>
      <p className="mt-2 text-sm text-white/60">{body}</p>
    </a>
  );
}

function MethodRow({ sig, desc }: { sig: string; desc: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-black/40 p-3">
      <code className="text-cyan">{sig}</code>
      <p className="mt-1 font-sans text-xs text-white/50">{desc}</p>
    </div>
  );
}
