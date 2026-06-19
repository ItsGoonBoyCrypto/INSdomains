// Generate the curated emoji premium-price list.
// Output: emoji-premium-prices.{md,csv,json} + safe-batch.json for Safe multisend.
//
// Run from project root:   node scripts/gen-emoji-list.mjs
//
// Picks ~250 culturally-popular emoji across categories. Avoids:
//   - Empty/skin-tone-modifier-only sequences (must be on a base emoji)
//   - Multi-codepoint compound flags that exceed 32 bytes when Punycoded
//   - Anything ENSIP-15 currently rejects

import tr46 from "tr46/index.js";
import { ens_normalize } from "@adraffy/ens-normalize";
import fs from "node:fs";
import path from "node:path";

const PRICE_IKAS = 1000;
const PRICE_WEI = `${PRICE_IKAS}000000000000000000`;

const PICKS = {
  HOT_OBJECTS: [
    ["fire",          "🔥"], ["rocket",      "🚀"], ["diamond",     "💎"],
    ["moon",          "🌙"], ["sun",         "☀️"], ["star",        "⭐"],
    ["sparkles",      "✨"], ["lightning",   "⚡"], ["target",      "🎯"],
    ["trophy",        "🏆"], ["medal",       "🏅"], ["crown",       "👑"],
    ["money_bag",     "💰"], ["dollar",      "💵"], ["coin",        "🪙"],
    ["gem",           "💍"], ["bell",        "🔔"], ["lock",        "🔒"],
    ["key",           "🔑"], ["bulb",        "💡"], ["magnet",      "🧲"],
    ["bomb",          "💣"], ["dagger",      "🗡️"], ["shield",      "🛡️"],
    ["microscope",    "🔬"], ["telescope",   "🔭"], ["satellite",   "🛰️"],
    ["robot",         "🤖"], ["alien",       "👽"], ["ufo",         "🛸"],
    ["camera",        "📷"], ["video",       "🎥"], ["mic",         "🎤"],
    ["headphones",    "🎧"], ["guitar",      "🎸"], ["piano",       "🎹"],
    ["trumpet",       "🎺"], ["saxophone",   "🎷"], ["drums",       "🥁"],
    ["controller",    "🎮"], ["dice",        "🎲"], ["dart",        "🎯"],
    ["soccer",        "⚽"], ["basketball",  "🏀"], ["football",    "🏈"],
    ["baseball",      "⚾"], ["tennis",      "🎾"], ["volleyball",  "🏐"],
    ["pingpong",      "🏓"], ["skateboard",  "🛹"], ["bowling",     "🎳"],
  ],
  FACES: [
    ["heart_eyes",    "😍"], ["star_struck", "🤩"], ["cool",        "😎"],
    ["smile",         "😀"], ["wink",        "😉"], ["thinking",    "🤔"],
    ["mind_blown",    "🤯"], ["clown",       "🤡"], ["devil",       "😈"],
    ["ghost",         "👻"], ["skull",       "💀"], ["100",         "💯"],
    ["thumbs_up",     "👍"], ["thumbs_down", "👎"], ["clap",        "👏"],
    ["fist",          "✊"], ["raised_hands","🙌"], ["pray",        "🙏"],
    ["wave",          "👋"], ["ok_hand",     "👌"], ["point_up",    "☝️"],
    ["muscle",        "💪"], ["brain",       "🧠"], ["eye",         "👁️"],
  ],
  HEARTS: [
    ["red_heart",     "❤️"], ["orange_heart","🧡"], ["yellow_heart","💛"],
    ["green_heart",   "💚"], ["blue_heart",  "💙"], ["purple_heart","💜"],
    ["black_heart",   "🖤"], ["white_heart", "🤍"], ["broken_heart","💔"],
    ["sparkle_heart", "💖"], ["growing_heart","💗"],["beating_heart","💓"],
    ["love_letter",  "💌"], ["cupid",       "💘"], ["kiss_mark",   "💋"],
  ],
  ANIMALS: [
    ["frog",          "🐸"], ["bear",        "🐻"], ["polar_bear",  "🐻‍❄️"],
    ["panda",         "🐼"], ["koala",       "🐨"], ["tiger",       "🐯"],
    ["lion",          "🦁"], ["fox",         "🦊"], ["wolf",        "🐺"],
    ["dog",           "🐶"], ["cat",         "🐱"], ["rabbit",      "🐰"],
    ["mouse",         "🐭"], ["hamster",     "🐹"], ["pig",         "🐷"],
    ["cow",           "🐮"], ["horse",       "🐴"], ["unicorn",     "🦄"],
    ["dragon",        "🐉"], ["snake",       "🐍"], ["turtle",      "🐢"],
    ["elephant",      "🐘"], ["monkey",      "🐵"], ["whale",       "🐳"],
    ["dolphin",       "🐬"], ["shark",       "🦈"], ["octopus",     "🐙"],
    ["butterfly",     "🦋"], ["bee",         "🐝"], ["chicken",     "🐔"],
    ["penguin",       "🐧"], ["owl",         "🦉"], ["eagle",       "🦅"],
  ],
  FOOD: [
    ["pizza",         "🍕"], ["burger",      "🍔"], ["taco",        "🌮"],
    ["sushi",         "🍣"], ["ramen",       "🍜"], ["donut",       "🍩"],
    ["cookie",        "🍪"], ["cake",        "🎂"], ["ice_cream",   "🍦"],
    ["coffee",        "☕"], ["beer",        "🍺"], ["champagne",   "🥂"],
    ["wine",          "🍷"], ["cocktail",    "🍸"], ["whiskey",     "🥃"],
    ["apple",         "🍎"], ["banana",      "🍌"], ["grapes",      "🍇"],
    ["strawberry",    "🍓"], ["watermelon",  "🍉"], ["cherry",      "🍒"],
    ["chili",         "🌶️"], ["popcorn",     "🍿"], ["honey",       "🍯"],
  ],
  NATURE: [
    ["wave",          "🌊"], ["snowflake",   "❄️"], ["snowman",     "⛄"],
    ["cloud",         "☁️"], ["rainbow",     "🌈"], ["tornado",     "🌪️"],
    ["volcano",       "🌋"], ["tree",        "🌳"], ["cactus",      "🌵"],
    ["sunflower",     "🌻"], ["rose",        "🌹"], ["tulip",       "🌷"],
    ["seedling",      "🌱"], ["mushroom",    "🍄"], ["leaf",        "🍀"],
    ["earth_globe",   "🌍"], ["earth_americas","🌎"], ["earth_asia","🌏"],
  ],
  TRANSPORT: [
    ["car",           "🚗"], ["taxi",        "🚕"], ["bus",         "🚌"],
    ["police_car",    "🚓"], ["ambulance",   "🚑"], ["truck",       "🚚"],
    ["bicycle",       "🚲"], ["motorcycle",  "🏍️"], ["airplane",    "✈️"],
    ["helicopter",    "🚁"], ["sailboat",    "⛵"], ["yacht",       "🛥️"],
    ["train",         "🚂"], ["tractor",     "🚜"], ["fuel",        "⛽"],
  ],
  ZWJ_FAMILY: [
    ["family",        "👨‍👩‍👧‍👦"],
    ["family_2",      "👨‍👩‍👦"],
    ["family_mm",     "👨‍👨‍👦"],
    ["family_ff",     "👩‍👩‍👧"],
    ["couple_kiss",   "💏"],
    ["couple_heart",  "💑"],
    ["pirate_flag",   "🏴‍☠️"],
    ["rainbow_flag",  "🏳️‍🌈"],
    ["man_doctor",    "👨‍⚕️"],
    ["woman_doctor",  "👩‍⚕️"],
    ["chef_m",        "👨‍🍳"], ["chef_w",         "👩‍🍳"],
    ["astronaut_m",   "👨‍🚀"], ["astronaut_w",    "👩‍🚀"],
    ["judge_m",       "👨‍⚖️"], ["judge_w",        "👩‍⚖️"],
    ["pilot_m",       "👨‍✈️"], ["pilot_w",        "👩‍✈️"],
    ["tech_m",        "👨‍💻"], ["tech_w",         "👩‍💻"],
    ["teacher_m",     "👨‍🏫"], ["teacher_w",      "👩‍🏫"],
    ["mechanic_m",    "👨‍🔧"], ["mechanic_w",     "👩‍🔧"],
    ["scientist_m",   "👨‍🔬"], ["scientist_w",    "👩‍🔬"],
    ["artist_m",      "👨‍🎨"], ["artist_w",       "👩‍🎨"],
    ["singer_m",      "👨‍🎤"], ["singer_w",       "👩‍🎤"],
  ],
  FLAGS_TOP: [
    ["flag_us",       "🇺🇸"], ["flag_uk",     "🇬🇧"], ["flag_eu",     "🇪🇺"],
    ["flag_de",       "🇩🇪"], ["flag_fr",     "🇫🇷"], ["flag_it",     "🇮🇹"],
    ["flag_es",       "🇪🇸"], ["flag_nl",     "🇳🇱"], ["flag_pt",     "🇵🇹"],
    ["flag_ie",       "🇮🇪"], ["flag_pl",     "🇵🇱"], ["flag_se",     "🇸🇪"],
    ["flag_no",       "🇳🇴"], ["flag_dk",     "🇩🇰"], ["flag_fi",     "🇫🇮"],
    ["flag_ch",       "🇨🇭"], ["flag_at",     "🇦🇹"], ["flag_be",     "🇧🇪"],
    ["flag_gr",       "🇬🇷"], ["flag_tr",     "🇹🇷"], ["flag_ua",     "🇺🇦"],
    ["flag_ru",       "🇷🇺"], ["flag_cn",     "🇨🇳"], ["flag_jp",     "🇯🇵"],
    ["flag_kr",       "🇰🇷"], ["flag_in",     "🇮🇳"], ["flag_id",     "🇮🇩"],
    ["flag_au",       "🇦🇺"], ["flag_nz",     "🇳🇿"], ["flag_ca",     "🇨🇦"],
    ["flag_mx",       "🇲🇽"], ["flag_br",     "🇧🇷"], ["flag_ar",     "🇦🇷"],
    ["flag_cl",       "🇨🇱"], ["flag_co",     "🇨🇴"], ["flag_pe",     "🇵🇪"],
    ["flag_za",       "🇿🇦"], ["flag_eg",     "🇪🇬"], ["flag_ng",     "🇳🇬"],
    ["flag_ke",       "🇰🇪"], ["flag_il",     "🇮🇱"], ["flag_sa",     "🇸🇦"],
    ["flag_ae",       "🇦🇪"], ["flag_qa",     "🇶🇦"], ["flag_kw",     "🇰🇼"],
    ["flag_th",       "🇹🇭"], ["flag_vn",     "🇻🇳"], ["flag_ph",     "🇵🇭"],
    ["flag_sg",       "🇸🇬"], ["flag_my",     "🇲🇾"], ["flag_tw",     "🇹🇼"],
    ["flag_hk",       "🇭🇰"], ["flag_pirate", "🏴‍☠️"],
  ],
};

