"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Check, X, ArrowRight, Sparkles, Lock, Gem } from "lucide-react";
import { cleanLabelEmoji, prepareForContract, displayLabel, NameValidationError } from "@/lib/names";
import { mockAvailable, RESERVED_NAMES } from "@/lib/mock-registry";
import { rarityFor, tierLabel, formatPrice } from "@/lib/pricing";

export function HeroSearch() {
  const [raw, setRaw] = useState("");

  const cleaned = useMemo(() => cleanLabelEmoji(raw), [raw]);
  const { contractLabel, valid, display } = useMemo(() => {
    if (!cleaned) return { contractLabel: "", valid: false, display: "" };
    try {
      const c = prepareForContract(cleaned);
      return { contractLabel: c, valid: true, display: displayLabel(c) };
    } catch (e) {
      if (e instanceof NameValidationError) return { contractLabel: "", valid: false, display: cleaned };
      return { contractLabel: "", valid: false, display: cleaned };
    }
  }, [cleaned]);

  const available = useMemo(
    () => (valid ? mockAvailable(contractLabel) : null),
    [valid, contractLabel]
  );
  const rarity = useMemo(
    () => (valid ? rarityFor(contractLabel, RESERVED_NAMES) : null),
    [valid, contractLabel]
  );

  return (
    <div className="mt-12 w-full max-w-2xl">
      <div className="group relative">
        <div className="absolute -inset-px rounded-2xl bg-ins-gradient opacity-0 blur-md transition group-focus-within:opacity-60" />
        <div className="relative flex items-center rounded-2xl border border-white/10 bg-white/[0.04] p-2 pl-5 backdrop-blur-2xl">
          <Search className="h-5 w-5 shrink-0 text-cyan" />
          <input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Search .igra names"
            className="w-full bg-transparent px-3 py-4 text-lg text-white placeholder:text-white/30 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {cleaned.length >= 1 && (
            <div className="mr-2 hidden sm:block">
              <AvailabilityPill available={available} valid={valid} />
            </div>
          )}
          <Link
            href={valid ? `/app?q=${encodeURIComponent(contractLabel)}` : "#"}
            aria-disabled={!valid}
            className={`relative overflow-hidden rounded-xl bg-ins-gradient px-6 py-3 text-sm font-bold text-black transition ${
              valid ? "hover:shadow-glow-mix" : "opacity-40 pointer-events-none"
            }`}
          >
            {available === false ? "View" : "Register"}
            <span className="sr-only">Go</span>
          </Link>
        </div>
      </div>

      {cleaned.length >= 1 && (
        <div className="mt-3 block sm:hidden">
          <AvailabilityPill available={available} valid={valid} />
        </div>
      )}

      {valid && display && display !== contractLabel && (
        <div className="mt-3 text-center text-xs text-white/40">
          will be stored as <span className="text-white/70 font-mono">{contractLabel}.igra</span>
        </div>
      )}

      {/* Reactive rarity + price pill */}
      {valid && rarity && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <RarityChip rarity={rarity} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-white/40">
        <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-1">
          <Sparkles className="h-3 w-3 text-cyan" />
          Tiered pricing · <span className="font-semibold text-cyan">from 50 iKAS/yr</span>
        </span>
        <span>· gas ~$0.0004</span>
        <span className="dot-sep" />
        <Link href="/about" className="underline decoration-dotted underline-offset-2 hover:text-white/70">
          Why forever?
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {(
          [
            { label: "igranetwork", tld: "igra" },
            { label: "insdomains",  tld: "igra" },
            { label: "🔥",          tld: "igra" },
            { label: "💎",          tld: "igra" },
            { label: "🚀",          tld: "igra" },
          ] as const
        ).map((s) => (
          <button
            key={s.label + s.tld}
            type="button"
            onClick={() => setRaw(s.label)}
            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-white/60 transition hover:border-cyan/30 hover:text-white"
          >
            {s.label}<span className="text-plum/80">.{s.tld}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function AvailabilityPill({
  available, valid,
}: { available: boolean | null; valid: boolean }) {
  if (!valid) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
        <X className="h-3 w-3" /> Invalid
      </div>
    );
  }
  if (available === null) return null;
  return available ? (
    <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
      <Check className="h-3 w-3" /> Available
    </div>
  ) : (
    <Link
      href="/marketplace"
      className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300 hover:border-red-500/60"
    >
      <X className="h-3 w-3" /> Taken <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function RarityChip({ rarity }: { rarity: ReturnType<typeof rarityFor> }) {
  const tier = tierLabel(rarity);
  if (rarity.kind === "reserved") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
        <Lock className="h-3 w-3" /> {tier}
      </div>
    );
  }
  if (rarity.kind === "premium") {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-plum/30 bg-plum/10 px-3 py-1 text-xs font-semibold text-plum">
        <Gem className="h-3 w-3" /> {tier} · {formatPrice(rarity.price)}
      </div>
    );
  }
  const tint =
    rarity.bucket <= 2 ? "plum" :
    rarity.bucket === 3 ? "amber" :
    rarity.bucket === 4 ? "cyan" : "emerald";
  const chipClass: Record<string, string> = {
    plum: "border-plum/30 bg-plum/10 text-plum",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
  return (
    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${chipClass[tint]}`}>
      <Sparkles className="h-3 w-3" /> {tier} · {formatPrice(rarity.price)}
    </div>
  );
}
