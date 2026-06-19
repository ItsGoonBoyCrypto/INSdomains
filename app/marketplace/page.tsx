"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { formatEther } from "viem";
import {
  Tag, Hammer, Sparkles, ArrowRight,
  Loader2, Star, Clock, ExternalLink, ShoppingCart, Check,
  Search, X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { shortAddr, displayLabel, prepareForContract } from "@/lib/names";
import { explorerAddr } from "@/lib/igra-chain";
import {
  REGISTRY_ABI,
  REGISTRY_V2_ABI,
  REGISTRY_V2_ADDRESS,
  MARKETPLACE_ABI,
  MARKETPLACE_V2_ADDRESS,
  REGISTRY_ADDRESSES, MARKETPLACE_ADDRESSES,
  isV2Deployed,
  TLDS, LIVE_TLDS, isTldLive, tldSuffix,
  type Tld,
} from "@/lib/contracts";
import type { Address } from "viem";

const ANY_TLD_LIVE = LIVE_TLDS.length > 0;

type RegistryVersion = "v1" | "v2";

type ActiveListing = {
  tld: Tld;
  tokenId: bigint;
  label: string;
  seller: `0x${string}`;
  price: bigint;
  expiry: bigint;
  featured: boolean;
  /** Which registry the NFT belongs to (V1 legacy or V2 canonical). */
  registryVersion: RegistryVersion;
  /** Marketplace contract that holds this listing — must match the
   *  registry version since each marketplace is bound to one Registry
   *  via an immutable IERC721Min constructor arg. */
  marketplace: Address;
};

export default function MarketplacePage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 pt-16 pb-24">
        {ANY_TLD_LIVE ? <Browse /> : <ComingSoon />}
      </main>
      <Footer />
    </>
  );
}

/* ─────────────────────────── LIVE BROWSE ─────────────────────────── */

