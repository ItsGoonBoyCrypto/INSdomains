"use client";

import Link from "next/link";
import { Tag, TrendingUp, Flame, Clock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const LISTINGS = [
  { label: "alice", price: 420, seller: "0x71C4…f3a2", rarity: "5-letter" },
  { label: "vitalik", price: 10000, seller: "0x980D…cBBd", rarity: "celebrity" },
  { label: "kaspa", price: 25000, seller: "0xA55E…6506", rarity: "protocol" },
  { label: "satoshi", price: 50000, seller: "0x3B9d…51c7", rarity: "legend" },
  { label: "igra", price: 15000, seller: "0xFDb2…Deac", rarity: "protocol" },
  { label: "zealous", price: 2200, seller: "0x6fe3…6074", rarity: "dex" },
  { label: "rooftop", price: 888, seller: "0x56f2…5AC7", rarity: "unique" },
  { label: "goonboy", price: 1337, seller: "0x71C4…f3a2", rarity: "legend" },
];

export default function MarketplacePage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 pt-16 pb-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
              INS <span className="ins-gradient-text">Marketplace</span>
            </h1>
            <p className="mt-2 text-white/60">
              Secondary market for .ins names. Settle in iKAS on Igra L2.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-white/50">
            <Tag className="h-4 w-4" /> {LISTINGS.length} active listings
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill icon={<Flame className="h-4 w-4" />} label="Floor" value="420 iKAS" tint="cyan" />
          <StatPill icon={<TrendingUp className="h-4 w-4" />} label="24h Vol" value="12,400 iKAS" tint="plum" />
          <StatPill icon={<Clock className="h-4 w-4" />} label="Last Sale" value="888 iKAS" tint="cyan" />
          <StatPill icon={<Tag className="h-4 w-4" />} label="Unique Owners" value="8,912" tint="plum" />
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LISTINGS.map((l) => (
            <Listing key={l.label} {...l} />
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatPill({
  icon, label, value, tint,
}: { icon: React.ReactNode; label: string; value: string; tint: "cyan" | "plum" }) {
  const bg = tint === "cyan" ? "bg-cyan/10 text-cyan" : "bg-plum/10 text-plum";
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${bg}`}>
        {icon} {label}
      </div>
      <div className="mt-2 text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function Listing({
  label, price, seller, rarity,
}: { label: string; price: number; seller: string; rarity: string }) {
  return (
    <Link
      href={`/app?q=${label}`}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:-translate-y-0.5 hover:border-cyan/30"
    >
      <div className="flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br from-cyan/20 via-plum/10 to-plum/30">
        <span className="text-4xl font-black text-white drop-shadow-[0_2px_20px_rgba(0,240,255,0.5)]">
          {label[0]?.toUpperCase()}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-base font-bold">
            <span className="ins-gradient-text">{label}</span>
            <span className="text-white/30">.ins</span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-white/40">{rarity}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-white">{price.toLocaleString()} iKAS</div>
          <div className="text-[10px] font-mono text-white/40">{seller}</div>
        </div>
      </div>
    </Link>
  );
}
