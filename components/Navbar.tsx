"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ShieldCheck, Sparkles } from "lucide-react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { RooftopMark } from "./RooftopMark";
import { isAdmin } from "@/lib/admin";

const NAV_LINKS = [
  { label: "App", href: "/app" },
  { label: "My Domains", href: "/domains" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
];

/** Highlighted launch CTA — points at the public snap install page. */
function AddToMetaMaskCTA({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/snap"
      onClick={onClick}
      className="group relative inline-flex items-center gap-1.5 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 text-xs font-semibold text-cyan transition hover:bg-cyan/20 hover:shadow-[0_0_20px_rgba(0,240,255,0.35)]"
    >
      <span aria-hidden className="text-sm leading-none">🦊</span>
      <span>Add to MetaMask</span>
      <span className="ml-1 inline-flex items-center gap-0.5 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
        <Sparkles className="h-2.5 w-2.5" />
        New
      </span>
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { address } = useAccount();
  const showAdmin = isAdmin(address ?? null);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl">
      <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <RooftopMark />
          <span className="ins-gradient-text text-xl font-black tracking-tight">
            INS
          </span>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-medium text-white/70 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group relative transition hover:text-white"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-cyan transition-all group-hover:w-full" />
            </Link>
          ))}
          <AddToMetaMaskCTA />
          {showAdmin && (
            <Link
              href="/admin"
              className="group relative inline-flex items-center gap-1.5 rounded-full border border-plum/40 bg-plum/10 px-3 py-1 text-xs font-semibold text-plum transition hover:bg-plum/20"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          <NetworkBadge />
          <div className="hidden md:block">
            <ConnectButton
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
              chainStatus="none"
              showBalance={false}
            />
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden rounded-lg border border-white/10 bg-white/5 p-2"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-white/5 bg-black/90 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-6 py-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-3 text-base font-medium text-white/80 hover:bg-white/5 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/snap"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-3 text-base font-semibold text-cyan hover:bg-cyan/20"
            >
              <span aria-hidden>🦊</span>
              <span>Add to MetaMask</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                <Sparkles className="h-2.5 w-2.5" />
                New
              </span>
            </Link>
            {showAdmin && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-3 text-base font-medium text-plum hover:bg-plum/10"
                onClick={() => setOpen(false)}
              >
                <ShieldCheck className="mr-2 inline h-4 w-4" />
                Admin
              </Link>
            )}
            <div className="pt-3">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NetworkBadge() {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-xs font-medium text-cyan md:flex">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan" />
      </span>
      Igra Mainnet
    </div>
  );
}
