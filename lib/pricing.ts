/**
 * Tiered pricing for .ins names. Mirrors the on-chain logic in
 * INSRegistry.sol::priceFor so the UI can quote prices instantly
 * before a contract read round-trips.
 */

import { TAKEN_NAMES } from "./mock-registry";

export const TIER_RESERVED = Number.MAX_SAFE_INTEGER;

export const LENGTH_PRICE: Record<number, number> = {
  1: TIER_RESERVED,   // reserved / ecosystem allocation only
  2: 5000,
  3: 500,
  4: 50,
  5: 10,              // 5–32 chars
};

/** Curated premium overrides — these mirror the admin-set on-chain mapping. */
export const PREMIUM_OVERRIDES: Record<string, number> = {
  // (populated from /admin in real deploy; mock seed below)
};

export type Rarity =
  | { kind: "reserved"; label: string; reason: string }
  | { kind: "premium"; label: string; price: number }
  | { kind: "length"; label: string; price: number; bucket: number };

export function priceFor(label: string, reservedSet: Set<string>): number | null {
  const clean = label.toLowerCase();
  if (!clean || clean.length > 32) return null;
  if (reservedSet.has(clean)) return TIER_RESERVED;
  if (PREMIUM_OVERRIDES[clean] !== undefined) return PREMIUM_OVERRIDES[clean];
  const bucket = clean.length >= 5 ? 5 : clean.length;
  return LENGTH_PRICE[bucket] ?? 10;
}

export function rarityFor(label: string, reservedSet: Set<string>): Rarity {
  const clean = label.toLowerCase();
  if (reservedSet.has(clean)) {
    return { kind: "reserved", label: clean, reason: "Reserved by team" };
  }
  if (PREMIUM_OVERRIDES[clean] !== undefined) {
    return { kind: "premium", label: clean, price: PREMIUM_OVERRIDES[clean] };
  }
  const bucket = clean.length >= 5 ? 5 : clean.length;
  const price = LENGTH_PRICE[bucket] ?? 10;
  return { kind: "length", label: clean, price, bucket };
}

export function tierLabel(r: Rarity): string {
  if (r.kind === "reserved") return "Reserved";
  if (r.kind === "premium") return "Premium";
  if (r.bucket === 1) return "1-char · reserved";
  if (r.bucket === 2) return "2-char · ultra-rare";
  if (r.bucket === 3) return "3-char · rare";
  if (r.bucket === 4) return "4-char · uncommon";
  return "Standard";
}

export function tierColor(r: Rarity): "red" | "plum" | "amber" | "cyan" | "emerald" {
  if (r.kind === "reserved") return "red";
  if (r.kind === "premium") return "plum";
  if (r.bucket <= 2) return "plum";
  if (r.bucket === 3) return "amber";
  if (r.bucket === 4) return "cyan";
  return "emerald";
}

export function formatPrice(priceIKAS: number): string {
  if (priceIKAS === TIER_RESERVED) return "Reserved";
  if (priceIKAS >= 1000) return `${priceIKAS.toLocaleString()} iKAS`;
  return `${priceIKAS} iKAS`;
}