const out = [];
const skipped = [];

for (const [cat, list] of Object.entries(PICKS)) {
  for (const [key, emoji] of list) {
    try {
      const normalized = ens_normalize(emoji);
      const encoded = tr46.toASCII(normalized);
      if (!encoded || encoded.length > 32) {
        skipped.push({ category: cat, key, emoji, reason: !encoded ? "encode_fail" : `too_long_${encoded.length}` });
        continue;
      }
      const lower = encoded.toLowerCase();
      if (!/^[a-z0-9-]+$/.test(lower) || lower.startsWith("-") || lower.endsWith("-")) {
        skipped.push({ category: cat, key, emoji, reason: "bad_charset" });
        continue;
      }
      // sanity round-trip
      const decoded = tr46.toUnicode(lower);
      if (decoded.error || ens_normalize(decoded.domain) !== normalized) {
        skipped.push({ category: cat, key, emoji, reason: "round_trip_fail" });
        continue;
      }
      out.push({
        category: cat,
        key,
        emoji,
        display: normalized,
        contractLabel: lower,
        bytes: lower.length,
        priceIkas: PRICE_IKAS,
        priceWei: PRICE_WEI,
      });
    } catch (e) {
      skipped.push({ category: cat, key, emoji, reason: `throw: ${e.message.slice(0, 40)}` });
    }
  }
}

