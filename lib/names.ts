import { keccak256, stringToBytes, concat, toHex, isAddress } from "viem";

/** ENS-style namehash for `.ins` names. */
export function namehash(name: string): `0x${string}` {
  let node: `0x${string}` = ("0x" + "00".repeat(32)) as `0x${string}`;
  if (!name) return node;
  const labels = name.toLowerCase().split(".").reverse();
  for (const label of labels) {
    const labelHash = keccak256(stringToBytes(label));
    node = keccak256(concat([node, labelHash]));
  }
  return node;
}

/** Validate a `.ins` label (no dots). Allows a-z, 0-9, hyphen; 3–32 chars. */
export function isValidLabel(label: string): boolean {
  const clean = label.toLowerCase().replace(/\.ins$/, "");
  if (clean.length < 3 || clean.length > 32) return false;
  if (clean.startsWith("-") || clean.endsWith("-")) return false;
  return /^[a-z0-9-]+$/.test(clean);
}

export function cleanLabel(raw: string): string {
  return raw.toLowerCase().trim().replace(/\.ins$/, "").replace(/[^a-z0-9-]/g, "");
}

export function shortAddr(addr?: string): string {
  if (!addr || !isAddress(addr as `0x${string}`)) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export const toHexLabel = (label: string): `0x${string}` =>
  keccak256(stringToBytes(label));

export { toHex };
