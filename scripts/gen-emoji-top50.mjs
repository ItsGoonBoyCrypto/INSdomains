// Tiered top-50 emoji list for one-by-one admin clicks at /admin.
// Reads from emoji-premium-prices.json (must run gen-emoji-list.mjs first)
// and produces emoji-top50-admin-checklist.md.

import tr46 from "tr46/index.js";
import { ens_normalize } from "@adraffy/ens-normalize";
import fs from "node:fs";

// Top 10 — ultra-premium, 4000 iKAS Forever / 1000 iKAS Annual (matches 1-char ASCII tier)
const TOP_10 = [
  ["🔥", "fire"],
  ["🚀", "rocket"],
  ["💎", "diamond"],
  ["❤️", "red_heart"],
  ["🌙", "moon"],
  ["🦄", "unicorn"],
  ["👑", "crown"],
  ["⚡", "lightning"],
  ["🌟", "glowing_star"],
  ["🎯", "target"],
];

// Next 40 — premium, 2000 iKAS Forever / 800 iKAS Annual (matches 2-char ASCII tier)
const NEXT_40 = [
  // Iconic objects
  ["✨", "sparkles"],
  ["💯", "100"],
  ["🏆", "trophy"],
  ["💰", "money_bag"],
  ["🎰", "slot"],
  ["🎁", "gift"],
  ["💍", "gem_ring"],
  ["🔑", "key"],
  ["⚽", "soccer"],
  ["🍀", "clover"],
  // Faces
  ["😎", "cool"],
  ["🤩", "star_struck"],
  ["😍", "heart_eyes"],
  ["🤔", "thinking"],
  ["🤯", "mind_blown"],
  ["🥶", "cold"],
  ["💀", "skull"],
  ["👻", "ghost"],
  // Hands
  ["👍", "thumbs_up"],
  ["🙌", "raised_hands"],
  ["💪", "muscle"],
  ["✊", "fist"],
  ["👌", "ok_hand"],
  ["🤙", "call_me"],
  // Hearts
  ["💖", "sparkle_heart"],
  ["💜", "purple_heart"],
  ["💙", "blue_heart"],
  ["💚", "green_heart"],
  // Animals
  ["🐉", "dragon"],
  ["🦊", "fox"],
  ["🐻", "bear"],
  ["🐼", "panda"],
  ["🦁", "lion"],
  ["🐺", "wolf"],
  // Nature
  ["🌈", "rainbow"],
  ["🌊", "wave"],
  // Top 5 country flags
  ["🇺🇸", "flag_us"],
  ["🇬🇧", "flag_uk"],
  ["🇪🇺", "flag_eu"],
  ["🇯🇵", "flag_jp"],
  ["🇰🇷", "flag_kr"],
];

const TOP10_FOREVER_WEI = "4000000000000000000000";   // 4000 iKAS
const TOP10_ANNUAL_WEI  = "1000000000000000000000";   // 1000 iKAS/yr
const N40_FOREVER_WEI   = "2000000000000000000000";   // 2000 iKAS
const N40_ANNUAL_WEI    = "800000000000000000000";    //  800 iKAS/yr

function encode(emoji) {
  const norm = ens_normalize(emoji);
  return tr46.toASCII(norm).toLowerCase();
}

const rows = [];
let n = 0;
for (const [emoji, key] of TOP_10) {
  const label = encode(emoji);
  rows.push({
    n: ++n,
    tier: "ULTRA",
    emoji,
    key,
    contractLabel: label,
    foreverIkas: 4000,
    annualIkas: 1000,
    foreverWei: TOP10_FOREVER_WEI,
    annualWei: TOP10_ANNUAL_WEI,
  });
}
for (const [emoji, key] of NEXT_40) {
  const label = encode(emoji);
  rows.push({
    n: ++n,
    tier: "PREMIUM",
    emoji,
    key,
    contractLabel: label,
    foreverIkas: 2000,
    annualIkas: 800,
    foreverWei: N40_FOREVER_WEI,
    annualWei: N40_ANNUAL_WEI,
  });
}