function Browse() {
  const listings = useActiveListings();
  // V2 is the canonical post-launch marketplace; saleFeeBps is identical to
  // V1 (2% by design) so the V2 banner read is the source of truth.
  const v2Live = isV2Deployed();
  const { data: saleFeeBps } = useReadContract({
    address: v2Live ? MARKETPLACE_V2_ADDRESS : MARKETPLACE_ADDRESSES[LIVE_TLDS[0] ?? "igra"],
    abi: MARKETPLACE_ABI,
    functionName: "saleFeeBps",
    query: { enabled: LIVE_TLDS.length > 0 },
  });
  // Pause is per-marketplace. Build a map keyed by marketplace ADDRESS
  // (not TLD) so the V1 marketplace and V2 marketplace can each be paused
  // independently. Each ListingCard looks itself up via listing.marketplace.
  const pausedReads = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: [
      ...LIVE_TLDS.map((tld) => ({
        address: MARKETPLACE_ADDRESSES[tld],
        abi: MARKETPLACE_ABI,
        functionName: "paused",
      })),
      ...(v2Live
        ? [{ address: MARKETPLACE_V2_ADDRESS, abi: MARKETPLACE_ABI, functionName: "paused" }]
        : []),
    ] as any,
    query: { enabled: LIVE_TLDS.length > 0 },
  });
  const pausedByMarketplace: Record<string, boolean> = {};
  LIVE_TLDS.forEach((tld, i) => {
    const r = pausedReads.data?.[i];
    if (r?.status === "success") pausedByMarketplace[MARKETPLACE_ADDRESSES[tld].toLowerCase()] = r.result === true;
  });
  if (v2Live) {
    const r = pausedReads.data?.[LIVE_TLDS.length];
    if (r?.status === "success") pausedByMarketplace[MARKETPLACE_V2_ADDRESS.toLowerCase()] = r.result === true;
  }
  const pausedMarketplaces = Object.entries(pausedByMarketplace)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const anyPaused = pausedMarketplaces.length > 0;

  // ─ Filter + sort state (2026-05-29) ─
  const [query, setQuery] = useState("");
  const [lengthBucket, setLengthBucket] = useState<"all" | "1" | "2" | "3" | "4" | "5+">("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "priceAsc" | "priceDesc" | "nameAsc" | "lengthAsc">("default");

  const anyFilterActive =
    query.trim() !== "" || lengthBucket !== "all" || minPrice !== "" || maxPrice !== "" || sortBy !== "default";

  const resetFilters = () => {
    setQuery(""); setLengthBucket("all"); setMinPrice(""); setMaxPrice(""); setSortBy("default");
  };

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    const parseIkasToWei = (raw: string): bigint | null => {
      if (!raw) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return null;
      // n is iKAS; multiply by 1e18 to get wei. Use string concat to avoid f64 precision loss for large values.
      const [intPart, fracPart = ""] = String(n).split(".");
      const frac = (fracPart + "000000000000000000").slice(0, 18);
      return BigInt(intPart + frac);
    };
    const min = parseIkasToWei(minPrice);
    const max = parseIkasToWei(maxPrice);

    // Emoji-aware query: if the user typed an emoji or pre-encoded xn--, we
    // canonicalize to the contract label before matching. Falls back to
    // substring on the raw input so plain ASCII partial matches still work.
    let qContract = q;
    if (q) {
      try {
        qContract = prepareForContract(q).toLowerCase();
      } catch {
        qContract = q;
      }
    }
    const filtered = listings.list.filter((l) => {
      if (q) {
        const labelLower = l.label.toLowerCase();
        const displayLower = displayLabel(l.label).toLowerCase();
        if (!labelLower.includes(qContract) && !displayLower.includes(q)) return false;
      }
      if (lengthBucket !== "all") {
        const len = l.label.length;
        if (lengthBucket === "5+") { if (len < 5) return false; }
        else if (len !== Number(lengthBucket)) return false;
      }
      if (min !== null && l.price < min) return false;
      if (max !== null && l.price > max) return false;
      return true;
    });

    const cmpUser = (a: ActiveListing, b: ActiveListing): number => {
      switch (sortBy) {
        case "priceAsc":  return a.price < b.price ? -1 : a.price > b.price ? 1 : 0;
        case "priceDesc": return a.price > b.price ? -1 : a.price < b.price ? 1 : 0;
        case "nameAsc":   return a.label.localeCompare(b.label);
        case "lengthAsc": return a.label.length - b.label.length;
        default:          return a.price < b.price ? -1 : a.price > b.price ? 1 : 0;
      }
    };
    // Featured always lead within their group (paid placement); user sort applies within each group.
    filtered.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return cmpUser(a, b);
    });
    return filtered;
  }, [listings.list, query, lengthBucket, minPrice, maxPrice, sortBy]);

  const featured = filteredList.filter((l) => l.featured);
  const regular = filteredList.filter((l) => !l.featured);

  return (
    <>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
              anyPaused
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${
                  anyPaused ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                  anyPaused ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
            </span>
            {anyPaused ? `${pausedMarketplaces.length} marketplace${pausedMarketplaces.length === 1 ? "" : "s"} paused` : "Live on Igra mainnet"}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            INS <span className="ins-gradient-text">Marketplace</span>
          </h1>
          <p className="mt-2 text-sm text-white/60">
            {listings.loading
              ? "Loading listings from Igra…"
              : `${listings.list.length} name${listings.list.length === 1 ? "" : "s"} listed`}
            <span className="mx-2 text-white/30">·</span>
            <span>
              {saleFeeBps !== undefined
                ? `${Number(saleFeeBps) / 100}% seller fee`
                : "2% seller fee"}
              {" "}· 0% buyer fee
            </span>
          </p>
        </div>
        <Link href="/domains" className="btn-primary self-start sm:self-auto">
          <Tag className="mr-1 inline h-4 w-4" /> List a name
        </Link>
      </header>

      {listings.loading && (
        <div className="mt-12 flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading listings…
        </div>
      )}

      {!listings.loading && listings.list.length > 0 && (
        <FilterBar
          query={query} setQuery={setQuery}
          lengthBucket={lengthBucket} setLengthBucket={setLengthBucket}
          minPrice={minPrice} setMinPrice={setMinPrice}
          maxPrice={maxPrice} setMaxPrice={setMaxPrice}
          sortBy={sortBy} setSortBy={setSortBy}
          onReset={resetFilters}
          anyActive={anyFilterActive}
          totalCount={listings.list.length}
          matchCount={filteredList.length}
        />
      )}

      {!listings.loading && listings.list.length > 0 && filteredList.length === 0 && anyFilterActive && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <h2 className="text-base font-bold text-white/80">No matches</h2>
          <p className="mt-1 text-xs text-white/55">Try widening the price range or clearing a filter.</p>
          <button onClick={resetFilters} className="mt-4 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 transition hover:border-cyan/30 hover:text-cyan">
            <X className="h-3 w-3" /> Reset filters
          </button>
        </div>
      )}

      {!listings.loading && listings.list.length === 0 && (
        <div className="mt-12 rounded-3xl border border-white/10 bg-white/[0.02] p-14 text-center">
          <h2 className="text-lg font-bold">No names listed yet</h2>
          <p className="mt-2 text-sm text-white/60">
            Be the first to list — head to your domains and put one up for sale.
          </p>
          <Link href="/domains" className="btn-primary mt-5 inline-flex">
            <Tag className="mr-1 inline h-4 w-4" /> Go to my domains
          </Link>
        </div>
      )}

      {/* ── Featured hero ──
           Always visible (with empty state) so featuring is THE primary
           call-to-action when discovering names. We want sellers to feature
           and buyers to scroll featured first. Hidden when filters are
           active AND match nothing (handled by the no-matches block above). */}
      {!listings.loading && filteredList.length > 0 && (
        <section className="mt-10">
          <FeaturedHero
            featured={featured}
            onBought={listings.refetch}
            pausedByMarketplace={pausedByMarketplace}
          />
        </section>
      )}

      {regular.length > 0 && (
        <section className="mt-14">
          <SectionHeader
            icon={<Tag className="h-4 w-4 text-white/60" />}
            title="All listings"
            subtitle={featured.length > 0 ? "Browse everything else" : undefined}
          />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {regular.map((l) => (
              <ListingCard key={`${l.registryVersion}-${l.tokenId.toString()}`} listing={l} onBought={listings.refetch} paused={Boolean(pausedByMarketplace[l.marketplace.toLowerCase()])} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ─── Featured hero ───
   Pinned at the top of the marketplace as the primary discovery surface.
   Featured listings render in a 2-column grid (vs 3-col below) so each
   tile is visually larger; cyan glow border, "Star" pill, and a "promote
   yours" CTA in the header drive sellers toward the upgrade. */
/* ── Filter bar (added 2026-05-29) ───────────────────────── */
function FilterBar(props: {
  query: string;
  setQuery: (s: string) => void;
  lengthBucket: "all" | "1" | "2" | "3" | "4" | "5+";
  setLengthBucket: (b: "all" | "1" | "2" | "3" | "4" | "5+") => void;
  minPrice: string;
  setMinPrice: (s: string) => void;
  maxPrice: string;
  setMaxPrice: (s: string) => void;
  sortBy: "default" | "priceAsc" | "priceDesc" | "nameAsc" | "lengthAsc";
  setSortBy: (s: "default" | "priceAsc" | "priceDesc" | "nameAsc" | "lengthAsc") => void;
  onReset: () => void;
  anyActive: boolean;
  totalCount: number;
  matchCount: number;
}) {
  const {
    query, setQuery, lengthBucket, setLengthBucket,
    minPrice, setMinPrice, maxPrice, setMaxPrice,
    sortBy, setSortBy, onReset, anyActive, totalCount, matchCount,
  } = props;
  const numOnly = (v: string) => v.replace(/[^0-9.]/g, "");

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <Search className="h-4 w-4 flex-none text-white/45" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 bg-transparent text-sm placeholder:text-white/35 focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Length tier */}
        <select
          value={lengthBucket}
          onChange={(e) => setLengthBucket(e.target.value as "all" | "1" | "2" | "3" | "4" | "5+")}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/85 focus:border-cyan/40 focus:outline-none"
          title="Length tier"
        >
          <option value="all">All lengths</option>
          <option value="1">1-char · Ultra-Premium</option>
          <option value="2">2-char · Premium</option>
          <option value="3">3-char · Rare</option>
          <option value="4">4-char · Uncommon</option>
          <option value="5+">5+ char · Standard</option>
        </select>

        {/* Price range */}
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm">
          <input
            value={minPrice}
            onChange={(e) => setMinPrice(numOnly(e.target.value))}
            placeholder="min"
            inputMode="decimal"
            className="w-14 bg-transparent text-right placeholder:text-white/35 focus:outline-none"
          />
          <span className="text-white/30">–</span>
          <input
            value={maxPrice}
            onChange={(e) => setMaxPrice(numOnly(e.target.value))}
            placeholder="max"
            inputMode="decimal"
            className="w-14 bg-transparent placeholder:text-white/35 focus:outline-none"
          />
          <span className="text-[11px] text-white/40">iKAS</span>
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "default" | "priceAsc" | "priceDesc" | "nameAsc" | "lengthAsc")}
          className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/85 focus:border-cyan/40 focus:outline-none"
          title="Sort order"
        >
          <option value="default">Sort: Default</option>
          <option value="priceAsc">Price ↑</option>
          <option value="priceDesc">Price ↓</option>
          <option value="nameAsc">Name A–Z</option>
          <option value="lengthAsc">Length ↑</option>
        </select>

        {/* Reset */}
        {anyActive && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/65 transition hover:border-red-500/30 hover:text-red-300"
          >
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {anyActive && (
        <div className="mt-2 text-[11px] text-white/50">
          Showing <span className="text-white/80">{matchCount}</span> of {totalCount}
        </div>
      )}
    </div>
  );
}

function FeaturedHero({
  featured, onBought, pausedByMarketplace,
}: {
  featured: ActiveListing[];
  onBought: () => void;
  pausedByMarketplace: Record<string, boolean>;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-cyan/30 bg-gradient-to-br from-cyan/[0.06] via-transparent to-plum/[0.04] p-6 shadow-[0_0_60px_rgba(0,240,255,0.08)] sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan/40 bg-cyan/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
            <Star className="h-3 w-3 fill-cyan" /> Featured
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">
            Top names on the market
          </h2>
          <p className="mt-1.5 text-sm text-white/55">
            Promoted listings get top placement, a glow border, and the Featured
            badge — pay just <span className="text-cyan font-semibold">1% upfront</span>{" "}
            on top of the regular 2% sale fee.
          </p>
        </div>
        <Link
          href="/domains"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan/40 bg-cyan/15 px-4 py-2.5 text-sm font-bold text-cyan transition hover:border-cyan/70 hover:bg-cyan/25 hover:text-white"
        >
          <Star className="h-4 w-4" /> Feature your listing
        </Link>
      </div>

      {featured.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/20 p-10 text-center">
          <Star className="mx-auto h-8 w-8 text-cyan/60" />
          <h3 className="mt-3 text-base font-bold text-white">
            No featured listings yet — be the first
          </h3>
          <p className="mx-auto mt-2 max-w-md text-xs text-white/55">
            Featuring takes a 1% upfront fee in iKAS. Your name jumps to the top
            of the marketplace and shows a glow border + ⭐ badge until it sells
            or expires.
          </p>
          <Link
            href="/domains"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-ins-gradient px-5 py-2.5 text-sm font-black text-black transition hover:brightness-110"
          >
            <Tag className="h-4 w-4" /> Go to my domains
          </Link>
        </div>
      ) : (
        // 2-col grid (vs 3-col regular) so featured cards are physically
        // larger and visually dominate the fold.
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {featured.map((l) => (
            <ListingCard
              key={`${l.registryVersion}-${l.tokenId.toString()}`}
              listing={l}
              onBought={onBought}
              paused={Boolean(pausedByMarketplace[l.marketplace.toLowerCase()])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon, title, subtitle,
}: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        {icon}
      </div>
      <div>
        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">{title}</h2>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
    </div>
  );
}

function ListingCard({
  listing, onBought, paused,
}: { listing: ActiveListing; onBought?: () => void; paused?: boolean }) {
  const { address, isConnected } = useAccount();
  const [txError, setTxError] = useState<string | null>(null);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed && onBought) onBought();
  }, [isConfirmed, onBought]);

  const onBuy = () => {
    setTxError(null);
    writeContract(
      {
        // Buy MUST go to the marketplace that holds the listing — V1 and V2
        // each have their own immutable Registry binding, listings can't
        // cross. listing.marketplace is set per-entry in useActiveListings.
        address: listing.marketplace,
        abi: MARKETPLACE_ABI,
        functionName: "buyListing",
        args: [listing.tokenId],
        value: listing.price,
      },
      {
        onError: (e) => {
          setTxError(e.message.split("\n")[0] || "Tx failed");
          // H2 fix — if the seller updated the price or cancelled in the
          // interim, the cached price is stale. Refetch so the card shows
          // the current state instead of silently letting the buyer retry
          // at a bad value.
          if (onBought) onBought();
        },
      },
    );
  };

  const busy = isPending || isConfirming;
  const isSelf =
    isConnected && address && listing.seller.toLowerCase() === address.toLowerCase();

  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = Number(listing.expiry) - now;
  const timeLeft = formatTimeLeft(secondsLeft);

  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border p-6 transition ${
        listing.featured
          ? "border-cyan/40 bg-gradient-to-br from-cyan/[0.06] to-transparent hover:border-cyan/70"
          : "border-white/[0.08] bg-white/[0.03] hover:border-cyan/30"
      }`}
    >
      {listing.featured && (
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan/15 blur-3xl" />
      )}

      <div className="relative flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ins-gradient text-xl font-black text-black">
          {listing.label[0]?.toUpperCase() ?? "?"}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {listing.featured && (
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan">
              <Star className="h-3 w-3 fill-cyan" /> Featured
            </span>
          )}
          <span
            title={`Registry for ${tldSuffix(listing.tld)}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              listing.tld === "ins"  ? "border-cyan/30 bg-cyan/10 text-cyan" :
              listing.tld === "igra" ? "border-plum/30 bg-plum/10 text-plum" :
                                       "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {tldSuffix(listing.tld)}
          </span>
          <span
            title={listing.registryVersion === "v2"
              ? `V2 Registry · token #${listing.tokenId.toString()}`
              : `V1 Registry (legacy) · token #${listing.tokenId.toString()}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
              listing.registryVersion === "v2"
                ? "border-cyan/40 bg-cyan/10 text-cyan"
                : "border-white/15 bg-white/[0.04] text-white/55"
            }`}
          >
            {listing.registryVersion === "v2" ? "V2" : "V1"} #{listing.tokenId.toString()}
          </span>
        </div>
      </div>

      <h3 className="relative mt-5 text-2xl font-bold">
        <span className="ins-gradient-text">{displayLabel(listing.label)}</span>
        <span className={`${
          listing.tld === "ins"  ? "text-cyan/50" :
          listing.tld === "igra" ? "text-plum/50" :
                                   "text-emerald-300/50"
        }`}>{tldSuffix(listing.tld)}</span>
      </h3>

      <div className="relative mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tight">{formatPrice(listing.price)}</span>
        <span className="text-sm font-semibold text-white/60">iKAS</span>
      </div>

      <div className="relative mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/50">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {timeLeft}
        </span>
        <a
          href={explorerAddr(listing.seller)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-mono underline decoration-dotted hover:text-white"
        >
          seller {shortAddr(listing.seller)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="relative mt-5">
        {!isConnected ? (
          <div className="flex items-center justify-center">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/80 transition hover:border-cyan/40 hover:bg-cyan/10 hover:text-white"
                >
                  Connect to buy
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        ) : isSelf ? (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-semibold text-white/40"
            title="This is your listing"
          >
            Your listing
          </button>
        ) : paused ? (
          <button
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200"
            title="Trading paused by admin"
          >
            Trading paused
          </button>
        ) : (
          <button
            onClick={onBuy}
            disabled={busy || isConfirmed}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ins-gradient px-4 py-2.5 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Buying…</>
            ) : isConfirmed ? (
              <><Check className="h-4 w-4" /> Bought</>
            ) : (
              <><ShoppingCart className="h-4 w-4" /> Buy for {formatPrice(listing.price)} iKAS</>
            )}
          </button>
        )}
        {txError && (
          <button
            onClick={() => { reset(); setTxError(null); }}
            className="mt-2 block w-full text-left text-[10px] text-red-300 hover:text-red-200"
            title={txError}
          >
            {txError} — dismiss
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── DATA HOOK ─────────────────────────── */

/** Per-grid-entry metadata used for both the listing read and the label
 *  read. Each entry owns its own (registry + marketplace + ABI) trio so
 *  V1 entries hit V1 contracts and V2 entries hit V2 contracts — they
 *  can NEVER cross because each marketplace is `IERC721Min immutable` to
 *  exactly one Registry on chain. */
type GridEntry = {
  tld: Tld;
  tokenId: bigint;
  registryVersion: RegistryVersion;
  registry: Address;
  marketplace: Address;
};

function useActiveListings() {
  // 1. totalSupply on every live Registry (V1 .igra/.ins/.ikas) PLUS V2 .igra
  //    in parallel. V2 is the canonical post-launch source; V1 stays in the
  //    union so legacy listings (any V1 .igra NFT being sold pre-migration)
  //    keep showing on /marketplace.
  const v2Live = isV2Deployed();
  const supplyReads = useReadContracts({
    // Cast escapes wagmi's deep ABI inference (TS2589 on V2 ABI). The
    // runtime shape is identical — each totalSupply returns bigint.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: [
      ...LIVE_TLDS.map((tld) => ({
        address: REGISTRY_ADDRESSES[tld],
        abi: REGISTRY_ABI,
        functionName: "totalSupply",
      })),
      ...(v2Live
        ? [{
            address: REGISTRY_V2_ADDRESS,
            abi: REGISTRY_V2_ABI,
            functionName: "totalSupply",
          }]
        : []),
    ] as any,
    query: { enabled: ANY_TLD_LIVE },
  });

  const v1SupplyByTld: Record<Tld, number> = { ins: 0, igra: 0, ikas: 0 };
  LIVE_TLDS.forEach((tld, i) => {
    const r = supplyReads.data?.[i];
    if (r?.status === "success") v1SupplyByTld[tld] = Number(r.result as bigint);
  });
  const v2Supply: number = v2Live
    ? Number(((supplyReads.data?.[LIVE_TLDS.length]?.result as bigint | undefined) ?? 0n))
    : 0;

  // 2. Build (registryVersion, tld, tokenId) grid so we can batch
  //    getActiveListing across both V1 marketplaces AND the V2 marketplace.
  const grid: GridEntry[] = useMemo(() => {
    const g: GridEntry[] = [];
    // V1 entries (per LIVE_TLD)
    for (const tld of LIVE_TLDS) {
      for (let i = 1; i <= v1SupplyByTld[tld]; i++) {
        g.push({
          tld,
          tokenId: BigInt(i),
          registryVersion: "v1",
          registry: REGISTRY_ADDRESSES[tld],
          marketplace: MARKETPLACE_ADDRESSES[tld],
        });
      }
    }
    // V2 entries (only .igra has a V2 deploy)
    if (v2Live) {
      for (let i = 1; i <= v2Supply; i++) {
        g.push({
          tld: "igra",
          tokenId: BigInt(i),
          registryVersion: "v2",
          registry: REGISTRY_V2_ADDRESS,
          marketplace: MARKETPLACE_V2_ADDRESS,
        });
      }
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v1SupplyByTld.ins, v1SupplyByTld.igra, v1SupplyByTld.ikas, v2Supply, v2Live]);

  const { data: listingData, isLoading: listingLoading, refetch: refetchListings } =
    useReadContracts({
      contracts: grid.map((e) => ({
        address: e.marketplace,
        abi: MARKETPLACE_ABI,
        functionName: "getActiveListing",
        args: [e.tokenId],
      } as const)),
      query: { enabled: grid.length > 0 },
    });

  // 3. Filter to active listings, then route labelOf to the entry's own
  //    Registry (V1 or V2). V2 ABI is a strict superset of V1 for labelOf,
  //    but using the matching ABI keeps the type contract honest.
  const activePositions = useMemo(() => {
    if (!listingData) return [] as Array<{ gridIdx: number; entry: GridEntry }>;
    const out: Array<{ gridIdx: number; entry: GridEntry }> = [];
    for (let i = 0; i < grid.length; i++) {
      const l = listingData[i]?.result as { active: boolean } | undefined;
      if (l?.active) out.push({ gridIdx: i, entry: grid[i] });
    }
    return out;
  }, [listingData, grid]);

  const { data: labelData, isLoading: labelLoading, refetch: refetchLabels } =
    useReadContracts({
      // Cast for the same TS2589 reason as the supply reads above.
      contracts: activePositions.map(({ entry }) => ({
        address: entry.registry,
        abi: entry.registryVersion === "v2" ? REGISTRY_V2_ABI : REGISTRY_ABI,
        functionName: "labelOf",
        args: [entry.tokenId],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any,
      query: { enabled: activePositions.length > 0 },
    });

  const list: ActiveListing[] = useMemo(() => {
    if (!listingData) return [];
    const out: ActiveListing[] = [];
    for (let a = 0; a < activePositions.length; a++) {
      const pos = activePositions[a];
      const l = listingData[pos.gridIdx]?.result as
        | {
            seller: `0x${string}`;
            expiry: bigint;
            featured: boolean;
            active: boolean;
            price: bigint;
          }
        | undefined;
      if (!l?.active) continue;
      const label = (labelData?.[a]?.result as string | undefined) ?? "";
      out.push({
        tld: pos.entry.tld,
        tokenId: pos.entry.tokenId,
        label,
        seller: l.seller,
        price: l.price,
        expiry: l.expiry,
        featured: l.featured,
        registryVersion: pos.entry.registryVersion,
        marketplace: pos.entry.marketplace,
      });
    }
    return out.sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.price < b.price ? -1 : a.price > b.price ? 1 : 0;
    });
  }, [listingData, labelData, activePositions]);

  return {
    list,
    loading: supplyReads.isLoading || listingLoading || labelLoading,
    refetch: () => {
      supplyReads.refetch();
      refetchListings();
      refetchLabels();
    },
  };
}

/* ─────────────────────────── UTILS ─────────────────────────── */

function formatPrice(wei: bigint): string {
  const eth = Number(formatEther(wei));
  if (eth >= 1000) return eth.toLocaleString("en", { maximumFractionDigits: 0 });
  if (eth >= 10) return eth.toLocaleString("en", { maximumFractionDigits: 2 });
  if (eth >= 1) return eth.toLocaleString("en", { maximumFractionDigits: 3 });
  return eth.toLocaleString("en", { maximumFractionDigits: 5 });
}

function formatTimeLeft(seconds: number): string {
  if (seconds <= 0) return "expired";
  const d = Math.floor(seconds / 86400);
  if (d >= 1) return `${d}d left`;
  const h = Math.floor(seconds / 3600);
  if (h >= 1) return `${h}h left`;
  const m = Math.max(1, Math.floor(seconds / 60));
  return `${m}m left`;
}

/* ─────────────────────────── COMING SOON (fallback) ─────────────────────────── */

function ComingSoon() {
  return (
    <>
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
            Trustless secondary market for INS names (.ins / .igra / .ikas) — settle in iKAS on Igra L2.
            Contract is deployed; we&rsquo;re wiring up the browse UI now.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Pillar
              title="Zero-custody listings"
              body="Names stay in your wallet until sale. Approve once, list as many names as you want."
            />
            <Pillar
              title="2% seller fee"
              body="Seller pays 2% on sale; buyer pays 0%. No creator royalties, no hidden cuts."
            />
            <Pillar
              title="1% featured boost"
              body="Optional upfront 1% to promote a listing to the Featured section. Non-refundable."
            />
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/app" className="btn-primary">
              <Sparkles className="mr-1 inline h-4 w-4" /> Register a name <ArrowRight className="ml-1 inline h-4 w-4" />
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
