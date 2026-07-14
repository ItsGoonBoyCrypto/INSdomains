"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, ShoppingBag, TrendingUp, Users,
  Loader2, ArrowUpRight,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { displayLabel, shortAddr } from "@/lib/names";
import { explorerAddr } from "@/lib/igra-chain";

const EXPLORER_TX = "https://explorer.igralabs.com/tx/";

type Sale = {
  token_id: string;
  label: string;
  name: string;
  seller: string;
  buyer: string;
  price_ikas: string;
  fee_ikas: string;
  block: number;
  tx_hash: string;
  timestamp: string;
  registry_version: "v1" | "v2";
};

type SalesResponse = {
  sales: Sale[];
  total: number;
  limit: number;
  offset: number;
};

export default function MarketplaceSalesPage() {
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/marketplace/sales?limit=100");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as SalesResponse;
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setErr((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Aggregates for the header stat row
  const totalVolume = data
    ? data.sales.reduce((sum, s) => sum + parseFloat(s.price_ikas), 0)
    : 0;
  const uniqueBuyers = data
    ? new Set(data.sales.map((s) => s.buyer.toLowerCase())).size
    : 0;
  const topSale = data && data.sales.length
    ? [...data.sales].sort((a, b) => parseFloat(b.price_ikas) - parseFloat(a.price_ikas))[0]
    : null;

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pt-12 pb-24">
        <div className="mb-4 flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-emerald-300/80">
          <ShoppingBag className="h-3.5 w-3.5" /> Marketplace history
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
          .igra sales <span className="text-emerald-300">on chain</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          Every completed sale on the INS marketplace, sourced directly from{" "}
          <code className="font-mono text-emerald-300">ListingSold</code> events on Igra L2.
          Newest first. V1 + V2 unified. Verifiable on-chain — click any row to open the tx.
        </p>

        {/* Aggregates row */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<ShoppingBag className="h-4 w-4 text-emerald-300" />}
            label="Sales all-time"
            value={data ? data.total.toString() : "—"}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4 text-emerald-300" />}
            label="Volume (this page)"
            value={data ? `${totalVolume.toFixed(1)} iKAS` : "—"}
          />
          <StatCard
            icon={<Users className="h-4 w-4 text-emerald-300" />}
            label="Unique buyers"
            value={uniqueBuyers ? uniqueBuyers.toString() : "—"}
          />
        </div>

        {/* Top-sale callout */}
        {topSale && (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300/80">Top sale</div>
              <div className="mt-1 text-lg font-black text-white">
                <span className="text-emerald-300">{displayLabel(topSale.label) || topSale.label}</span>
                <span className="text-white/50">.igra</span>
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-300">
              {parseFloat(topSale.price_ikas).toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              <span className="text-lg text-white/50">iKAS</span>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono uppercase tracking-widest text-white/50">
              <tr>
                <th className="px-4 py-3 font-normal">Name</th>
                <th className="px-4 py-3 font-normal text-right">Price</th>
                <th className="px-4 py-3 font-normal">Buyer</th>
                <th className="px-4 py-3 font-normal">Seller</th>
                <th className="px-4 py-3 font-normal">When</th>
                <th className="px-4 py-3 font-normal text-right">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-white/50">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    <div className="mt-2 text-xs">Scanning on-chain sales…</div>
                  </td>
                </tr>
              )}
              {err && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-red-300">
                    Failed to load sales: {err}
                  </td>
                </tr>
              )}
              {data && !loading && data.sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-white/50">
                    <div className="text-base font-semibold text-white/80">No sales yet.</div>
                    <div className="mt-2 text-xs">
                      When someone buys a listed .igra name, it&apos;ll appear here within a minute.
                    </div>
                    <Link href="/marketplace" className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-300 hover:underline">
                      Browse active listings <ArrowRight />
                    </Link>
                  </td>
                </tr>
              )}
              {data && !loading &&
                data.sales.map((s) => (
                  <tr key={`${s.tx_hash}-${s.token_id}`} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">
                          {displayLabel(s.label) || s.label}
                        </span>
                        <span className="text-white/40">.igra</span>
                        {s.registry_version === "v2" && (
                          <span className="rounded border border-cyan-400/30 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-cyan-300">V2</span>
                        )}
                        {s.registry_version === "v1" && (
                          <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-300">V1</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-emerald-300">
                      {formatPrice(s.price_ikas)}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={explorerAddr(s.buyer)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-white/70 hover:text-cyan-300"
                      >
                        {shortAddr(s.buyer)}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={explorerAddr(s.seller)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-white/70 hover:text-cyan-300"
                      >
                        {shortAddr(s.seller)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      {timeAgo(s.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={EXPLORER_TX + s.tx_hash}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-xs text-white/50 hover:text-emerald-300"
                        title={s.tx_hash}
                      >
                        {s.tx_hash.slice(0, 8)}… <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {data && !loading && data.total > data.sales.length && (
          <div className="mt-4 text-center text-xs text-white/40">
            Showing {data.sales.length} of {data.total} · pagination coming soon
          </div>
        )}

        <div className="mt-10 flex items-center justify-between text-sm">
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Active listings
          </Link>
          <a
            href="https://insdomains.org/api/marketplace/sales"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-mono text-xs text-emerald-300 hover:underline"
          >
            /api/marketplace/sales <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </main>
      <Footer />
    </>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function ArrowRight() {
  return <ArrowUpRight className="h-3 w-3" />;
}

/** Compact iKAS price — one decimal ≥1, up to 3 decimals below. */
function formatPrice(ikas: string): string {
  const n = parseFloat(ikas);
  if (n === 0) return "0";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1)   return n.toFixed(1);
  return n.toFixed(3);
}

/** "2h ago", "3d ago", etc. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!then) return "—";
  const sec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (sec < 60)      return `${sec}s ago`;
  if (sec < 3600)    return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86_400)  return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604_800) return `${Math.floor(sec / 86_400)}d ago`;
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}
