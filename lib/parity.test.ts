import { describe, it, expect } from "vitest";
import { isValidLabel } from "./names";
import { LENGTH_PRICE } from "./pricing";

/**
 * CONTRACT PARITY GUARD.
 *
 * The dApp must accept/reject and price names identically to the on-chain
 * INSRegistryIgraV2. The absence of this exact check is how the 3-char-floor
 * bug shipped: the frontend silently rejected the 1- and 2-char names the
 * contract sells for 4000 / 2000 iKAS (its single most valuable inventory).
 *
 * If this suite goes red, the frontend has drifted from the contract — fix
 * the frontend, never weaken the oracle.
 */

/**
 * Faithful port of INSRegistryIgraV2._isValidLabelBytes (contracts/src,
 * lines ~698-710). This is the on-chain source of truth; the frontend's
 * isValidLabel must agree with it for every label the dApp would submit.
 */
function contractAccepts(label: string): boolean {
  const b = Buffer.from(label, "utf8");
  const len = b.length;
  if (len < 1 || len > 32) return false; // contract: len < 1 || len > 32
  if (b[0] === 0x2d || b[len - 1] === 0x2d) return false; // no leading/trailing '-'
  for (const c of b) {
    const isAZ = c >= 0x61 && c <= 0x7a; // a-z
    const is09 = c >= 0x30 && c <= 0x39; // 0-9
    const isDash = c === 0x2d; // '-'
    if (!(isAZ || is09 || isDash)) return false;
  }
  return true;
}

describe("label validation parity with INSRegistryIgraV2", () => {
  const accept = [
    "x", "a", "1", "0", "ab", "12", "abc", "a-b", "a--b", "ab12", "z9",
    "a".repeat(32),
  ];
  const reject = [
    "", "a".repeat(33), "-a", "a-", "-", "--", "a.b", "a_b", "a b", "a@b",
    "café",
  ];

  it.each(accept)("accepts %j", (s) => {
    expect(isValidLabel(s)).toBe(true);
    expect(contractAccepts(s)).toBe(true);
  });

  it.each(reject)("rejects %j", (s) => {
    expect(isValidLabel(s)).toBe(false);
  });

  it("REGRESSION: 1- and 2-char names are mintable", () => {
    // These were unmintable for months because isValidLabel enforced a
    // 3-char floor copied from ENS. Never let that floor come back.
    expect(isValidLabel("x")).toBe(true); // ultra-premium, 4000 iKAS forever
    expect(isValidLabel("ab")).toBe(true); // premium, 2000 iKAS forever
  });

  it("fuzz: isValidLabel agrees with the contract oracle (2000 cases)", () => {
    // Mix of valid + invalid bytes. Dots are skipped because isValidLabel
    // strips a trailing .igra/.ins suffix before validating (a UI nicety the
    // raw byte oracle doesn't model).
    const alphabet = "abcDEF012-._@ ";
    for (let i = 0; i < 2000; i++) {
      const len = Math.floor(Math.random() * 6);
      let s = "";
      for (let j = 0; j < len; j++) {
        s += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      if (s.includes(".")) continue;
      // isValidLabel lowercases internally, so compare against the
      // lowercased label the dApp would actually submit on-chain.
      expect(isValidLabel(s)).toBe(contractAccepts(s.toLowerCase()));
    }
  });
});

describe("length-tier pricing parity with INSRegistryIgraV2.lengthPrice", () => {
  it("preview table matches the on-chain Forever schedule exactly", () => {
    // Mirror of lengthPrice[1..5] in the contract constructor. The live mint
    // price is always read on-chain via priceFor; this table only drives the
    // instant preview chip — but it must still match so buyers see the truth.
    expect(LENGTH_PRICE).toEqual({ 1: 4000, 2: 2000, 3: 1200, 4: 800, 5: 500 });
  });
});
