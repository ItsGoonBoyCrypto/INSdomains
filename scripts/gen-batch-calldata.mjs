// Generates ABI-encoded calldata for InsBatchPriceSetter.runBatch(labels, forever, annual)
// directly from emoji-top50.json (produced by gen-emoji-top50.mjs).
//
// Output: emoji-batch-calldata.txt + emoji-batch-runBatch.json
//
// USAGE (RUN BOTH SCRIPTS IN ORDER):
//   1. node scripts/gen-emoji-top50.mjs     — generates emoji-top50.json + checklist
//   2. node scripts/gen-batch-calldata.mjs  — reads emoji-top50.json, builds calldata
//
// Prereqs:
//   npm install (uses tr46 + @adraffy/ens-normalize + viem from package.json)
//
// SINGLE SOURCE OF TRUTH: the curated emoji list lives in gen-emoji-top50.mjs.
// This script imports the OUTPUT (emoji-top50.json) — so any edit to the
// curated list propagates to both the human checklist AND the calldata
// without manual sync.

import { encodeFunctionData } from "viem";
import fs from "node:fs";

if (!fs.existsSync("emoji-top50.json")) {
  console.error("emoji-top50.json not found. Run `node scripts/gen-emoji-top50.mjs` first.");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync("emoji-top50.json", "utf8"));

const labels = data.labels.map((r) => r.contractLabel);
const forever = data.labels.map((r) => BigInt(r.foreverWei));
const annual  = data.labels.map((r) => BigInt(r.annualWei));
const ultraCount = data.labels.filter((r) => r.tier === "ULTRA").length;
const premiumCount = data.labels.filter((r) => r.tier === "PREMIUM").length;

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
    name: `InsBatchPriceSetter.runBatch — ${labels.length} emoji premium prices`,
    description: `Ultra tier (${ultraCount}) at 4000/1000 iKAS, Premium tier (${premiumCount}) at 2000/800 iKAS`,
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
console.log(`  Ultra (4000/1000): ${ultraCount}`);
console.log(`  Premium (2000/800): ${premiumCount}`);
console.log(`Files:`);
console.log(`  emoji-batch-calldata.txt    — raw 0x… calldata`);
console.log(`  emoji-batch-runBatch.json   — Safe Tx Builder import (replace helper addr)`);
console.log(``);
console.log(`Calldata size: ${calldata.length / 2 - 1} bytes`);
console.log(`First 80 chars: ${calldata.substring(0, 80)}...`);
