/**
 * CCIP-Read gateway helpers. Pure functions, no I/O. Tested in isolation
 * (no external infra needed) so the gateway route can stay thin.
 *
 * Standards:
 *   - EIP-3668 / ENSIP-10: name is DNS-wire-encoded; data is the inner
 *     resolver call (addr(node) / text(node, key) / etc.)
 *   - EIP-191 personal_sign: digest = keccak256(0x1900 || verifier ||
 *     expires || keccak256(extraData) || keccak256(result))
 *
 * The digest construction MUST exactly match the one in
 * `INSWildcardL1.resolveCallback()` or signatures will be rejected on chain.
 */

import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodePacked,
  keccak256,
  type Hex,
  type Address,
} from "viem";
import { sign } from "viem/accounts";

/* ─────────────────────────── DNS encoding ────────────────────── */

/**
 * Decode a DNS-wire-encoded name back to its dotted form.
 *
 * Example: `0x05616c69636504696772610365746800`
 *   → `"alice.igra.eth"`
 *
 * Format per RFC 1035 §3.1: each label is `<len> <label-bytes>`, terminated
 * by a single `\x00` byte. Length octet must be in [1, 63].
 */
export function dnsDecodeName(dnsEncoded: Hex): string {
  const bytes = hexToBytes(dnsEncoded);
  const labels: string[] = [];
  let i = 0;
  while (i < bytes.length) {
    const len = bytes[i];
    if (len === 0) break; // root terminator
    if (len > 63) throw new Error(`dnsDecodeName: label length ${len} > 63 (invalid)`);
    if (i + 1 + len > bytes.length) throw new Error("dnsDecodeName: truncated payload");
    const label = bytesToString(bytes.slice(i + 1, i + 1 + len));
    labels.push(label);
    i += 1 + len;
  }
  return labels.join(".");
}

/**
 * Encode a dotted name into DNS-wire format. Helper for tests + reverse
 * lookups (we never need this in the live gateway path — the gateway only
 * receives already-encoded names from clients).
 */
export function dnsEncodeName(dotted: string): Hex {
  if (dotted.length === 0) return "0x00";
  const labels = dotted.split(".");
  let hex = "";
  for (const label of labels) {
    const labelBytes = new TextEncoder().encode(label);
    if (labelBytes.length === 0 || labelBytes.length > 63) {
      throw new Error(`dnsEncodeName: invalid label length ${labelBytes.length}`);
    }
    hex += labelBytes.length.toString(16).padStart(2, "0");
    hex += bytesToHex(labelBytes);
  }
  hex += "00"; // root terminator
  return ("0x" + hex) as Hex;
}

/* ─────────────────────────── Selector parsing ────────────────────── */

/** Standard ENS PublicResolver function selectors we serve. */
export const RESOLVER_SELECTORS = {
  /** addr(bytes32 node) returns (address) */
  addr: "0x3b3b57de" as const,
  /** addr(bytes32 node, uint256 coinType) returns (bytes) — multi-chain ENS */
  addrMulti: "0xf1cb7e06" as const,
  /** text(bytes32 node, string key) returns (string) */
  text: "0x59d1d43c" as const,
  /** contenthash(bytes32 node) returns (bytes) */
  contenthash: "0xbc1c58d1" as const,
} as const;

export type ResolverCall =
  | { kind: "addr"; node: Hex }
  | { kind: "addrMulti"; node: Hex; coinType: bigint }
  | { kind: "text"; node: Hex; key: string }
  | { kind: "contenthash"; node: Hex }
  | { kind: "unsupported"; selector: Hex };

/**
 * Parse the inner resolver call payload. Returns a discriminated union so
 * the gateway can route to the right backend read. Anything outside the
 * supported set returns `{ kind: "unsupported" }` so we can answer with
 * zero-bytes (ENS convention for unsupported records).
 */
export function parseResolverCall(data: Hex): ResolverCall {
  if (data.length < 10) {
    throw new Error(`parseResolverCall: data too short (${data.length})`);
  }
  const selector = data.slice(0, 10).toLowerCase() as Hex;
  const args = ("0x" + data.slice(10)) as Hex;

  if (selector === RESOLVER_SELECTORS.addr) {
    const [node] = decodeAbiParameters([{ type: "bytes32" }], args) as [Hex];
    return { kind: "addr", node };
  }
  if (selector === RESOLVER_SELECTORS.addrMulti) {
    const [node, coinType] = decodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      args,
    ) as [Hex, bigint];
    return { kind: "addrMulti", node, coinType };
  }
  if (selector === RESOLVER_SELECTORS.text) {
    const [node, key] = decodeAbiParameters(
      [{ type: "bytes32" }, { type: "string" }],
      args,
    ) as [Hex, string];
    return { kind: "text", node, key };
  }
  if (selector === RESOLVER_SELECTORS.contenthash) {
    const [node] = decodeAbiParameters([{ type: "bytes32" }], args) as [Hex];
    return { kind: "contenthash", node };
  }
  return { kind: "unsupported", selector };
}

