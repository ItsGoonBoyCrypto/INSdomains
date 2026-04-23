import Link from "next/link";
import { RooftopMark } from "./RooftopMark";

const COLS = [
  {
    title: "Product",
    items: [
      { label: "App", href: "/app" },
      { label: "My Domains", href: "/domains" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Docs", href: "/docs" },
    ],
  },
  {
    title: "Community",
    items: [
      { label: "X / Twitter", href: "https://x.com/GoonBoyCrypto" },
      { label: "Telegram", href: "https://t.me/klaudeonkas" },
      { label: "GitHub", href: "https://github.com/ItsGoonBoyCrypto" },
      { label: "DAO", href: "/dao" },
    ],
  },
  {
    title: "Ecosystem",
    items: [
      { label: "iForge", href: "https://igraforge.xyz" },
      { label: "AlphaPrism", href: "https://alphaprism.it.com" },
      { label: "KasInvest", href: "https://kasinvest.org" },
      { label: "Klaude", href: "https://klaudeonkas.xyz" },
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
            The permanent name service for the Igra Network. Built on Kaspa BlockDAG.
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
              {col.items.map((i) => (
                <li key={i.label}>
                  <Link href={i.href} className="hover:text-white">
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/5 pt-8 text-xs text-white/40 md:flex-row">
        <span>Built on Igra · Secured by Kaspa · © 2026 INS Labs</span>
        <div className="flex items-center gap-4">
          <Link href="/docs" className="hover:text-white">Docs</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
