// @ts-expect-error -- tr46 ships no types but has a stable {toASCII, toUnicode} API
import tr46 from "tr46";
import { ens_normalize, ens_beautify, ens_tokenize } from "@adraffy/ens-normalize";

const MAX_GRAPHEMES = 32;
const MAX_PUNYCODE_BYTES = 63;
const TLD = "igra";

const segmenter =
  typeof Intl !== "undefined" && typeof (Intl as { Segmenter?: unknown }).Segmenter === "function"
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

function countGraphemes(s: string): number {
  if (segmenter) {
    let n = 0;
    for (const _ of segmenter.segment(s)) n++;
    return n;
  }
  return [...s].length;
}

export type PunyError =
  | "empty"
  | "too-long"
  | "too-long-encoded"
  | "leading-or-trailing-hyphen"
  | "invalid-ascii"
  | "ensip15-rejected"
  | "punycode-failed"
  | "round-trip-failed"
  | "contains-tld"
  | "contains-dot";

export class NameValidationError extends Error {
  constructor(public code: PunyError, message: string) {
    super(message);
    this.name = "NameValidationError";
  }
}

const ASCII_LABEL_RE = /^[a-z0-9-]+$/;

function stripTld(raw: string): string {
  return raw.replace(/\.(igra|ins|ikas)$/i, "").trim();
}

function isPureAscii(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 0x7f) return false;
  }
  return true;
}

/** True if `xn--` Punycode label. */
export function isPunycodeLabel(label: string): boolean {
  return label.startsWith("xn--") && label.length > 4;
}

/**
 * Canonicalize raw user input into the **contract-facing label**.
 * - ASCII inputs (`alice`) get lowercased + validated against the contract's char set.
 * - Emoji/Unicode inputs get ENSIP-15 normalized + Punycode-encoded to `xn--…`.
 * - Pre-Punycoded input (`xn--ws8h`) round-trips through normalize for canonicalization.
 *
 * Throws `NameValidationError` for any input the contract or our policy would reject.
 *
 * The returned string is what we pass to `register(label, ...)` on-chain.
 */
export function toContractLabel(rawInput: string): string {
  const raw = stripTld(rawInput);

  if (!raw) throw new NameValidationError("empty", "Name is empty.");
  if (raw.includes(".")) throw new NameValidationError("contains-dot", "Label cannot contain dots.");

  if (countGraphemes(raw) > MAX_GRAPHEMES) {
    throw new NameValidationError("too-long", `Name exceeds ${MAX_GRAPHEMES} graphemes.`);
  }

  if (isPureAscii(raw)) {
    const lower = raw.toLowerCase();
    if (lower.startsWith("-") || lower.endsWith("-")) {
      throw new NameValidationError("leading-or-trailing-hyphen", "Label cannot start or end with a hyphen.");
    }
    if (!ASCII_LABEL_RE.test(lower)) {
      throw new NameValidationError("invalid-ascii", "ASCII labels can only contain a-z, 0-9, and hyphens.");
    }
    return lower;
  }

  let normalizedDisplay: string;
  try {
    normalizedDisplay = ens_normalize(raw);
  } catch (e) {
    throw new NameValidationError("ensip15-rejected", `Name rejected by safety rules: ${(e as Error).message}`);
  }

  const encoded = tr46.toASCII(normalizedDisplay);
  if (!encoded) {
    throw new NameValidationError("punycode-failed", "Could not encode name to Punycode.");
  }

  if (encoded.length > MAX_PUNYCODE_BYTES) {
    throw new NameValidationError("too-long-encoded", `Encoded name exceeds ${MAX_PUNYCODE_BYTES} bytes.`);
  }

  const lowerEncoded = encoded.toLowerCase();
  if (lowerEncoded.startsWith("-") || lowerEncoded.endsWith("-")) {
    throw new NameValidationError("leading-or-trailing-hyphen", "Encoded label cannot start or end with a hyphen.");
  }
  if (!ASCII_LABEL_RE.test(lowerEncoded)) {
    throw new NameValidationError("invalid-ascii", "Encoded label fails contract char set check.");
  }

  const decoded = tr46.toUnicode(lowerEncoded);
  if (decoded.error || ens_normalize(decoded.domain) !== normalizedDisplay) {
    throw new NameValidationError("round-trip-failed", "Encoded name does not round-trip cleanly.");
  }

  return lowerEncoded;
}

