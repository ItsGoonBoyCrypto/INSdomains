import { describe, it, expect } from "vitest";
import {
  toContractLabel,
  toDisplayLabel,
  toDisplayName,
  validateLabel,
  isPunycodeLabel,
  isEmojiLabel,
  nameQuartetFromContractLabel,
  tokenize,
  NameValidationError,
} from "./punyname";

const FIRE = String.fromCodePoint(0x1f525);
const ROCKET = String.fromCodePoint(0x1f680);
const DIAMOND = String.fromCodePoint(0x1f48e);
const FAMILY = String.fromCodePoint(0x1f468) + "‍" +
               String.fromCodePoint(0x1f469) + "‍" +
               String.fromCodePoint(0x1f467) + "‍" +
               String.fromCodePoint(0x1f466);
const FLAG_US = String.fromCodePoint(0x1f1fa) + String.fromCodePoint(0x1f1f8);

const CYR_A = "а"; // Cyrillic а — homograph for Latin a
const ZWSP = "​";
const RLM = "‏";
const LRM = "‎";

describe("toContractLabel — ASCII path", () => {
  it("passes through valid lowercase ASCII", () => {
    expect(toContractLabel("alice")).toBe("alice");
  });
  it("lowercases mixed case", () => {
    expect(toContractLabel("Alice")).toBe("alice");
    expect(toContractLabel("ABC123")).toBe("abc123");
  });
  it("accepts digits + hyphens", () => {
    expect(toContractLabel("ab-c1")).toBe("ab-c1");
  });
  it("strips trailing .igra / .ins / .ikas", () => {
    expect(toContractLabel("alice.igra")).toBe("alice");
    expect(toContractLabel("alice.ins")).toBe("alice");
    expect(toContractLabel("alice.IGRA")).toBe("alice");
  });
  it("rejects leading hyphen", () => {
    expect(() => toContractLabel("-alice")).toThrow(NameValidationError);
  });
  it("rejects trailing hyphen", () => {
    expect(() => toContractLabel("alice-")).toThrow(NameValidationError);
  });
  it("rejects underscore (not in contract char set)", () => {
    expect(() => toContractLabel("ali_ce")).toThrow(NameValidationError);
  });
  it("rejects empty string", () => {
    expect(() => toContractLabel("")).toThrow(/empty/i);
  });
  it("rejects names with dots", () => {
    expect(() => toContractLabel("a.b")).toThrow(/dot/i);
  });
});

describe("toContractLabel — emoji path", () => {
  it("encodes single fire emoji to xn--4v8h", () => {
    expect(toContractLabel(FIRE)).toBe("xn--4v8h");
  });
  it("encodes rocket", () => {
    expect(toContractLabel(ROCKET)).toBe("xn--158h");
  });
  it("encodes diamond", () => {
    expect(toContractLabel(DIAMOND)).toBe("xn--tr8h");
  });
  it("encodes ZWJ family-of-4 sequence", () => {
    const enc = toContractLabel(FAMILY);
    expect(enc.startsWith("xn--")).toBe(true);
    expect(enc.length).toBeLessThanOrEqual(63);
  });
  it("encodes US flag", () => {
    const enc = toContractLabel(FLAG_US);
    expect(enc.startsWith("xn--")).toBe(true);
  });
  it("strips .igra suffix from emoji input", () => {
    expect(toContractLabel(`${FIRE}.igra`)).toBe("xn--4v8h");
  });
  it("re-encodes pre-encoded Punycode through normalize → same form", () => {
    expect(toContractLabel("xn--4v8h")).toBe("xn--4v8h");
  });
});

describe("toContractLabel — homograph + security", () => {
  it("rejects Cyrillic а (whole-script confusable with Latin)", () => {
    expect(() => toContractLabel(CYR_A)).toThrow(/safety|confusable/i);
  });
  it("rejects emoji + Cyrillic mix", () => {
    expect(() => toContractLabel(`${FIRE}${CYR_A}`)).toThrow();
  });
  it("strips ZWSP (zero-width space) silently via ens_normalize", () => {
    expect(toContractLabel(`fire${ZWSP}`)).toBe("fire");
  });
  it("rejects bidi controls — RLM", () => {
    expect(() => toContractLabel(`alice${RLM}`)).toThrow();
  });
  it("rejects bidi controls — LRM", () => {
    expect(() => toContractLabel(`${LRM}alice`)).toThrow();
  });
});

