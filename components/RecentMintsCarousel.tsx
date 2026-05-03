"use client";

/**
 * Live carousel of the most recent .igra registrations. Reads from our own
 * public REST API at /api/names/recent (which itself wraps the Registry's
 * Transfer events). Refreshes every 60s — so anyone hitting /about sees
 * live social proof of new mints landing on chain.
 *
 * Each tile is the same NFT card art the activity bot posts to Telegram —
 * served by /api/nft-image/<tokenId>, edge-cached for an hour. So adding
 * this section to /about adds zero meaningful chain RPC load.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://insdomains.org";
const EXPLORER = process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";
const REFRESH_MS = 60_000;

/**
 * Optional allowlist of labels (without TLD) to surface in the carousel.
 * When non-empty, the live API result is filtered down to only these
 * labels — useful for the marketing push when we want a curated shop
 * window (e.g. ecosystem-anchor names + the team's own names) rather
 * than every random mint that lands on chain.
 *
 * Set to an empty array to show the full live feed.
 *
 * Locked 2026-05-03 for the V2 launch push.
 */
const RECENT_MINT_ALLOWLIST: ReadonlySet<string> = new Set([
  "igranetwork",
  "goonboycrypto",
  "goonboy",      // already minted as V2 #2; fallback while goonboycrypto is pending
  "foreverigra",
  "emdin",
  "test1",
]);

type RecentName = {
  tokenId: string;
  label: string;
  name: string;
  owner: string | null;
  target: string | null;
  mintedAt: number;
  blockNumber: string;
  txHash: string;
};

export function RecentMintsCarousel() {
  const [names, setNames] = useState<RecentName[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        // V2-only: V1 is migrate-only post-launch, so the public-facing
        // "Recently registered" carousel only shows V2 mints. Wider limit
        // than we'll display so the curation allowlist has every recent
        // V2 mint to filter against.
        const r = await fetch(`${SITE}/api/names/recent?limit=50&version=v2`, {
          // Browser cache is fine; backend already does s-maxage=30.
          cache: "default",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { names: RecentName[] };
        if (alive) {
          // Apply curation allowlist when set — keeps the carousel
          // focused on ecosystem-anchor names during the launch push.
          const all = data.names ?? [];
          const filtered = RECENT_MINT_ALLOWLIST.size > 0
            ? all.filter((n) => RECENT_MINT_ALLOWLIST.has(n.label.toLowerCase()))
            : all;
          setNames(filtered);
          setError(null);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Loading skeleton (only on first paint — subsequent refreshes are silent)
  if (names === null && !error) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02]">
        <Loader2 className="h-5 w-5 animate-spin text-cyan/60" />
      </div>
    );
  }

  if (error || names === null || names.length === 0) {
    // Silent failure — section just disappears rather than showing an error.
    // We have plenty of other social-proof on the page.
    return null;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan/[0.04] via-transparent to-plum/[0.04] p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Live mints
            </span>
          </div>
          <h3 className="mt-2 text-xl font-bold text-white">
            Recently registered on chain
          </h3>
          <p className="mt-1 text-xs text-white/50">
            Updated every minute · pulled live from{" "}
            <code className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-cyan/80">
              /api/names/recent
            </code>
          </p>
        </div>
        <Link
          href="/marketplace"
          className="hidden text-xs text-white/50 hover:text-cyan sm:block"
        >
          See all →
        </Link>
      </div>

      {/* Horizontal scroll on mobile, grid on wide. Each tile is 200×260
          (200 image + 60 caption). Names fit ~3-4 cols on tablet, 6 on desktop. */}
      <div className="-mx-2 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:pb-0">
        {names.map((n) => (
          <RecentMintTile key={n.tokenId} mint={n} />
        ))}
      </div>
    </div>
  );
}

function RecentMintTile({ mint }: { mint: RecentName }) {
  const ago = relativeTime(mint.mintedAt);
  return (
    <Link
      href={`/app?q=${encodeURIComponent(mint.label)}`}
      className="group relative flex w-[200px] flex-none flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-2 transition hover:-translate-y-0.5 hover:border-cyan/30 hover:bg-white/[0.05] sm:w-[180px]"
      title={`${mint.name} · minted ${ago}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${SITE}/api/nft-image/${mint.tokenId}?size=400`}
        alt={mint.name}
        loading="lazy"
        className="aspect-square w-full rounded-xl object-cover"
      />
      <div className="flex items-baseline justify-between gap-1 px-1">
        <span className="truncate font-mono text-[11px] font-semibold text-white">
          {mint.name}
        </span>
        <span className="flex-none text-[10px] text-white/40">{ago}</span>
      </div>
      {/* Small explorer link — appears on hover. */}
      <a
        href={`${EXPLORER}/tx/${mint.txHash}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 p-1 opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
        title="View tx on Igra explorer"
      >
        <ExternalLink className="h-3 w-3 text-white/70" />
      </a>
    </Link>
  );
}

function relativeTime(unixSec: number): string {
  if (!unixSec) return "";
  const sec = Math.max(1, Math.floor(Date.now() / 1000) - unixSec);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}d`;
  const mo = Math.floor(d / 30);
  return `${mo}mo`;
}
