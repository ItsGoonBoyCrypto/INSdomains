"use client";

import Link from "next/link";
import { Tag, Hammer, Sparkles, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function MarketplacePage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-5xl px-6 pt-20 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan/[0.08] via-transparent to-plum/[0.08] p-10 sm:p-14">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-cyan/20 blur-[120px]" />
          <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-plum/20 blur-[120px]" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1 text-xs font-medium text-cyan">
              <Hammer className="h-3.5 w-3.5" /> Coming Soon
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">
              INS <span className="ins-gradient-text">Marketplace</span>
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-white/70">
              Trustless secondary market for .ins names — settle in iKAS on Igra L2.
              Since every .ins is a standard ERC-721, your names are already tradable on any
              Igra-compatible marketplace today. Our native venue is under construction.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <Pillar
                title="Fixed-price + auctions"
                body="List for a set price or run a timed Dutch/English auction. Offers supported either way."
              />
              <Pillar
                title="Zero-custody escrow"
                body="Names stay in your wallet until sale — no approvals to third-party custodians."
              />
              <Pillar
                title="On-chain fee split"
                body="A small marketplace fee on every trade funds the INS treasury. Seller + royalty flows baked in."
              />
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/app"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan to-plum px-5 py-3 text-sm font-bold text-black transition hover:brightness-110"
              >
                <Sparkles className="h-4 w-4" /> Register a name now
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/domains"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Tag className="h-4 w-4" /> My domains
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <InfoCard
            title="Want to trade today?"
            body="Every .ins name is an ERC-721 NFT. You can list, sell, or gift it through any Igra-compatible NFT marketplace, or transfer directly wallet-to-wallet from /domains."
          />
          <InfoCard
            title="Want to be notified when we launch?"
            body="Follow the project on X — we'll announce mainnet marketplace deployment and the fee schedule there. All listings will be on-chain and auditable."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}

function Pillar({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-bold text-white">{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="text-base font-bold text-white">{title}</div>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  );
}
