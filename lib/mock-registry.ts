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

// Pre-connect demo cards for /domains. Use generic placeholder labels so
// new visitors immediately understand "this is what your dashboard looks
// like" rather than thinking these are real names someone else owns.
export const DEMO_OWNED = [
  {
    label: "yourname",
    target: "0x71C4c2B1f3a2D8E9a4B7cD5a2f6d8a9e0f1b2c3a",
    primary: true,
    mintedAt: "2026-04-12",
    avatarSeed: "Y",
  },
  {
    label: "yourname-dev",
    target: "0x71C4c2B1f3a2D8E9a4B7cD5a2f6d8a9e0f1b2c3a",
    primary: false,
    mintedAt: "2026-04-15",
    avatarSeed: "D",
  },
  {
    label: "pay-yourname",
    target: "0x71C4c2B1f3a2D8E9a4B7cD5a2f6d8a9e0f1b2c3a",
    primary: false,
    mintedAt: "2026-04-18",
    avatarSeed: "P",
  },
] as const;

// .igra-only marquee for the homepage — leads with the 5 hero ecosystem
// names (same pills as the HeroSearch suggestions) and rounds out with
// notable reserved labels to keep the carousel rich without ever surfacing
// a name a sniper could front-run. Every label here is reserved on chain.
export const TRENDING = [
  // 5 hero ecosystem names (also live as HeroSearch pills)
  "igranetwork.igra", "insdomains.igra", "zealous.igra",
  "kaskad.igra",      "kaspacom.igra",
  // Reserved ecosystem partners + chain primitives — all on the
  // 107-label reserved list (docs/SAFE_TX_RESERVED_NAMES.md)
  "kasware.igra",     "kastle.igra",     "kasperia.igra",
  "katbridge.igra",   "kspr.igra",       "kasplex.igra",
  "kaspa.igra",       "igra.igra",       "igralabs.igra",
  "klaudeonkas.igra", "iforge.igra",     "alphaprism.igra",
];

// Former mock STATS export removed 2026-04-24 — homepage StatsRow now reads
// live values on-chain (totalSupply / unique owners / active listings).