// Sort by category, then key for stable output
out.sort((a, b) => a.category === b.category ? a.key.localeCompare(b.key) : a.category.localeCompare(b.category));

// ===== Markdown table =====
const mdLines = [
  `# INS emoji premium-price list`,
  ``,
  `**${out.length} labels** at **${PRICE_IKAS} iKAS Forever** each.`,
  `Generated by \`scripts/gen-emoji-list.mjs\`. Skipped: ${skipped.length}.`,
  ``,
  `Run \`setPremiumPrice(contractLabel, ${PRICE_WEI})\` on the V2 Registry for each row.`,
  `Optionally also \`setPremiumPriceAnnual(contractLabel, 500000000000000000000)\` for 500 iKAS/yr.`,
  ``,
  `## All entries`,
  ``,
  `| # | Category | Emoji | Display | Contract Label (xn--) | Bytes | Price (iKAS) |`,
  `|---|---|---|---|---|---|---|`,
  ...out.map((r, i) => `| ${i + 1} | ${r.category} | ${r.emoji} | ${r.display} | \`${r.contractLabel}\` | ${r.bytes} | ${r.priceIkas} |`),
  ``,
  `## Skipped (${skipped.length})`,
  ``,
  ...skipped.map((s) => `- \`${s.category}/${s.key}\` (${s.emoji}) — ${s.reason}`),
];
fs.writeFileSync("emoji-premium-prices.md", mdLines.join("\n"));