/* ─────────────────────────── Label extraction ────────────────────── */

/**
 * Given a DNS-decoded name like "alice.igra.eth", return the *INS label* —
 * i.e. the single label that maps onto the V2 Registry's `resolve(label)`.
 *
 * The expected pattern is `<label>.igra.eth` (under the wildcard at
 * `igra.eth`). For top-level lookups we return the leftmost label.
 *
 * Returns `null` if the name doesn't match the expected `.igra.eth` pattern.
 */
export function extractInsLabel(dottedName: string, parent = "igra.eth"): string | null {
  const lower = dottedName.toLowerCase();
  const parentLower = parent.toLowerCase();
  const suffix = "." + parentLower;
  if (!lower.endsWith(suffix)) return null;
  const without = lower.slice(0, -suffix.length);
  // Reject empty (would mean caller asked for igra.eth itself, no label).
  if (without.length === 0) return null;
  // Subnames pattern: "pay.alice.igra.eth" → "pay.alice" — return only the
  // immediate label. Subname resolution is added in v1.1, until then we
  // resolve the rightmost label of the multi-component prefix.
  const parts = without.split(".");
  return parts[parts.length - 1] ?? null;
}

/* ─────────────────────────── EIP-191 digest + signing ────────────────────── */

/**
 * Reconstruct the same digest the on-chain contract computes in
 * `resolveCallback`. If this drifts from the Solidity, signatures fail.
 *
 *   digest = keccak256(
 *     0x1900
 *     || address(verifier)
 *     || uint64(expires)            (big-endian)
 *     || keccak256(extraData)
 *     || keccak256(result)
 *   )
 */
export function ccipDigest(args: {
  verifier: Address;
  expires: bigint;     // uint64, seconds since epoch
  extraData: Hex;
  result: Hex;
}): Hex {
  const { verifier, expires, extraData, result } = args;
  if (expires < 0n || expires > 0xffffffffffffffffn) {
    throw new Error("ccipDigest: expires out of uint64 range");
  }
  return keccak256(
    encodePacked(
      ["bytes2", "address", "uint64", "bytes32", "bytes32"],
      ["0x1900", verifier, expires, keccak256(extraData), keccak256(result)],
    ),
  );
}

/**
 * Sign the CCIP digest with the gateway's signing key. Returns a 65-byte
 * concat of (r, s, v). v is normalised to {27, 28}.
 *
 * The contract enforces EIP-2 low-s — viem's `sign()` returns canonical
 * low-s already, so the produced signatures are accepted on chain.
 */
export async function signCcipResponse(args: {
  privateKey: Hex;        // 0x-prefixed 32-byte key
  verifier: Address;
  expires: bigint;
  extraData: Hex;
  result: Hex;
}): Promise<Hex> {
  const digest = ccipDigest({
    verifier: args.verifier,
    expires: args.expires,
    extraData: args.extraData,
    result: args.result,
  });
  // viem's `sign` returns { r, s, v? | yParity } depending on version. Use
  // `hex` serialisation for stable 65-byte output.
  const sig = await sign({
    hash: digest,
    privateKey: args.privateKey,
    to: "hex",
  });
  return sig as Hex;
}

/* ─────────────────────────── Response encoder ────────────────────── */

/**
 * Encode the wire-level CCIP response that the wallet's callback decodes:
 *   abi.encode(bytes result, uint64 expires, bytes sig)
 */
export function encodeCcipResponse(args: {
  result: Hex;
  expires: bigint;
  signature: Hex;
}): Hex {
  return encodeAbiParameters(
    [{ type: "bytes" }, { type: "uint64" }, { type: "bytes" }],
    [args.result, args.expires, args.signature],
  );
}

/* ─────────────────────────── Bytes helpers ────────────────────── */

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("hexToBytes: odd length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (const v of b) s += v.toString(16).padStart(2, "0");
  return s;
}

function bytesToString(b: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(b);
}
