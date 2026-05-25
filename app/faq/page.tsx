import Link from "next/link";
import {
  HelpCircle, ArrowLeft, ArrowRight, ChevronDown,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "FAQ — INS · Igra Name Service",
  description:
    "Common questions about .igra names — pricing, renewals, subnames, cross-chain reverse resolution, .eth interop, emojis, marketplace, and security.",
};

/**
 * Frequently asked questions — designed to answer the top wallet/explorer
 * dev questions and the top end-user "how do I…" questions in one place.
 *
 * Source-of-truth: this lives ABOVE /docs in priority. If something here
 * contradicts INTEGRATION.md, fix INTEGRATION.md (and pull from there
 * when reasonable).
 *
 * Built as plain <details> elements — no JS, no client component, perfect
 * for SEO + JSON-LD FAQPage scraping. Server-rendered and indexable.
 */

type FaqItem = { q: string; a: React.ReactNode };

const FAQS: { section: string; items: FaqItem[] }[] = [
  {
    section: "The basics",
    items: [
      {
        q: "What is INS?",
        a: (
          <>
            INS (Igra Name Service) is the name service native to{" "}
            <strong>Igra L2</strong>. Every name is an ERC-721 NFT with on-chain
            SVG art, paid in native iKAS. V2 (live since 2026-05-02) ships{" "}
            <strong className="text-cyan">two tenures</strong>: pick{" "}
            <strong>Forever</strong> (pay once, no renewals — the brand
            promise) or <strong className="text-emerald-300">Annual</strong>{" "}
            (1-year renewable, ~5x cheaper, 30-day grace period). Existing V1
            holders keep their names forever and can migrate to V2 Forever{" "}
            <strong>for gas only</strong>.
          </>
        ),
      },
      {
        q: "What does a .igra name actually do?",
        a: (
          <>
            Three things: (1) <strong>forward resolution</strong> — anyone
            sending you crypto can type <code>alice.igra</code> instead of your{" "}
            <code className="font-mono">0x…</code> address; (2){" "}
            <strong>reverse resolution</strong> — wallets, explorers and dApps
            display <code>alice.igra</code> wherever they currently show your
            address; (3) <strong>identity</strong> — point your name at a
            website, an avatar, your socials, an IPFS hash, anything you want
            via the on-chain Resolver.
          </>
        ),
      },
      {
        q: "Is there a renewal fee?",
        a: (
          <>
            <strong>Depends on the tenure you pick.</strong> V2 ships two
            options at registration:
            <ul className="mt-3 space-y-1 text-sm">
              <li>· <strong className="text-cyan">Forever</strong> — pay once, no
                renewals, ever. The contract has no function to charge you again.
                This is the brand promise; pick this if you want the name for life.</li>
              <li>· <strong className="text-emerald-300">Annual</strong> —
                1-year renewable, ~5x cheaper than Forever per name. Renew any
                time before expiry (or anyone can renew on your behalf). 30-day
                grace period after expiry, then the name returns to public
                availability if you haven&rsquo;t renewed. You can also upgrade
                an Annual to Forever at any point by paying the Forever price
                difference.</li>
            </ul>
            <p className="mt-3">
              V1 holders (legacy mints from before V2 shipped 2026-05-02) keep
              their names forever — and can migrate to V2 Forever for{" "}
              <strong>gas only</strong> via the migration banner on{" "}
              <a href="/domains" className="text-cyan underline decoration-dotted underline-offset-2">/domains</a>.
            </p>
          </>
        ),
      },
    ],
  },
  {
    section: "Pricing & payment",
    items: [
      {
        q: "What does a name cost?",
        a: (
          <>
            Tiered by length. Pick <strong className="text-cyan">Forever</strong>{" "}
            (pay once, own for life) or <strong className="text-emerald-300">Annual</strong>{" "}
            (1-year renewable, 30-day grace). Both in native iKAS:
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wider text-white/50">
                  <th className="py-1 pr-4">Length</th>
                  <th className="py-1 pr-4 text-cyan">Forever (once)</th>
                  <th className="py-1 text-emerald-300">Annual (per year)</th>
                </tr>
              </thead>
              <tbody className="text-white/85">
                <tr><td className="py-1 pr-4">1-char (ultra-premium)</td><td className="py-1 pr-4"><strong>4,000 iKAS</strong></td><td className="py-1"><strong>1,000 iKAS</strong></td></tr>
                <tr><td className="py-1 pr-4">2-char (premium)</td><td className="py-1 pr-4"><strong>2,000 iKAS</strong></td><td className="py-1"><strong>800 iKAS</strong></td></tr>
                <tr><td className="py-1 pr-4">3-char (rare)</td><td className="py-1 pr-4"><strong>1,200 iKAS</strong></td><td className="py-1"><strong>500 iKAS</strong></td></tr>
                <tr><td className="py-1 pr-4">4-char (uncommon)</td><td className="py-1 pr-4"><strong>800 iKAS</strong></td><td className="py-1"><strong>250 iKAS</strong></td></tr>
                <tr><td className="py-1 pr-4">5–32 chars (standard)</td><td className="py-1 pr-4"><strong>500 iKAS</strong></td><td className="py-1"><strong>50 iKAS</strong></td></tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-white/60">
              Annual is ~5x cheaper than Forever per name and renewable up to
              10 years (public dApp surfaces 1-year only — admin can gift
              multi-year via <code>adminMintAnnual</code> for ecosystem partners).
              Both tenures use the same on-chain SVG NFT and ENS-compatible
              namehash surface.
            </p>
          </>
        ),
      },
      {
        q: "What currency do I pay in?",
        a: (
          <>
            Native iKAS — the gas token of Igra L2. No bridging, no swaps, no
            stablecoins. If you have iKAS for gas, you have everything you need
            to mint.
          </>
        ),
      },
      {
        q: "Where does the money go?",
        a: (
          <>
            Mint + sale fees stream through an on-chain{" "}
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/TREASURY_SPLITTER.md"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline decoration-dotted underline-offset-2"
            >
              TreasurySplitter
            </a>{" "}
            contract that atomically routes every withdrawal:
            <ul className="mt-3 space-y-1 text-sm">
              <li>· <strong className="text-cyan">80%</strong> →{" "}
                <a
                  href="https://explorer.igralabs.com/address/0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan underline decoration-dotted underline-offset-2"
                >
                  INS Treasury Safe
                </a>{" "}
                — a Gnosis Safe multisig that funds grants, integration bounties,
                and ecosystem spend.</li>
              <li>· <strong className="text-plum">20%</strong> →{" "}
                <strong>Igra DAO multisig</strong>. The splitter contract is
                built, audited, and tested (41 tests + 4 fuzz × 256 runs);
                takes effect on launch once Igra confirms their DAO multisig
                address.</li>
            </ul>
            <p className="mt-3 text-white/60">
              The split is enforced on-chain — it isn&rsquo;t a promise, it&rsquo;s
              a function call. The split percentage is owner-tunable by the
              Treasury Safe via Safe txs, no redeploy needed. Future-proofed for
              a deeper DAO handoff: ownership of the splitter itself can migrate
              to the Igra DAO multisig via the contract&rsquo;s 2-step ownership
              pattern.
            </p>
          </>
        ),
      },
      {
        q: "Are there any hidden fees on the marketplace?",
        a: (
          <>
            Sellers pay a flat <strong>2%</strong> sale fee. Buyers pay{" "}
            <strong>0%</strong>. Optional &ldquo;featured listing&rdquo;
            promotion costs an upfront 1% (refunded if the listing fills). The
            fee cap is hard-coded at 5% — even a compromised owner key can never
            extract more.
          </>
        ),
      },
    ],
  },
  {
    section: "Subnames",
    items: [
      {
        q: "Can I create subnames under my .igra name?",
        a: (
          <>
            Yes — the <code>SubnameExtension</code> contract is shipped and
            tested (27 Foundry tests, all passing). The V2-targeted
            instance is deployed at{" "}
            <code className="font-mono text-xs">0x7E10…f280</code> with
            <code> enabled = false</code> on chain — flipping to true
            (planned ~3-4 weeks post-V2 launch, once V2 root registrations
            stabilise) opens the floodgates. When activated, you&rsquo;ll be
            able to issue free subnames under any .igra name you own:{" "}
            <code>pay.alice.igra</code>, <code>vault.alice.igra</code>,{" "}
            <code>devs.team.igra</code>, etc.
          </>
        ),
      },
      {
        q: "Will I be able to upgrade a subname into a real root .igra name?",
        a: (
          <>
            Yes — once subnames activate, the dApp will surface a one-click{" "}
            &ldquo;promote to root&rdquo; flow. You pay the current Forever
            (or Annual) tier price for that root label and the subname holder
            becomes the new root NFT owner. Subname stays on the parent for
            backward-compat unless the parent owner revokes it.
          </>
        ),
      },
      {
        q: "How are subnames different from root names?",
        a: (
          <>
            Subnames are issued by the <em>parent name owner</em>, not by INS.
            They&rsquo;re free to issue and free to revoke; the parent owner
            sets resolution targets and can transfer them to other wallets but
            also retains the ability to reclaim. Root .igra names are
            permanent, owned outright as ERC-721 NFTs, and can never be
            reclaimed by anyone — including us.
          </>
        ),
      },
    ],
  },
  {
    section: "Emojis & non-ASCII",
    items: [
      {
        q: "Can I register an emoji name?",
        a: (
          <>
            <strong>At the protocol level, yes — via{" "}
            <a href="https://en.wikipedia.org/wiki/Punycode" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">Punycode</a></strong>,
            the same standard ENS uses. The Registry accepts the ASCII-safe
            encoded form of an emoji name (e.g. <code>xn--ls8h.igra</code> for{" "}
            <code>🦄.igra</code>), and IDN-aware wallets &amp; browsers render
            that back as the original glyph.
            <p className="mt-3">
              <strong>The honest caveat:</strong> the dApp doesn&rsquo;t yet
              have a one-click emoji flow — if you paste a raw emoji into the
              search box it&rsquo;s stripped, and we currently display the{" "}
              <code>xn--</code> form rather than the glyph. To register an
              emoji name today you&rsquo;d encode it to Punycode yourself and
              register that <code>xn--…</code> label. A first-class &ldquo;type
              the emoji, see the emoji&rdquo; experience (with confusable/
              homograph protection) is on the roadmap.
            </p>
          </>
        ),
      },
      {
        q: "Are there any emoji-name reservations?",
        a: (
          <>
            When the first-class emoji flow ships, popular single- and
            double-emoji names will sit on the reserved list and be
            admin-minted to verified holders only, to stop day-1 sniping.
            Note that pricing follows the on-chain label length of the{" "}
            <code>xn--</code> encoding (a single emoji encodes to ~7–9 ASCII
            characters, so it falls in the standard tier today — not the
            1-/2-character premium tiers).
          </>
        ),
      },
    ],
  },
  {
    section: "Cross-chain & .eth",
    items: [
      {
        q: "Will my .igra name resolve outside Igra?",
        a: (
          <>
            That&rsquo;s the goal. The{" "}
            <strong>cross-chain reverse resolution</strong> roadmap covers
            three layers:
            <ol className="mt-3 space-y-1 list-decimal pl-5 text-sm">
              <li>
                <strong>Igra-native</strong> — already works. Any wallet, dApp
                or explorer on chain 38833 can read the on-chain reverse
                resolver and show <code>alice.igra</code> instead of an
                address.
              </li>
              <li>
                <strong>Kaspa L1</strong> — wallet integrations let Kaspa-side
                tools display <code>.igra</code> identities for the same key.
              </li>
              <li>
                <strong>Other EVM chains</strong> — bridges that mirror Igra
                state will allow <code>.igra</code> reverse lookups on chains
                that hold canonical Igra account proofs.
              </li>
            </ol>
            <p className="mt-3 text-white/55">
              The first integrations land via the public{" "}
              <a href="/api" className="text-cyan underline decoration-dotted underline-offset-2">REST API</a>{" "}
              — wallets call one endpoint and they&rsquo;re live.
            </p>
          </>
        ),
      },
      {
        q: "Is there .eth integration?",
        a: (
          <>
            Yes — planned. The Resolver is namehash-compatible with ENS, so
            adding a CCIP-Read gateway that lets <code>.eth</code> profiles
            point at Igra wallets (and vice-versa) is mostly a deployment
            problem, not a contract problem. The aim: register your{" "}
            <code>alice.igra</code>, then attach it to <code>alice.eth</code>{" "}
            so .eth-aware wallets render your Igra identity natively.
          </>
        ),
      },
    ],
  },
  {
    section: "Security",
    items: [
      {
        q: "Has the contract been audited?",
        a: (
          <>
            Yes. <strong>273 Foundry tests, zero failures</strong> across 8
            suites (V1 Registry, V2 Registry, Marketplace, Resolver,
            ReverseResolver, SubnameExtension, TLD-variants, Integration).
            1024-run fuzz soak across 15 fuzz tests (15,360 iterations) — no
            counter-examples. 100% line coverage on Resolver/ReverseResolver,
            96–100% on Registry/Marketplace. Full report at{" "}
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/contracts/test/TEST_REPORT.md"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline decoration-dotted underline-offset-2"
            >
              TEST_REPORT.md
            </a>
            . Reproduce locally with{" "}
            <code className="text-cyan">cd contracts &amp;&amp; forge test</code>.
          </>
        ),
      },
      {
        q: "Who controls the admin functions?",
        a: (
          <>
            A <strong>Gnosis Safe multisig</strong> at{" "}
            <code className="font-mono text-xs">0x7447…7aA1</code>. The
            deployer EOA renounced ownership in the same broadcast that
            deployed the contracts. The Safe can pause the marketplace, adjust
            tier pricing, and reserve/unreserve labels — but cannot mint names
            for itself, cannot reclaim user names, and cannot raise the fee
            cap above the 5% hard limit.
          </>
        ),
      },
      {
        q: "Is the Igra DAO involved? Where does the partnership stand?",
        a: (
          <>
            Yes — INS revenue is split with the Igra DAO via an on-chain{" "}
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/TREASURY_SPLITTER.md"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline decoration-dotted underline-offset-2"
            >
              TreasurySplitter
            </a>{" "}
            contract. The split is{" "}
            <strong className="text-plum">20% to the Igra DAO</strong> and{" "}
            <strong className="text-cyan">80% to the INS Treasury Safe</strong>{" "}
            on every flush — atomically, no human in the loop, no &ldquo;we
            promise we&rsquo;ll send it later.&rdquo;
            <p className="mt-3">
              The splitter contract is built, independently security-audited
              (Ownable2Step admin, send-treasury-first ordering to defeat any
              gas-griefing recipient), and covered by{" "}
              <strong>41 Foundry tests + 4 fuzz suites at 256 runs each</strong>.
              It <strong className="text-emerald-300">takes effect on launch</strong>{" "}
              the moment the Igra team provides their DAO multisig address —
              activation is one forge command + one env var on the production
              box.
            </p>
            <p className="mt-3 text-white/60">
              For a deeper handoff later: the splitter&rsquo;s own ownership can
              migrate to the Igra DAO via a 2-step transferOwnership /
              acceptOwnership flow, giving the DAO direct control of the split
              percentage and recipients. Full runbook + trust model are in{" "}
              <code className="text-cyan/80 text-xs">docs/TREASURY_SPLITTER.md</code>.
            </p>
          </>
        ),
      },
      {
        q: "What happens if Igra L2 goes down?",
        a: (
          <>
            Your name lives on chain — if Igra is down, no one can mint, sell,
            or transfer. When Igra comes back, your NFT is still in your
            wallet. Igra L2 is secured by Kaspa BlockDAG; sustained downtime
            would be a Kaspa-wide event, not an INS problem.
          </>
        ),
      },
    ],
  },
  {
    section: "For wallet/explorer devs",
    items: [
      {
        q: "How do I integrate INS resolution into my wallet?",
        a: (
          <>
            Two recommended paths, in order of effort:{" "}
            <strong>(1) hit the free public REST API</strong>{" "}
            (<code>https://insdomains.org/api/resolve?name=alice.igra</code>),
            or <strong>(2) read the contracts directly</strong> via{" "}
            <code>resolve(label)</code> on the Registry (forward) and{" "}
            <code>primaryName(address)</code> on the ReverseResolver (reverse).
            A namehash-compatible Resolver also exists for ENS-style tooling,
            but for production resolution use paths (1) or (2) — full{" "}
            <code>.eth</code> interop ships separately via a CCIP-Read gateway.
            TS + Python snippets + the namehash caveat are in{" "}
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains/blob/main/docs/INTEGRATION.md"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline decoration-dotted underline-offset-2"
            >
              INTEGRATION.md
            </a>
            .
          </>
        ),
      },
      {
        q: "Is there a rate limit on the public API?",
        a: (
          <>
            Edge-cached for 30–60 seconds per endpoint, no auth needed. We
            don&rsquo;t rate-limit small integrations. If you&rsquo;re running
            a high-throughput indexer, please use Path 2 or Path 3 above and
            read directly from chain.
          </>
        ),
      },
      {
        q: "Want a partnership / want your logo on the site?",
        a: (
          <>
            DM <a href="https://t.me/GoonBoyCrypto" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">@GoonBoyCrypto</a>{" "}
            on Telegram. If you ship a working integration we&rsquo;ll add your
            tile to the homepage Integrations row + the /about Partners
            section. We can also open a PR into your repo if that&rsquo;s
            faster.
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  // JSON-LD FAQPage — feeds rich snippets in Google + makes the page
  // first-class for AI assistants searching for INS info.
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.flatMap((s) =>
      s.items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: {
          "@type": "Answer",
          // Plain-text fallback — strip JSX from the answer body for the
          // schema, since search engines want a single string.
          text: typeof i.a === "string" ? i.a : `See insdomains.org/faq for the full answer to: ${i.q}`,
        },
      })),
    ),
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
        />

        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70">
          <HelpCircle className="h-3.5 w-3.5 text-cyan" /> FAQ
        </div>

        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Frequently asked <span className="ins-gradient-text">questions</span>
        </h1>
        <p className="mt-3 text-white/60">
          Everything we get asked about INS — pricing, renewals, subnames,
          emojis, .eth interop, cross-chain resolution, security. Can&rsquo;t
          find your answer? <a href="https://t.me/IgraNameService" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">Ask us in Telegram</a>.
        </p>

        <div className="mt-10 space-y-12">
          {FAQS.map((section) => (
            <section key={section.section}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
                {section.section}
              </h2>
              <div className="mt-4 space-y-3">
                {section.items.map((item, i) => (
                  <details
                    key={i}
                    className="group rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition open:border-cyan/30 open:bg-white/[0.04]"
                  >
                    <summary className="flex cursor-pointer items-start justify-between gap-4 list-none [&::-webkit-details-marker]:hidden">
                      <span className="text-base font-bold text-white">
                        {item.q}
                      </span>
                      <ChevronDown className="h-5 w-5 flex-none text-white/40 transition group-open:rotate-180 group-open:text-cyan" />
                    </summary>
                    <div className="mt-3 leading-relaxed text-white/70">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16 rounded-3xl border border-cyan/20 bg-cyan/[0.04] p-8 text-center">
          <h2 className="text-xl font-bold">Still got a question?</h2>
          <p className="mt-2 text-sm text-white/60">
            Drop into the INS Telegram — most questions get answered in
            minutes, and we use them to grow this page.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://t.me/IgraNameService"
              target="_blank"
              rel="noreferrer"
              className="btn-primary"
            >
              Open Telegram <ArrowRight className="ml-1 inline h-4 w-4" />
            </a>
            <Link href="/about" className="btn-ghost">
              About INS
            </Link>
          </div>
        </section>

        <Link
          href="/"
          className="mt-10 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </main>
      <Footer />
    </>
  );
}
