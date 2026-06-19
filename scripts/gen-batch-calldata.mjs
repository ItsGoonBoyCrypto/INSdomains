// Generates ABI-encoded calldata for InsBatchPriceSetter.runBatch(labels, forever, annual)
// using the curated TOP-50 set from gen-emoji-top50.mjs. Output: emoji-batch-calldata.txt
//
// Paste this calldata into Safe's "Contract Interaction" flow:
//   - Contract address: <InsBatchPriceSetter deployment>
//   - Calldata: the long 0x... blob from emoji-batch-calldata.txt
//   - Value: 0
//
// Or use cast to send directly:
//   cast send <HELPER_ADDR> $(cat emoji-batch-calldata.txt) --rpc-url $IGRA_RPC --legacy --slow ...

import tr46 from "tr46/index.js";
import { ens_normalize } from "@adraffy/ens-normalize";
import { encodeFunctionData } from "viem";
import fs from "node:fs";

// SAME curated TOP 50 as in gen-emoji-top50.mjs — keep in sync.
const TOP_10 = [
  ["🔥", "fire"], ["🚀", "rocket"], ["💎", "diamond"], ["❤️", "red_heart"],
  ["🌙", "moon"], ["🦄", "unicorn"], ["👑", "crown"], ["⚡", "lightning"],
  ["🌟", "glowing_star"], ["🎯", "target"],
];
const NEXT_40 = [
  ["✨", "sparkles"], ["💯", "100"], ["🏆", "trophy"], ["💰", "money_bag"],
  ["🎰", "slot"], ["🎁", "gift"], ["💍", "gem_ring"], ["🔑", "key"],
  ["⚽", "soccer"], ["🍀", "clover"],
  ["😎", "cool"], ["🤩", "star_struck"], ["😍", "heart_eyes"], ["🤔", "thinking"],
  ["🤯", "mind_blown"], ["🥶", "cold"], ["💀", "skull"], ["👻", "ghost"],
  ["👍", "thumbs_up"], ["🙌", "raised_hands"], ["💪", "muscle"], ["✊", "fist"],
  ["👌", "ok_hand"], ["🤙", "call_me"],
  ["💖", "sparkle_heart"], ["💜", "purple_heart"], ["💙", "blue_heart"], ["💚", "green_heart"],
  ["🐉", "dragon"], ["🦊", "fox"], ["🐻", "bear"], ["🐼", "panda"], ["🦁", "lion"], ["🐺", "wolf"],
  ["🌈", "rainbow"], ["🌊", "wave"],
  ["🇺🇸", "flag_us"], ["🇬🇧", "flag_uk"], ["🇪🇺", "flag_eu"], ["🇯🇵", "flag_jp"], ["🇰🇷", "flag_kr"],
];

const ULTRA_FOREVER_WEI = 4000n * 10n**18n;
const ULTRA_ANNUAL_WEI  = 1000n * 10n**18n;
const PREM_FOREVER_WEI  = 2000n * 10n**18n;
const PREM_ANNUAL_WEI   = 800n  * 10n**18n;

function encode(emoji) {
  const norm = ens_normalize(emoji);
  return tr46.toASCII(norm).toLowerCase();
}

const labels = [];
const forever = [];
const annual = [];

for (const [emoji] of TOP_10) {
  labels.push(encode(emoji));
  forever.push(ULTRA_FOREVER_WEI);
  annual.push(ULTRA_ANNUAL_WEI);
}
for (const [emoji] of NEXT_40) {
  labels.push(encode(emoji));
  forever.push(PREM_FOREVER_WEI);
  annual.push(PREM_ANNUAL_WEI);
}

const ABI = [{
  type: "function",
  name: "runBatch",
  inputs: [
    { name: "labels",        type: "string[]" },
    { name: "foreverPrices", type: "uint256[]" },
    { name: "annualPrices",  type: "uint256[]" },
  ],
  outputs: [],
  stateMutability: "nonpayable",
}];

const calldata = encodeFunctionData({
  abi: ABI,
  functionName: "runBatch",
  args: [labels, forever, annual],
});

fs.writeFileSync("emoji-batch-calldata.txt", calldata + "\n");

// Also write the Safe-compatible JSON for the Safe "Contract Interaction"
// flow — pre-decoded so Safe can show the array entries in its UI.
const safeJson = {
  version: "1.0",
  chainId: "38833",
  meta: {
    name: "InsBatchPriceSetter.runBatch — 50 emoji premium prices",
    description: "Ultra tier (10) at 4000/1000 iKAS, Premium tier (40) at 2000/800 iKAS",
    txBuilderVersion: "1.16.5",
    createdFromSafeAddress: "0x7447F0e5CDfa55ceF123F8d2E0B2c981d1807aA1",
    createdFromOwnerAddress: "",
    checksum: "",
  },
  transactions: [{
    to: "REPLACE_WITH_BATCH_HELPER_ADDRESS",
    value: "0",
    data: calldata,
  }],
};
fs.writeFileSync("emoji-batch-runBatch.json", JSON.stringify(safeJson, null, 2));

console.log(`Generated runBatch calldata for ${labels.length} labels`);
console.log(`  Ultra (4000/1000): ${TOP_10.length}`);
console.log(`  Premium (2000/800): ${NEXT_40.length}`);
console.log(`Files:`);
console.log(`  emoji-batch-calldata.txt    — raw 0x… calldata`);
console.log(`  emoji-batch-runBatch.json   — Safe Tx Builder import (replace helper addr)`);
console.log(``);
console.log(`Calldata size: ${calldata.length / 2 - 1} bytes`);
console.log(`First 80 chars: ${calldata.substring(0, 80)}...`);
