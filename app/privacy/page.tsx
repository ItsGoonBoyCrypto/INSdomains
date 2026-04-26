import Link from "next/link";
import { Lock, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Privacy — INS · Igra Name Service",
  description:
    "Privacy notes for INS. We don't run user accounts. Your wallet address + on-chain activity is the only identifier we ever see.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-16 pb-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs font-medium text-white/70">
          <Lock className="h-3.5 w-3.5 text-cyan" /> Privacy
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight">
          What we <span className="ins-gradient-text">don&rsquo;t</span> collect.
        </h1>
        <p className="mt-3 text-white/60">
          INS is a thin frontend on top of public smart contracts. There&rsquo;s
          almost nothing to collect, and we don&rsquo;t run user accounts. Plain
          English below.
        </p>

        <section className="mt-10 space-y-6 text-sm text-white/75">
          <Block title="No accounts, no email, no signup">
            You connect a wallet. That&rsquo;s the entire identity layer. We
            never ask for your name, email, phone, location, or any personal
            data. We don&rsquo;t store who you are because we never know.
          </Block>

          <Block title="What is on-chain (public, not by us)">
            Mints, listings, sales, primary-name updates, and target-address
            edits all happen on the public Igra L2 chain (chain ID 38833). Once
            on-chain, that data is public, permanent, and queryable by anyone
            via the Igra explorer or the Igra RPC. This is not data we collect
            — it&rsquo;s how blockchains work. Your wallet address, the names
            you own, and the prices you paid are visible to everyone forever.
          </Block>

          <Block title="What our server logs (minimal, ephemeral)">
            Our reverse proxy (Caddy) logs incoming HTTP requests to
            insdomains.org for operational health and abuse prevention: timestamp,
            requesting IP, user-agent, path, response code. These logs rotate
            every 14 days and are not used for any other purpose. We do not
            associate IPs with wallet addresses.
          </Block>

          <Block title="Public APIs">
            <code className="font-mono text-cyan">/api/resolve</code>,{" "}
            <code className="font-mono text-cyan">/api/reverse</code>, and{" "}
            <code className="font-mono text-cyan">/api/reserved-labels</code>{" "}
            are open, CORS-enabled, and pass through directly to the on-chain
            registry contracts. They&rsquo;re cached at the edge for ~60s. We
            don&rsquo;t log API requests beyond the standard reverse-proxy
            access log above.
          </Block>

          <Block title="No analytics, no trackers, no third-party scripts">
            The dApp ships zero third-party analytics: no Google Analytics, no
            Meta Pixel, no PostHog, no Sentry. The only outbound calls your
            browser makes are to: the Igra RPC (read your owned names + chain
            state), our own API (when you use the resolver endpoints), and
            WalletConnect&rsquo;s relay (only if you choose WalletConnect as
            your connector).
          </Block>

          <Block title="AI name suggestions">
            Our{" "}
            <code className="font-mono text-cyan">/api/suggest</code> endpoint
            calls Anthropic&rsquo;s Claude API server-side to generate name ideas
            from a seed word. The seed word is sent to Anthropic; nothing else.
            No wallet address, no IP, no other context. Anthropic&rsquo;s own{" "}
            <a
              href="https://www.anthropic.com/legal/privacy"
              target="_blank"
              rel="noreferrer"
              className="text-cyan underline decoration-dotted underline-offset-2"
            >
              privacy policy
            </a>{" "}
            applies to that hop.
          </Block>

          <Block title="Wallets">
            Your wallet (MetaMask, KasWare, Kastle, Rabby, WalletConnect, etc.)
            handles all signing locally. We never see your private keys, your
            seed phrase, or any signing material. We see only the broadcasted
            transactions — same as any block explorer.
          </Block>

          <Block title="Cookies + local storage">
            We use browser <span className="font-mono">localStorage</span> to
            remember your preferred TLD selection on{" "}
            <code className="font-mono">/admin</code>, your apply-all toggles on
            admin batch flows, and your manually-untracked reserved labels.
            That&rsquo;s it. No cookies are set. Local-storage data never leaves
            your browser.
          </Block>

          <Block title="Data deletion">
            Since we don&rsquo;t collect personal data, there&rsquo;s nothing
            for us to delete on request. On-chain data (mints, listings, etc.)
            is by design permanent and outside our control — we can&rsquo;t
            erase chain history, and neither can anyone else.
          </Block>

          <Block title="Contact">
            Questions, concerns, or anything else about this notice — reach us
            via the{" "}
            <a
              href="https://t.me/IgraNameService"
              className="text-cyan underline decoration-dotted underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              INS Telegram
            </a>{" "}
            or open an issue on{" "}
            <a
              href="https://github.com/ItsGoonBoyCrypto/INSdomains"
              className="text-cyan underline decoration-dotted underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            .
          </Block>
        </section>

        <p className="mt-10 text-xs text-white/40">Last updated 2026-04-26.</p>

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