// ===== CSV =====
const csvLines = [
  "category,key,emoji,display,contract_label,bytes,price_ikas,price_wei",
  ...out.map((r) =>
    [r.category, r.key, r.emoji, r.display, r.contractLabel, r.bytes, r.priceIkas, r.priceWei].join(",")
  ),
];
fs.writeFileSync("emoji-premium-prices.csv", csvLines.join("\n"));

// ===== JSON =====
fs.writeFileSync("emoji-premium-prices.json", JSON.stringify({ generated_at_block: "<paste tx block>", price_ikas: PRICE_IKAS, price_wei: PRICE_WEI, total: out.length, skipped: skipped.length, entries: out }, null, 2));

// ===== Safe batch JSON =====
// Format: Safe multisend / batch import format compatible with Safe Web app
// Replace REGISTRY_V2_ADDRESS_PLACEHOLDER with the actual address before importing.
const safeBatch = {
  version: "1.0",
  chainId: "38833",
  createdAt: 0,
  meta: {
    name: "INS V2 emoji premium prices",
    description: `Set premium price = ${PRICE_IKAS} iKAS Forever for ${out.length} emoji labels`,
    txBuilderVersion: "1.16.5",
    createdFromSafeAddress: "REPLACE_WITH_SAFE_ADDRESS",
    createdFromOwnerAddress: "",
    checksum: "",
  },
  transactions: out.map((r) => ({
    to: "REGISTRY_V2_ADDRESS_PLACEHOLDER",
    value: "0",
    data: null,
    contractMethod: {
      inputs: [
        { internalType: "string", name: "label", type: "string" },
        { internalType: "uint256", name: "price", type: "uint256" },
      ],
      name: "setPremiumPrice",
      payable: false,
    },
    contractInputsValues: { label: r.contractLabel, price: PRICE_WEI },
  })),
};
fs.writeFileSync("emoji-safe-batch.json", JSON.stringify(safeBatch, null, 2));

console.log(`Generated ${out.length} labels (${skipped.length} skipped) at ${PRICE_IKAS} iKAS each.`);
console.log(`Files:`);
console.log(`  emoji-premium-prices.md   — readable table`);
console.log(`  emoji-premium-prices.csv  — spreadsheet`);
console.log(`  emoji-premium-prices.json — programmatic`);
console.log(`  emoji-safe-batch.json     — Safe Transaction Builder import`);
