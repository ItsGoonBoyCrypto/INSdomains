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
            INS (Igra Name Service) is the permanent name service native to{" "}
            <strong>Igra L2</strong>. Every name is an ERC-721 NFT with on-chain
            SVG art. You buy a name once, in native iKAS, and you own it forever
            — there&rsquo;s no renewal fee, no expiry, no grace-period auction.
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
            <strong>No.</strong> The contract does not implement a renewal
            function. Once you mint a Forever name, no one — not even the
            multisig — can charge you to keep it. If we ever ship optional
            1-year renewable names alongside Forever (planned for V2), the
            choice is yours at registration time.
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
            Tiered by length, paid <strong>once</strong> in native iKAS.
            Today (V1, Forever-only):
            <ul className="mt-3 space-y-1 text-sm">
              <li>· 1-char — <strong>1,000 iKAS</strong></li>
              <li>· 2-char — <strong>500 iKAS</strong></li>
              <li>· 3-char — <strong>250 iKAS</strong></li>
              <li>· 4-char — <strong>50 iKAS</strong></li>
              <li>· 5–32 chars — <strong>30 iKAS</strong></li>
            </ul>
            <p className="mt-3">
              V2 (planned this quarter) introduces a dual model: keep buying{" "}
              <em>Forever</em> at the prices above, or pick the cheaper{" "}
              <em>1-year renewable</em> tier. V1 holders get the new Forever
              tier grandfathered for free (gas only).
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
            The mint fee streams into the{" "}
            <a
              href="https://explorer.igralabs.com/address/0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline decoration-dotted underline-offset-2"
            >
              treasury Safe
            </a>{" "}
            — a Gnosis Safe multisig — and is deployed into grants, integration
            bounties, and ecosystem spend. We&rsquo;re also planning a formal
            DAO transfer once the community is large enough; the multisig will
            announce it on Telegram first.
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
            tested (27 Foundry tests, all passing). It&rsquo;s currently
            disabled on chain. The plan is to flip it on once V1 root
            registrations are stable, ~3-4 weeks post-launch. When it activates,
            you&rsquo;ll be able to issue free subnames under any .igra name you
            own:{" "}
            <code>pay.alice.igra</code>, <code>vault.alice.igra</code>,{" "}
            <code>devs.team.igra</code>, etc.
          </>
        ),
      },
      {
        q: "Will I be able to upgrade a subname into a real root .igra name?",
        a: (
          <>
            Yes — when V2 ships we&rsquo;ll surface a one-click{" "}
            &ldquo;promote to root&rdquo; flow on the dApp. You pay the
            current tier price (Forever or 1-year), and the subname becomes
            your standalone root name.
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
            <strong>Coming in V2.</strong> V1 limits labels to lowercase ASCII
            (a–z, 0–9, hyphen). V2 widens the validator to accept full Unicode
            via <a href="https://en.wikipedia.org/wiki/Punycode" target="_blank" rel="noreferrer" className="text-cyan underline decoration-dotted underline-offset-2">Punycode</a>{" "}
            (the same standard ENS uses). On chain it&rsquo;s stored as the
            ASCII-safe punycode form (e.g. <code>xn--ls8h.igra</code>); in
            wallets and the dApp it renders back as the original glyph
            (e.g. <code>🦄.igra</code>).
          </>
        ),
      },
      {
        q: "Are there any emoji-name reservations?",
        a: (
          <>
            Yes. Single-emoji and double-emoji names are flagged as{" "}
            <em>ultra-premium</em> (1-char and 2-char tiers respectively) and
            most popular emojis will sit on the reserved list at launch — they
            need to be admin-minted and only assigned to verified holders. This
            stops day-1 sniping.
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
            Yes. <strong>170 Foundry tests, zero failures</strong>. 1024-run
            fuzz soak across 7 fuzz tests (7,168 iterations) — no
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
            Three paths, in order of effort:{" "}
            <strong>(1) hit the free public REST API</strong>{" "}
            (<code>https://insdomains.org/api/resolve?name=alice.igra</code>),{" "}
            <strong>(2) read the contracts directly</strong> via{" "}
            <code>tokenIdOf(label)</code> + <code>targetOf(tokenId)</code>, or{" "}
            <strong>(3) drop into your existing ENS namehash flow</strong> by
            pointing it at the shared Resolver. Full TS + Python snippets in{" "}
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
