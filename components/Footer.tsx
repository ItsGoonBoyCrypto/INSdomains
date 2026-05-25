import Link from "next/link";
import { RooftopMark } from "./RooftopMark";

type FooterItem = {
  label: string;
  href: string;
  external?: boolean;
  comingSoon?: boolean;
};

const COLS: { title: string; items: FooterItem[] }[] = [
  {
    title: "Product",
    items: [
      { label: "App", href: "/app" },
      { label: "My Domains", href: "/domains" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "About", href: "/about" },
      { label: "FAQ", href: "/faq" },
      { label: "Developers", href: "/developers" },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "Telegram", href: "https://t.me/IgraNameService", external: true },
      { label: "X / Twitter", href: "https://x.com/IgraNameService", external: true },
      { label: "GitHub", href: "https://github.com/ItsGoonBoyCrypto/INSdomains", external: true },
    ],
  },
  {
    title: "Network",
    items: [
      { label: "Igra Explorer", href: "https://explorer.igralabs.com", external: true },
      { label: "Igra Labs", href: "https://igralabs.com", external: true },
      { label: "Treasury Safe", href: "https://explorer.igralabs.com/address/0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1", external: true },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t border-white/[0.06] bg-[#050505] px-6 py-16">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 md:grid-cols-5">
        <div className="col-span-2">
          <div className="flex items-center gap-2">
            <RooftopMark />
            <span className="ins-gradient-text text-xl font-black">INS</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-white/50">
            Permanent <span className="text-plum">.igra</span> names on the Igra Network. Built on Kaspa BlockDAG.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-white/40">
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">
              Mainnet
            </span>
            <span>· Chain 38833</span>
          </div>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
              {col.title}
            </div>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {col.items.map((i) => {
                if (i.comingSoon) {
                  return (
                    <li key={i.label}>
                      <span
                        className="inline-flex cursor-default items-center gap-2 text-white/40"
                        title="Coming soon"
                      >
                        {i.label}
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/50">
                          soon
                        </span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={i.label}>
                    {i.external ? (
                      <a
                        href={i.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="hover:text-white"
                      >
                        {i.label}
                      </a>
                    ) : (
                      <Link href={i.href} className="hover:text-white">
                        {i.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/5 pt-8 text-xs text-white/40 md:flex-row">
        <span>Built on Igra · Secured by Kaspa · © 2026 INS Labs</span>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-white">About</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