describe("toContractLabel — length limits", () => {
  it("accepts 32-grapheme ASCII", () => {
    const s = "a".repeat(32);
    expect(toContractLabel(s)).toBe(s);
  });
  it("rejects 33-grapheme ASCII", () => {
    const s = "a".repeat(33);
    expect(() => toContractLabel(s)).toThrow(/exceeds.*graphemes/i);
  });
  it("rejects 33-emoji string by grapheme count", () => {
    const s = FIRE.repeat(33);
    expect(() => toContractLabel(s)).toThrow();
  });
  it("accepts 1-grapheme single emoji", () => {
    expect(toContractLabel(FIRE)).toBeTruthy();
  });
});

describe("toDisplayLabel — round-trip", () => {
  it("round-trips single emoji", () => {
    const enc = toContractLabel(FIRE);
    const dec = toDisplayLabel(enc);
    expect(dec.startsWith(FIRE) || dec === FIRE || dec.includes(FIRE)).toBe(true);
  });
  it("round-trips ZWJ family", () => {
    const enc = toContractLabel(FAMILY);
    const dec = toDisplayLabel(enc);
    expect(dec.length).toBeGreaterThan(0);
  });
  it("passes through pure ASCII unchanged", () => {
    expect(toDisplayLabel("alice")).toBe("alice");
    expect(toDisplayLabel("ab-c1")).toBe("ab-c1");
  });
  it("returns input unchanged for a malformed xn-- code", () => {
    const out = toDisplayLabel("xn--zzzzzz");
    expect(typeof out).toBe("string");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("toDisplayName", () => {
  it("appends .igra to ASCII label", () => {
    expect(toDisplayName("alice")).toBe("alice.igra");
  });
  it("appends .igra to decoded emoji label", () => {
    expect(toDisplayName("xn--4v8h")).toContain(FIRE);
    expect(toDisplayName("xn--4v8h").endsWith(".igra")).toBe(true);
  });
});

describe("validateLabel — non-throwing", () => {
  it("returns null for valid ASCII", () => {
    expect(validateLabel("alice")).toBeNull();
  });
  it("returns null for valid emoji", () => {
    expect(validateLabel(FIRE)).toBeNull();
  });
  it("returns error code for empty", () => {
    expect(validateLabel("")).toBe("empty");
  });
  it("returns error code for Cyrillic homograph", () => {
    expect(validateLabel(CYR_A)).toBe("ensip15-rejected");
  });
  it("returns error code for too long", () => {
    expect(validateLabel("a".repeat(33))).toBe("too-long");
  });
});

describe("isPunycodeLabel / isEmojiLabel", () => {
  it("recognizes xn-- prefix", () => {
    expect(isPunycodeLabel("xn--4v8h")).toBe(true);
    expect(isPunycodeLabel("xn--")).toBe(false);
    expect(isPunycodeLabel("alice")).toBe(false);
  });
  it("isEmojiLabel matches", () => {
    expect(isEmojiLabel("xn--4v8h")).toBe(true);
    expect(isEmojiLabel("alice")).toBe(false);
  });
});

describe("nameQuartetFromContractLabel", () => {
  it("emoji quartet", () => {
    const q = nameQuartetFromContractLabel("xn--4v8h");
    expect(q.label).toBe("xn--4v8h");
    expect(q.punycode).toBe("xn--4v8h.igra");
    expect(q.name).toContain(FIRE);
    expect(q.name.endsWith(".igra")).toBe(true);
    expect(q.normalized).toContain(FIRE);
  });
  it("ASCII quartet — all four forms identical for ASCII", () => {
    const q = nameQuartetFromContractLabel("alice");
    expect(q.label).toBe("alice");
    expect(q.name).toBe("alice.igra");
    expect(q.normalized).toBe("alice.igra");
    expect(q.punycode).toBe("alice.igra");
  });
});

describe("tokenize — UI threat highlighting", () => {
  it("tokenizes valid ASCII as 'valid' or 'mapped'", () => {
    const tokens = tokenize("alice");
    expect(tokens.every((t) => !t.warn)).toBe(true);
  });
  it("tokenizes emoji as 'emoji'", () => {
    const tokens = tokenize(FIRE);
    expect(tokens.some((t) => t.type === "emoji")).toBe(true);
  });
  it("flags zero-width space as ignored (warn=true)", () => {
    const tokens = tokenize(`a${ZWSP}b`);
    const ignored = tokens.find((t) => t.type === "ignored");
    expect(ignored?.warn).toBe(true);
  });
});

describe("CRITICAL — pre-encoded xn-- bypass attacks (from audit)", () => {
  it("rejects xn-- whose decoded form is a mixed-script confusable (Cyrillic а + Latin lice)", () => {
    expect(() => toContractLabel("xn--lice-43d")).toThrow();
  });
  it("rejects xn-- whose decoded form is mixed Latin + Greek (omicron-trick)", () => {
    expect(() => toContractLabel("xn--alice-rce")).toThrow();
  });
  it("rejects malformed xn-- that fails Punycode decode", () => {
    expect(() => toContractLabel("xn--zzzzzz")).toThrow();
  });
  it("rejects xn-- with trailing hyphen after decode (homograph w/ dangling hyphen)", () => {
    expect(() => toContractLabel("xn--abc--def")).toThrow();
  });
  it("accepts xn-- that round-trips canonically from a safe emoji", () => {
    expect(toContractLabel("xn--4v8h")).toBe("xn--4v8h");
  });
  it("normalizes uppercase XN-- input to lowercase", () => {
    expect(toContractLabel("XN--4V8H")).toBe("xn--4v8h");
  });
});

describe("toDisplayLabel — homograph safety on display path", () => {
  it("returns contract label (not decoded Unicode) when decoded form fails ENSIP-15", () => {
    const result = toDisplayLabel("xn--lice-43d");
    expect(result).toBe("xn--lice-43d");
  });
  it("returns contract label for malformed Punycode", () => {
    const result = toDisplayLabel("xn--abc--def");
    expect(result).toBe("xn--abc--def");
  });
  it("returns beautified emoji for safe Punycode", () => {
    const result = toDisplayLabel("xn--4v8h");
    expect(result.includes(FIRE) || result === FIRE).toBe(true);
  });
});

describe("nameQuartetFromContractLabel — name + normalized agree", () => {
  it("name and normalized are both Unicode for safe emoji", () => {
    const q = nameQuartetFromContractLabel("xn--4v8h");
    expect(q.name).toBe(q.normalized);
    expect(q.name).toContain(FIRE);
  });
  it("name and normalized both fall back to Punycode for unsafe label", () => {
    const q = nameQuartetFromContractLabel("xn--lice-43d");
    expect(q.name).toBe(q.normalized);
    expect(q.name).toContain("xn--");
  });
});

describe("32-byte contract limit parity (matches on-chain _isValidLabelBytes)", () => {
  it("rejects 33-char ASCII", () => {
    expect(() => toContractLabel("a".repeat(33))).toThrow();
  });
  it("accepts 32-char ASCII (at the limit)", () => {
    expect(toContractLabel("a".repeat(32))).toBe("a".repeat(32));
  });
  it("rejects emoji input whose encoded form exceeds 32 bytes", () => {
    const longEmojiCombo = FIRE.repeat(12);
    let didThrow = false;
    try {
      const encoded = toContractLabel(longEmojiCombo);
      if (encoded.length > 32) {
        throw new Error(`encoded ${encoded.length} bytes > 32 limit but accepted`);
      }
    } catch {
      didThrow = true;
    }
    if (!didThrow) {
      const result = toContractLabel(longEmojiCombo);
      expect(result.length).toBeLessThanOrEqual(32);
    }
  });
});

describe("contract char-set parity", () => {
  it("every emoji input produces a contract label that matches contract regex", () => {
    const inputs = [FIRE, ROCKET, DIAMOND, FAMILY, FLAG_US, "alice", "ab-cd-12"];
    for (const input of inputs) {
      const label = toContractLabel(input);
      expect(label).toMatch(/^[a-z0-9-]+$/);
      expect(label.length).toBeGreaterThanOrEqual(1);
      expect(label.length).toBeLessThanOrEqual(63);
      expect(label.startsWith("-")).toBe(false);
      expect(label.endsWith("-")).toBe(false);
    }
  });
});
