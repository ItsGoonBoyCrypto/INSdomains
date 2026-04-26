import Link from "next/link";
import { ScrollText, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms — INS · Igra Name Service",
  description:
    "Terms of use for INS — the permanent name service for Igra Network. Pay once, own forever, no warranty.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70">
          <ScrollText className="h-3.5 w-3.5 text-cyan" /> Terms of use
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          Plain-English <span className="ins-gradient-text">terms</span>.
        </h1>
        <p className="mt-3 text-white/60">
          INS is open-source software running on the public Igra L2 chain. By
          interacting with the dApp at insdomains.org or directly with the
          contracts, you accept the points below.
        </p>

        <section className="mt-10 space-y-6 text-sm text-white/75">
          <Block title="1 · You own your name">
            When you mint an INS name you receive an ERC-721 NFT in your wallet.
            That NFT is the name. We don&rsquo;t hold it, custody it, or have any
            way to take it back from you. If you transfer the NFT to another
            wallet, control of the name moves with it. If you lose access to the
            wallet, we cannot recover the name.
          </Block>

          <Block title="2 · Pay once, no renewal — but no refund either">
            INS names have <span className="font-semibold text-emerald-300">no
            expiry and no renewal fee, ever</span>. The one-time mint fee is
            non-refundable. Premium per-name overrides set by the team are also
            non-refundable. There is no &ldquo;cooling-off period&rdquo; once a
            name is minted on-chain.
          </Block>

          <Block title="3 · Reserved names">
            Some labels are reserved by the team for ecosystem partners
            (exchanges, projects, DEXes, brand-collision avoidance). Reserved
            labels can&rsquo;t be minted by the public, but can be admin-minted
            (gifted) to the legitimate owner once verified. The reservation list
            is on-chain and queryable via{" "}
            <code className="font-mono text-cyan">/api/reserved-labels</code>.
            Reservations can be lifted or added by the team multisig at any time.
          </Block>

          <Block title="4 · Marketplace risk is your own">
            Our marketplace is zero-custody — listings are NFT approvals on the
            seller&rsquo;s own wallet, not escrowed. Buyers and sellers transact
            directly via the marketplace contract. We charge a 2% sale fee +
            optional 1% upfront featured-listing fee. We do not arbitrate
            disputes, refund failed transactions, or reverse settled trades.
            Inspect every listing before buying.
          </Block>

          <Block title="5 · No warranty, no liability">
            The contracts have been independently audited (116 Foundry tests,
            zero criticals) but every smart contract carries non-zero risk. The
            dApp is provided <span className="font-mono">as-is</span>, without
            warranty of any kind. To the fullest extent permitted by law, the
            INS team will not be liable for any direct, indirect, incidental,
            consequential, or punitive damages arising from your use of the
            service or interaction with the contracts.
          </Block>

          <Block title="6 · Compliance">
            You are responsible for complying with all applicable laws in your
            jurisdiction regarding crypto assets, including any tax obligations
            on minted names, sales, or treasury withdrawals. INS does not
            provide tax, legal, or financial advice. We do not knowingly
            facilitate transactions for sanctioned individuals or entities.
          </Block>

          <Block title="7 · Changes to these terms">
            We may update these terms to reflect new features, regulatory
            changes, or community feedback. Material changes will be announced
            in our Telegram and on the homepage. Continued use of the dApp
            after a change constitutes acceptance.
          </Block>

          <Block title="8 · Source + verifiability">
            All 10 contracts are{" "}
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains"
              className="text-cyan underline decoration-dotted underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              open-source on GitHub
            </a>{" "}
            (MIT license) and verified on the Igra explorer. You can read every
            line of code that controls your name. We strongly recommend you do.
          </Block>
        </section>

        <p className="mt-10 text-xs text-white/40">
          Last updated 2026-04-26. Questions? Reach out via the{" "}
          <a
            href="https://t.me/IgraNameService"
            className="text-cyan underline decoration-dotted underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            INS Telegram
          </a>
          .
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back home
        </Link>
      </main>
      <Footer />
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-base font-bold text-white">{title}</h2>
      <div className="mt-2 leading-relaxed text-white/70">{children}</div>
    </div>
  );
}