/**
 * Decode a contract-facing label (`xn--ws8h` or `alice`) for user display.
 * Applies ENSIP-15 beautification (re-inserts FE0F variation selectors etc.)
 * so emoji render with full visual fidelity.
 *
 * Pure-ASCII labels pass through unchanged.
 */
export function toDisplayLabel(contractLabel: string): string {
  if (!isPunycodeLabel(contractLabel)) return contractLabel;
  const decoded = tr46.toUnicode(contractLabel);
  if (decoded.error) return contractLabel;
  try {
    return ens_beautify(decoded.domain);
  } catch {
    return decoded.domain;
  }
}

/** Full `.igra` name from a contract label. e.g. `xn--4v8h` → `🔥.igra`. */
export function toDisplayName(contractLabel: string): string {
  return `${toDisplayLabel(contractLabel)}.${TLD}`;
}

/**
 * Validate without throwing. Returns `null` if valid, error code otherwise.
 * Cheap to call on every keystroke.
 */
export function validateLabel(rawInput: string): PunyError | null {
  try {
    toContractLabel(rawInput);
    return null;
  } catch (e) {
    return (e as NameValidationError).code ?? "ensip15-rejected";
  }
}

/** True if the label is an emoji-bearing label (encoded to `xn--`). */
export function isEmojiLabel(contractLabel: string): boolean {
  return isPunycodeLabel(contractLabel);
}

/**
 * The "quartet" — every representation of a name we surface from the REST API.
 * Order matches the brief: display first, then canonical hash inputs.
 */
export interface NameQuartet {
  name: string;        // beautified for display: "🔥.igra"
  normalized: string;  // ENSIP-15 canonical (FE0F stripped): "🔥.igra"
  punycode: string;    // ASCII contract form: "xn--4v8h.igra"
  label: string;       // contract label only (no TLD): "xn--4v8h"
}

export function nameQuartetFromContractLabel(contractLabel: string): NameQuartet {
  const display = toDisplayLabel(contractLabel);
  const normalizedLabel = isPunycodeLabel(contractLabel)
    ? (() => {
        const dec = tr46.toUnicode(contractLabel);
        if (dec.error) return contractLabel;
        try {
          return ens_normalize(dec.domain);
        } catch {
          return contractLabel;
        }
      })()
    : contractLabel;
  return {
    name: `${display}.${TLD}`,
    normalized: `${normalizedLabel}.${TLD}`,
    punycode: `${contractLabel}.${TLD}`,
    label: contractLabel,
  };
}

/**
 * Inspect every token in the input for the threat-highlight UI.
 * Returns an array of segments with their disposition + whether to flag them.
 *
 * Used by the search bar to underline invisible/disallowed chars before the user submits.
 */
export interface TokenInsight {
  type: "valid" | "emoji" | "ignored" | "disallowed" | "mapped" | "stop";
  text: string;
  warn: boolean;
}

export function tokenize(rawInput: string): TokenInsight[] {
  const raw = stripTld(rawInput);
  if (!raw) return [];
  let tokens: ReturnType<typeof ens_tokenize>;
  try {
    tokens = ens_tokenize(raw);
  } catch {
    return [{ type: "disallowed", text: raw, warn: true }];
  }
  return tokens.map((t) => {
    const tok = t as { type?: string; cp?: number | number[]; cps?: number[]; emoji?: number[]; input?: number[] };
    let cps: number[];
    if (Array.isArray(tok.cps)) cps = tok.cps;
    else if (Array.isArray(tok.cp)) cps = tok.cp;
    else if (typeof tok.cp === "number") cps = [tok.cp];
    else if (Array.isArray(tok.emoji)) cps = tok.emoji;
    else if (Array.isArray(tok.input)) cps = tok.input;
    else cps = [];
    const text = cps.length ? String.fromCodePoint(...cps) : "";
    switch (tok.type) {
      case "emoji":
        return { type: "emoji", text, warn: false };
      case "valid":
      case "nfc":
        return { type: "valid", text, warn: false };
      case "mapped":
        return { type: "mapped", text, warn: false };
      case "ignored":
        return { type: "ignored", text, warn: true };
      case "disallowed":
        return { type: "disallowed", text, warn: true };
      case "stop":
        return { type: "stop", text: ".", warn: true };
      default:
        return { type: "valid", text, warn: false };
    }
  });
}
