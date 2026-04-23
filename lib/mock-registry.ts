/**
 * Mock registry — used for UI demos until the real Registry.sol is deployed to Igra.
 * Swap to on-chain reads (`useReadContract`) once REGISTRY_ADDRESS is set.
 */
export const TAKEN_NAMES = new Set([
  "alice", "vitalik", "igra", "kaspa", "satoshi", "rooftop", "zealous",
  "goonboy", "kcom", "ziggy", "klaude", "liam", "alpha", "genesis",
]);

/**
 * Reserved names — admin-set list that blocks public registration.
 * Admin can still `adminMint` these to gift to ecosystem users.
 * Seeded here for the UI; real source of truth is the `reserved` mapping
 * on INSRegistry after deploy.
 */
export const RESERVED_NAMES = new Set<string>([
  // ecosystem brands + chain primitives to gift out
  "kcom", "zealous", "zeal", "kasplex", "kasparty", "kasware",
  "kasvault", "kaspafund", "katbridge", "hyperlane",
  "klaudeonkas", "klaudeskills", "ziggy", "iforge", "igraforge",
  "alphaprism", "kasinvest", "profitprowler", "xpolish",
  // short prestige (3-char) held for distribution
  "dao", "dev", "gm", "wgm", "ngmi", "ser", "fam",
]);

export function mockAvailable(label: string): boolean {
  const clean = label.toLowerCase();
  return !TAKEN_NAMES.has(clean) && !RESERVED_NAMES.has(clean);
}

export const DEMO_OWNED = [
  {
    label: "alice",
    target: "0x71C4c2B1f3a2D8E9a4B7cD5a2f6d8a9e0f1b2c3a",
    primary: true,
    mintedAt: "2026-04-12",
    avatarSeed: "A",
  },
  {
    label: "alice-dev",
    target: "0x71C4c2B1f3a2D8E9a4B7cD5a2f6d8a9e0f1b2c3a",
    primary: false,
    mintedAt: "2026-04-15",
    avatarSeed: "D",
  },
  {
    label: "pay-alice",
    target: "0x71C4c2B1f3a2D8E9a4B7cD5a2f6d8a9e0f1b2c3a",
    primary: false,
    mintedAt: "2026-04-18",
    avatarSeed: "P",
  },
] as const;

export const TRENDING = [
  "alice.ins", "vitalik.ins", "grok.ins", "igra.ins",
  "satoshi.ins", "kaspa.ins", "rooftop.ins", "zealous.ins",
  "ziggy.ins", "klaude.ins", "alphaprism.ins", "kcom.ins",
];

export const STATS = {
  registered: 14328,
  owners: 8912,
  dapps: 42,
};
