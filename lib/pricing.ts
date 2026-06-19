/**
 * Tiered pricing for .ins names. Mirrors the on-chain logic in
 * INSRegistry.sol::priceFor so the UI can quote prices instantly
 * before a contract read round-trips.
 *
 * Emoji names: the on-chain contract uses `bytes(label).length` and so
 * does the dApp's UI quote — Punycode-encoded labels (≥ 8 bytes for the
 * smallest single emoji) naturally fall in the 5+ bucket. Until the
 * Registry exposes a separate emoji bucket, displayed tier and quoted
 * price both follow what the chain will actually charge.
 */

import { TAKEN_NAMES } from "./mock-registry";

export const TIER_RESERVED = Number.MAX_SAFE_INTEGER;

/**
 * Canonical Forever-tier schedule, mirrored on INSRegistryIgraV2 via
 * lengthPrice[1..5]. Used ONLY for instant UI preview chips — the real
 * mint price is always read on-chain via priceFor. Keep in sync with
 * the contract constructor schedule.
 */
export const LENGTH_PRICE: Record<number, number> = {
  1: 4000,            // ultra-premium (1-char)
  2: 2000,            // premium (2-char)
  3: 1200,            // rare (3-char)
  4: 800,             // uncommon (4-char)
  5: 500,             // standard (5–32 chars)
};

/**
 * Curated premium overrides — these mirror the on-chain premiumPrice
 * mapping set via InsBatchPriceSetter (commit 7171d5c series). Keep in
 * sync if the on-chain mapping is updated.
 *
 * Source of truth: emoji-top50.json + the runBatch tx from
 * 0xb095b7fdad60eedd24d8c38c2e9505b3e1587bfc (one-shot helper, now dead).
 */
export const PREMIUM_OVERRIDES: Record<string, number> = {
  // ULTRA tier (10) — 4000 iKAS Forever / 1000 iKAS Annual
  "xn--4v8h": 4000,   // 🔥 fire
  "xn--158h": 4000,   // 🚀 rocket
  "xn--tr8h": 4000,   // 💎 diamond
  "xn--qei":  4000,   // ❤️ red_heart
  "xn--5g8h": 4000,   // 🌙 moon
  "xn--3s9h": 4000,   // 🦄 unicorn
  "xn--2p8h": 4000,   // 👑 crown
  "xn--57h":  4000,   // ⚡ lightning
  "xn--ch8h": 4000,   // 🌟 glowing_star
  "xn--gl8h": 4000,   // 🎯 target
  // PREMIUM tier (41) — 2000 iKAS Forever / 800 iKAS Annual
  "xn--0ci":   2000,  // ✨ sparkles
  "xn--rs8h":  2000,  // 💯 hundred
  "xn--3l8h":  2000,  // 🏆 trophy
  "xn--ss8h":  2000,  // 💰 money_bag
  "xn--hl8h":  2000,  // 🎰 slot
  "xn--4j8h":  2000,  // 🎁 gift
  "xn--sr8h":  2000,  // 💍 gem_ring
  "xn--kv8h":  2000,  // 🔑 key
  "xn--y8h":   2000,  // ⚽ soccer
  "xn--9h8h":  2000,  // 🍀 clover
  "xn--s28h":  2000,  // 😎 cool
  "xn--iq9h":  2000,  // 🤩 star_struck
  "xn--r28h":  2000,  // 😍 heart_eyes
  "xn--wp9h":  2000,  // 🤔 thinking
  "xn--oq9h":  2000,  // 🤯 mind_blown
  "xn--ps9h":  2000,  // 🥶 cold
  "xn--fr8h":  2000,  // 💀 skull
  "xn--9q8h":  2000,  // 👻 ghost
  "xn--yp8h":  2000,  // 👍 thumbs_up
  "xn--k48h":  2000,  // 🙌 raised_hands
  "xn--ms8h":  2000,  // 💪 muscle
  "xn--5bi":   2000,  // ✊ fist
  "xn--xp8h":  2000,  // 👌 ok_hand
  "xn--1p9h":  2000,  // 🤙 call_me
  "xn--1r8h":  2000,  // 💖 sparkle_heart
  "xn--7r8h":  2000,  // 💜 purple_heart
  "xn--4r8h":  2000,  // 💙 blue_heart
  "xn--5r8h":  2000,  // 💚 green_heart
  "xn--0n8h":  2000,  // 🐉 dragon
  "xn--9s9h":  2000,  // 🦊 fox
  "xn--gp8h":  2000,  // 🐻 bear
  "xn--hp8h":  2000,  // 🐼 panda
  "xn--0s9h":  2000,  // 🦁 lion
  "xn--fp8h":  2000,  // 🐺 wolf
  "xn--og8h":  2000,  // 🌈 rainbow
  "xn--qg8h":  2000,  // 🌊 wave
  "xn--w77hd":  2000, // 🇺🇸 flag_us
  "xn--f77hja": 2000, // 🇬🇧 flag_uk
  "xn--i77h6a": 2000, // 🇪🇺 flag_eu
  "xn--n77hma": 2000, // 🇯🇵 flag_jp
  "xn--o77hoa": 2000, // 🇰🇷 flag_kr
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
  if (r.bucket === 1) return "1-char · ultra-premium";
  if (r.bucket === 2) return "2-char · premium";
  if (r.bucket === 3) return "3-char · rare";
  if (r.bucket === 4) return "4-char · uncommon";
  return "Standard";
}

export function tierColor(r: Rarity): "red" | "plum" | "amber" | "cyan" | "emerald" {
  if (r.kind === "reserved") return "red";
  if (r.kind === "premium") return "plum";
  if (r.bucket === 1) return "plum";
  if (r.bucket === 2) return "plum";
  if (r.bucket === 3) return "amber";
  if (r.bucket === 4) return "cyan";
  return "emerald";
}

export function formatPrice(priceIKAS: number): string {
  if (priceIKAS === TIER_RESERVED) return "Reserved";
  if (priceIKAS >= 1000) return `${priceIKAS.toLocaleString()} iKAS`;
  return `${priceIKAS} iKAS`;
}
