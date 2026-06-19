import { keccak256, stringToBytes, concat, toHex, isAddress } from "viem";
import {
  toContractLabel as _toContractLabel,
  toDisplayLabel as _toDisplayLabel,
  toDisplayName as _toDisplayName,
  validateLabel as _validateLabel,
  isPunycodeLabel as _isPunycodeLabel,
  NameValidationError,
} from "./punyname";

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

/**
 * Strict ASCII validator — agrees with the on-chain `_isValidLabelBytes`
 * contract check. Kept narrow so the parity test stays green.
 *
 * For user-facing input that should also accept emoji, use
 * `isValidLabelOrEmoji` (which normalizes + Punycode-encodes first).
 */
export function isValidLabel(label: string): boolean {
  const clean = label.toLowerCase().replace(/\.(igra|ins)$/, "");
  if (clean.length < 1 || clean.length > 32) return false;
  if (clean.startsWith("-") || clean.endsWith("-")) return false;
  return /^[a-z0-9-]+$/.test(clean);
}

/**
 * Strict ASCII cleaner — strips everything outside `[a-z0-9-]`. Use for
 * admin / parity contexts where the input *must* already be the
 * contract-facing label (incl. raw `xn--…` Punycode).
 */
export function cleanLabel(raw: string): string {
  return raw.toLowerCase().trim().replace(/\.ins$/, "").replace(/[^a-z0-9-]/g, "");
}

/**
 * Emoji-aware cleaner. Trims whitespace + strips trailing `.igra/.ins/.ikas`
 * but PRESERVES emoji / Unicode so the validator can normalize them.
 *
 * Use this in user-facing search/mint flows; the strict `cleanLabel` is
 * for admin / contract-facing surfaces.
 */
export function cleanLabelEmoji(raw: string): string {
  return raw.trim().replace(/\.(igra|ins|ikas)$/i, "");
}

/**
 * Emoji-aware validator. Returns true if the input would be accepted by
 * the contract after ENSIP-15 normalization + Punycode encoding (i.e.
 * `prepareForContract` would succeed).
 *
 * Cheap to call on every keystroke.
 */
export function isValidLabelOrEmoji(input: string): boolean {
  return _validateLabel(input) === null;
}

/**
 * Encode user input (ASCII OR emoji) into the contract-facing label the
 * dApp must send to `register()`. Throws `NameValidationError` if the
 * input fails any safety / size / round-trip check.
 *
 * - `alice` → `alice`
 * - `🔥` → `xn--4v8h`
 * - `xn--4v8h` → `xn--4v8h` (re-canonicalized through normalize)
 */
export function prepareForContract(input: string): string {
  return _toContractLabel(input);
}

/**
 * Decode a contract-facing label back to its human-readable form for UI.
 * - `xn--4v8h` → `🔥` (beautified, with FE0F restored)
 * - `alice` → `alice`
 */
export function displayLabel(contractLabel: string): string {
  return _toDisplayLabel(contractLabel);
}

/**
 * Full display name. `xn--4v8h` → `🔥.igra`.
 */
export function displayName(contractLabel: string): string {
  return _toDisplayName(contractLabel);
}

/** True if the contract label is `xn--…` (i.e. an encoded emoji name). */
export function isPunycodeLabel(label: string): boolean {
  return _isPunycodeLabel(label);
}

export { NameValidationError };

/**
 * Build the standard "name response" envelope used by the REST API.
 * Given a contract label (e.g. `xn--4v8h`) and a TLD (e.g. `igra`), returns:
 *   - `name`           — beautified display name (`🔥.igra`)
 *   - `label`          — contract label (xn-- form for emoji, plain for ASCII)
 *   - `display_label`  — user-facing label without TLD (`🔥`)
 *   - `punycode_name`  — pure ASCII form (`xn--4v8h.igra`)
 *   - `normalized_name`— ENSIP-15 canonical (FE0F stripped)
 *
 * For ASCII labels all five fields collapse to the same content.
 */
export interface NameEnvelope {
  name: string;
  label: string;
  display_label: string;
  punycode_name: string;
  normalized_name: string;
}

export function buildNameEnvelope(contractLabel: string, tld: string): NameEnvelope {
  const display = displayLabel(contractLabel);
  const suffix = `.${tld}`;
  return {
    name: `${display}${suffix}`,
    label: contractLabel,
    display_label: display,
    punycode_name: `${contractLabel}${suffix}`,
    normalized_name: `${display}${suffix}`,
  };
}

export function shortAddr(addr?: string): string {
  if (!addr || !isAddress(addr as `0x${string}`)) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export const toHexLabel = (label: string): `0x${string}` =>
  keccak256(stringToBytes(label));

export { toHex };