const md = [
  `# INS — Top 50 emoji premium-tier click-list`,
  ``,
  `Each row = one or two **Safe transactions** via \`/admin → Premium Overrides\`.`,
  `Open https://insdomains.org/admin, connect the Treasury Safe owner wallet,`,
  `and paste each \`Contract Label\` + price into the form.`,
  ``,
  `**Pricing model:**`,
  `- ULTRA tier (Top 10): 4000 iKAS Forever / 1000 iKAS Annual (matches 1-char ASCII)`,
  `- PREMIUM tier (Next 40): 2000 iKAS Forever / 800 iKAS Annual (matches 2-char ASCII)`,
  `- Everything else stays at the contract default: 500 iKAS Forever / 50 iKAS/yr`,
  ``,
  `**Safe signature count:** 50 (Forever only) or 100 (Forever + Annual companion).`,
  `If Annual is left at the 50 iKAS/yr default, premium emoji could be Annual-minted`,
  `for ~$1.50/yr — recommend setting the Annual companion too.`,
  ``,
  `Time budget: ~30s per Safe sign+execute → 25 min (Forever only) or 50 min (both).`,
  ``,
  `## ULTRA tier (Top 10) — 4000 iKAS Forever / 1000 iKAS Annual`,
  ``,
  `| # | Emoji | Contract Label | setPremiumPrice (Forever, wei) | setPremiumPriceAnnual (Annual, wei) |`,
  `|---|---|---|---|---|`,
  ...rows.slice(0, 10).map(r =>
    `| ${r.n} | ${r.emoji} | \`${r.contractLabel}\` | \`${r.foreverWei}\` (${r.foreverIkas} iKAS) | \`${r.annualWei}\` (${r.annualIkas} iKAS/yr) |`
  ),
  ``,
  `## PREMIUM tier (Next 40) — 2000 iKAS Forever / 800 iKAS Annual`,
  ``,
  `| # | Emoji | Contract Label | setPremiumPrice (Forever, wei) | setPremiumPriceAnnual (Annual, wei) |`,
  `|---|---|---|---|---|`,
  ...rows.slice(10).map(r =>
    `| ${r.n} | ${r.emoji} | \`${r.contractLabel}\` | \`${r.foreverWei}\` (${r.foreverIkas} iKAS) | \`${r.annualWei}\` (${r.annualIkas} iKAS/yr) |`
  ),
  ``,
  `## Just-the-labels (for fast copy-paste into the admin form)`,
  ``,
  `### ULTRA labels (Top 10 — set Forever = 4000, Annual = 1000)`,
  '```',
  ...rows.slice(0, 10).map(r => r.contractLabel),
  '```',
  ``,
  `### PREMIUM labels (Next 40 — set Forever = 2000, Annual = 800)`,
  '```',
  ...rows.slice(10).map(r => r.contractLabel),
  '```',
].join("\n");

fs.writeFileSync("emoji-top50-admin-checklist.md", md);

// JSON for programmatic use
fs.writeFileSync(
  "emoji-top50.json",
  JSON.stringify(
    {
      generated_at: "<paste timestamp>",
      registry_v2: "0x7E7018959bf44045F01D176D8db1594894CBf4E9",
      treasury_safe: "0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1",
      ultra: { forever_ikas: 4000, annual_ikas: 1000, count: 10 },
      premium: { forever_ikas: 2000, annual_ikas: 800, count: 40 },
      labels: rows,
    },
    null,
    2
  )
);

console.log(`Generated ${rows.length} entries (${TOP_10.length} ULTRA + ${NEXT_40.length} PREMIUM)`);
console.log(`Files:`);
console.log(`  emoji-top50-admin-checklist.md — printable click-through list`);
console.log(`  emoji-top50.json               — programmatic`);
