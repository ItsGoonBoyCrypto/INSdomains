import type { Address } from "viem";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

/* ──────────────────── TLD address registry ──────────────────────────
 * As of 2026-04-26 the platform focuses exclusively on `.igra`. The
 * `.ins` and `.ikas` Registries / Marketplaces / ReverseResolvers
 * remain deployed + Safe-owned as legacy infrastructure (existing
 * holders' NFTs continue to work) but their marketplaces are paused
 * and they no longer surface in the dApp UI.
 *
 * Mechanism: the .ins / .ikas env vars are blanked on the live VPS, so
 * `isTldLive()` returns false for those, `LIVE_TLDS` collapses to
 * `["igra"]`, and every multi-TLD UI loop iterates over .igra only —
 * tabs hide, "apply-all" toggles vanish (gated on liveTldCount >= 2),
 * /domains + /marketplace aggregations become single-TLD.
 *
 * To re-enable a legacy TLD (e.g. for migration), repopulate its three
 * env vars and rebuild — no code change needed.
 */
export const TLDS = ["ins", "igra", "ikas"] as const;
export type Tld = (typeof TLDS)[number];

export const REGISTRY_ADDRESSES: Record<Tld, Address> = {
  ins:  (process.env.NEXT_PUBLIC_INS_REGISTRY       ?? ZERO) as Address,
  igra: (process.env.NEXT_PUBLIC_INS_REGISTRY_IGRA  ?? ZERO) as Address,
  ikas: (process.env.NEXT_PUBLIC_INS_REGISTRY_IKAS  ?? ZERO) as Address,
};

export const MARKETPLACE_ADDRESSES: Record<Tld, Address> = {
  ins:  (process.env.NEXT_PUBLIC_INS_MARKETPLACE       ?? ZERO) as Address,
  igra: (process.env.NEXT_PUBLIC_INS_MARKETPLACE_IGRA  ?? ZERO) as Address,
  ikas: (process.env.NEXT_PUBLIC_INS_MARKETPLACE_IKAS  ?? ZERO) as Address,
};

export const REVERSE_RESOLVER_ADDRESSES: Record<Tld, Address> = {
  ins:  (process.env.NEXT_PUBLIC_INS_REVERSE_RESOLVER       ?? ZERO) as Address,
  igra: (process.env.NEXT_PUBLIC_INS_REVERSE_RESOLVER_IGRA  ?? ZERO) as Address,
  ikas: (process.env.NEXT_PUBLIC_INS_REVERSE_RESOLVER_IKAS  ?? ZERO) as Address,
};

/** A TLD whose Registry is deployed and we can READ on-chain state from
 *  (used for /domains, /api/resolve — anywhere we surface legacy holders'
 *  NFTs even though new registrations are .igra-only). */
export function isTldReadable(tld: Tld): boolean {
  return REGISTRY_ADDRESSES[tld] !== ZERO;
}
export const READABLE_TLDS: readonly Tld[] = TLDS.filter(isTldReadable);

/** Platform-paused legacy TLDs — Registry + Marketplace are deployed but
 *  the dApp UI must not allow new registrations or listings on them. Set
 *  via .igra-only pivot 2026-04-26. */
const PAUSED_TLDS: ReadonlySet<Tld> = new Set(["ins", "ikas"]);

/** True when a TLD has all three contracts deployed + env-wired AND is NOT
 *  in the platform-paused list. Used by /app, /marketplace, /admin to
 *  decide which TLDs accept new actions. */
export function isTldLive(tld: Tld): boolean {
  return (
    REGISTRY_ADDRESSES[tld] !== ZERO &&
    MARKETPLACE_ADDRESSES[tld] !== ZERO &&
    !PAUSED_TLDS.has(tld)
  );
}

/** All TLDs that are fully deployed + env-wired on this build. */
export const LIVE_TLDS: readonly Tld[] = TLDS.filter(isTldLive);

/** Pretty suffix for display, e.g. "ins" → ".ins". */
export function tldSuffix(tld: Tld): string {
  return "." + tld;
}

/* ──────────────────── V2 Registry (.igra) ───────────────────────────
 * V2 adds the dual Annual / Forever tier model + V1 holder migration.
 * Spec: docs/V2_SPEC.md.
 *
 * Activation flow (gated by env vars so V1 keeps shipping until we're
 * ready):
 *   - NEXT_PUBLIC_INS_REGISTRY_IGRA_V2  (deployed contract address)
 *   - NEXT_PUBLIC_INS_V2_ENABLED        ("true" to surface V2 UI)
 *
 * Until both are set, the dApp behaves identically to today's V1-only
 * build. Once `_V2_ENABLED=true`, the homepage register flow + /domains
 * surface V2 as the default registration path, the migration banner
 * appears for V1 holders, and REST API endpoints union V2 + V1 reads.
 *
 * Phase 3 of the V2 rollout (next week) sets both env vars on the VPS;
 * deploy commit is the same one that ships migration UI.
 */
export const REGISTRY_V2_ADDRESS = (process.env.NEXT_PUBLIC_INS_REGISTRY_IGRA_V2 ?? ZERO) as Address;

/** True when the V2 Registry is deployed AND the platform has flipped
 *  `NEXT_PUBLIC_INS_V2_ENABLED=true`. Code paths that should only run
 *  after a publicly-announced V2 launch gate on this. */
export function isV2Enabled(): boolean {
  return REGISTRY_V2_ADDRESS !== ZERO && process.env.NEXT_PUBLIC_INS_V2_ENABLED === "true";
}

/** True when the V2 Registry is deployed (regardless of the public-launch
 *  flag). REST API routes use this to start unioning V2 + V1 reads as
 *  soon as deployment lands, without waiting for the dApp UI flip. */
export function isV2Deployed(): boolean {
  return REGISTRY_V2_ADDRESS !== ZERO;
}

/* ──────────────────── Legacy single-TLD aliases (.igra primary) ──────
 * Kept so the dozens of existing imports keep working without a big-bang
 * rename. New code should prefer REGISTRY_ADDRESSES[tld] etc.
 *
 * Pointed at .igra now (not .ins) since the platform focuses on .igra
 * post-2026-04-26 pivot.
 */
export const REGISTRY_ADDRESS         = REGISTRY_ADDRESSES.igra;
export const MARKETPLACE_ADDRESS      = MARKETPLACE_ADDRESSES.igra;
export const REVERSE_RESOLVER_ADDRESS = REVERSE_RESOLVER_ADDRESSES.igra;

export const RESOLVER_ADDRESS = (process.env.NEXT_PUBLIC_INS_RESOLVER ??
  ZERO) as Address;

/* ──────────────────── Subname extension (.igra) ─────────────────────
 * Optional layer that lets owners of top-level .igra names mint free
 * subnames (e.g. pay.alice.igra). Ships in this codebase but the on-chain
 * contract launches with `enabled = false`, and the env var is unset
 * until the v1.1 activation (~1 month post-mainnet).
 *
 * Frontend code MUST gate on BOTH:
 *   (a) SUBNAME_EXTENSION_ADDRESS !== ZERO  (env var set)
 *   (b) the contract's `enabled()` getter returning true
 * so accidental UI surfacing before activation is impossible.
 */
export const SUBNAME_EXTENSION_ADDRESS = (process.env.NEXT_PUBLIC_INS_SUBNAME_EXTENSION_IGRA ??
  ZERO) as Address;

export const SUBNAME_EXTENSION_ABI = [
  // ── reads ─────────────────────────────────────────────
  { type: "function", name: "enabled",       stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "owner",         stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalSupply",   stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "parentRegistry",stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "subnameOf",     stateMutability: "view",
    inputs: [{ name: "parentTokenId", type: "uint256" }, { name: "subLabel", type: "string" }],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "parentOf",      stateMutability: "view", inputs: [{ name: "subTokenId", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "subLabelOf",    stateMutability: "view", inputs: [{ name: "subTokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "lockedParents", stateMutability: "view", inputs: [{ name: "parentTokenId", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "targetOf",      stateMutability: "view", inputs: [{ name: "subTokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "fullName",      stateMutability: "view", inputs: [{ name: "subTokenId", type: "uint256" }], outputs: [{ type: "string" }] },
  { type: "function", name: "ownerOf",       stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "balanceOf",     stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  // ── writes ────────────────────────────────────────────
  { type: "function", name: "mintSubname", stateMutability: "nonpayable",
    inputs: [
      { name: "parentTokenId", type: "uint256" },
      { name: "subLabel", type: "string" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "subTokenId", type: "uint256" }] },
  { type: "function", name: "setSubnameTarget", stateMutability: "nonpayable",
    inputs: [{ name: "subTokenId", type: "uint256" }, { name: "newTarget", type: "address" }],
    outputs: [] },
  { type: "function", name: "lockParentSubnames", stateMutability: "nonpayable",
    inputs: [{ name: "parentTokenId", type: "uint256" }, { name: "locked", type: "bool" }],
    outputs: [] },
  { type: "function", name: "transferFrom", stateMutability: "nonpayable",
    inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }],
    outputs: [] },
  // ── admin (Safe) ──────────────────────────────────────
  { type: "function", name: "setEnabled", stateMutability: "nonpayable",
    inputs: [{ name: "_enabled", type: "bool" }], outputs: [] },
  { type: "function", name: "transferOwnership", stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }], outputs: [] },
  // ── events ────────────────────────────────────────────
  { type: "event", name: "SubnameMinted", anonymous: false,
    inputs: [
      { name: "parentTokenId", type: "uint256", indexed: true },
      { name: "subLabel", type: "string", indexed: true },
      { name: "subTokenId", type: "uint256", indexed: true },
      { name: "to", type: "address", indexed: false },
    ] },
  { type: "event", name: "TargetSet", anonymous: false,
    inputs: [
      { name: "subTokenId", type: "uint256", indexed: true },
      { name: "target", type: "address", indexed: true },
    ] },
  { type: "event", name: "ParentLockSet", anonymous: false,
    inputs: [
      { name: "parentTokenId", type: "uint256", indexed: true },
      { name: "locked", type: "bool", indexed: false },
    ] },
  { type: "event", name: "EnabledSet", anonymous: false,
    inputs: [{ name: "enabled", type: "bool", indexed: false }] },
] as const;

/** Base tier price (5-32 char) in iKAS — kept for backwards-compat display. */
export const BASE_PRICE_IKAS = Number(process.env.NEXT_PUBLIC_BASE_PRICE_IKAS ?? 10);

export const REGISTRY_ABI = [
  // ── reads ─────────────────────────────────────────────
  {
    type: "function",
    name: "available",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "priceFor",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "reserved",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "lengthPrice",
    stateMutability: "view",
    inputs: [{ name: "bucket", type: "uint8" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "premiumPrice",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOfName",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "tokenIdOf",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "labelOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "targetOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "mintedAt",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [{ name: "label", type: "string" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  // ── register ──────────────────────────────────────────
  {
    type: "function",
    name: "register",
    stateMutability: "payable",
    inputs: [
      { name: "label", type: "string" },
      { name: "target", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "setTarget",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "target", type: "address" },
    ],
    outputs: [],
  },
  // ── ERC-721 approval (for marketplace listing) ────────
  {
    type: "function",
    name: "isApprovedForAll",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "setApprovalForAll",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getApproved",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
  // ── admin ─────────────────────────────────────────────
  {
    type: "function",
    name: "adminMint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "to", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "setReserved",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "isReserved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setReservedBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "labels", type: "string[]" },
      { name: "isReserved", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setLengthPrice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bucket", type: "uint8" },
      { name: "price", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPremiumPrice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "label", type: "string" },
      { name: "price", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "transferOwnership",
    stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },
  // ── events ────────────────────────────────────────────
  {
    type: "event",
    name: "Registered",
    inputs: [
      { name: "label", type: "string", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "target", type: "address", indexed: false },
      { name: "paid", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AdminMinted",
    inputs: [
      { name: "label", type: "string", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "mintedBy", type: "address", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Reserved",
    inputs: [
      { name: "label", type: "string", indexed: true },
      { name: "isReserved", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event",
    name: "TargetSet",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "target", type: "address", indexed: true },
    ],
  },
] as const;

export const RESOLVER_ABI = [
  {
    type: "function",
    name: "addr",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    outputs: [{ type: "string" }],
  },
] as const;

export const MARKETPLACE_ABI = [
  // ── reads ──────────────────────────────
  {
    type: "function",
    name: "listings",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "seller", type: "address" },
      { name: "expiry", type: "uint64" },
      { name: "featured", type: "bool" },
      { name: "active", type: "bool" },
      { name: "price", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getActiveListing",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "seller", type: "address" },
          { name: "expiry", type: "uint64" },
          { name: "featured", type: "bool" },
          { name: "active", type: "bool" },
          { name: "price", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "saleFeeOn",
    stateMutability: "view",
    inputs: [{ name: "price", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "featureFeeOn",
    stateMutability: "view",
    inputs: [{ name: "price", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  { type: "function", name: "saleFeeBps",    stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }]  },
  { type: "function", name: "featureFeeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }]  },
  { type: "function", name: "treasury",      stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "owner",         stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "paused",        stateMutability: "view", inputs: [], outputs: [{ type: "bool" }]    },
  { type: "function", name: "registry",      stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  // ── writes ─────────────────────────────
  {
    type: "function",
    name: "createListing",
    stateMutability: "payable",
    inputs: [
      { name: "tokenId",  type: "uint256" },
      { name: "price",    type: "uint256" },
      { name: "expiry",   type: "uint64"  },
      { name: "featured", type: "bool"    },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateListing",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId",   type: "uint256" },
      { name: "newPrice",  type: "uint256" },
      { name: "newExpiry", type: "uint64"  },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelListing",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buyListing",
    stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  // ── admin ──────────────────────────────
  { type: "function", name: "setTreasury",      stateMutability: "nonpayable", inputs: [{ name: "newTreasury", type: "address" }], outputs: [] },
  { type: "function", name: "setSaleFeeBps",    stateMutability: "nonpayable", inputs: [{ name: "newBps",      type: "uint16"  }], outputs: [] },
  { type: "function", name: "setFeatureFeeBps", stateMutability: "nonpayable", inputs: [{ name: "newBps",      type: "uint16"  }], outputs: [] },
  { type: "function", name: "setPaused",        stateMutability: "nonpayable", inputs: [{ name: "v",           type: "bool"    }], outputs: [] },
  { type: "function", name: "transferOwnership",stateMutability: "nonpayable", inputs: [{ name: "newOwner",    type: "address" }], outputs: [] },
  // ── events ─────────────────────────────
  {
    type: "event",
    name: "ListingCreated",
    inputs: [
      { name: "tokenId",  type: "uint256", indexed: true },
      { name: "seller",   type: "address", indexed: true },
      { name: "price",    type: "uint256", indexed: false },
      { name: "expiry",   type: "uint64",  indexed: false },
      { name: "featured", type: "bool",    indexed: false },
    ],
  },
  {
    type: "event",
    name: "ListingSold",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seller",  type: "address", indexed: true },
      { name: "buyer",   type: "address", indexed: true },
      { name: "price",   type: "uint256", indexed: false },
      { name: "fee",     type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ListingCancelled",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seller",  type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "ListingUpdated",
    inputs: [
      { name: "tokenId",   type: "uint256", indexed: true },
      { name: "seller",    type: "address", indexed: true },
      { name: "newPrice",  type: "uint256", indexed: false },
      { name: "newExpiry", type: "uint64",  indexed: false },
    ],
  },
  {
    type: "event",
    name: "ListingFeatured",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "seller",  type: "address", indexed: true },
      { name: "feePaid", type: "uint256", indexed: false },
    ],
  },
] as const;

export const REVERSE_RESOLVER_ABI = [
  {
    type: "function",
    name: "primaryName",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "primaryTokenId",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "hasPrimary",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "registry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "setPrimary",
    stateMutability: "nonpayable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "clearPrimary",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "event",
    name: "PrimarySet",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "label", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PrimaryCleared",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "previousTokenId", type: "uint256", indexed: true },
    ],
  },
] as const;

/* ──────────────────── V2 Registry ABI ────────────────────────────────
 * Strict superset of REGISTRY_ABI — adds the dual-tier surface
 * (registerAnnual, renew, extendToForever, claimV1Forever) plus the
 * Annual admin functions and new events. Use this ABI when reading
 * from / writing to the V2 Registry; REGISTRY_ABI is V1-only.
 */
export const REGISTRY_V2_ABI = [
  // ── reads (shared with V1) ────────────────────────────
  { type: "function", name: "available",         stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "bool" }] },
  { type: "function", name: "availableAnnual",   stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "bool" }] },
  { type: "function", name: "priceFor",          stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "priceAnnualFor",    stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "reserved",          stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "bool" }] },
  { type: "function", name: "lengthPrice",       stateMutability: "view", inputs: [{ name: "bucket", type: "uint8" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "lengthPriceAnnual", stateMutability: "view", inputs: [{ name: "bucket", type: "uint8" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "premiumPrice",      stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "premiumPriceAnnual",stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "ownerOfName",       stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "address" }] },
  { type: "function", name: "ownerOf",           stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }],outputs: [{ type: "address" }] },
  { type: "function", name: "tokenIdOf",         stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "labelOf",           stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }],outputs: [{ type: "string" }] },
  { type: "function", name: "targetOf",          stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }],outputs: [{ type: "address" }] },
  { type: "function", name: "mintedAt",          stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }],outputs: [{ type: "uint256" }] },
  { type: "function", name: "expiresAt",         stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }],outputs: [{ type: "uint256" }] },
  { type: "function", name: "isExpired",         stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }],outputs: [{ type: "bool" }] },
  { type: "function", name: "isInGrace",         stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }],outputs: [{ type: "bool" }] },
  { type: "function", name: "resolve",           stateMutability: "view", inputs: [{ name: "label", type: "string" }],   outputs: [{ type: "address" }] },
  { type: "function", name: "totalSupply",       stateMutability: "view", inputs: [],                                    outputs: [{ type: "uint256" }] },
  { type: "function", name: "owner",             stateMutability: "view", inputs: [],                                    outputs: [{ type: "address" }] },
  { type: "function", name: "v1Registry",        stateMutability: "view", inputs: [],                                    outputs: [{ type: "address" }] },
  { type: "function", name: "migrated",          stateMutability: "view", inputs: [{ name: "v1TokenId", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "gracePeriodSec",    stateMutability: "view", inputs: [],                                    outputs: [{ type: "uint256" }] },

  // ── register / renew / migrate ────────────────────────
  { type: "function", name: "register",          stateMutability: "payable",
    inputs: [{ name: "label", type: "string" }, { name: "target", type: "address" }],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "registerAnnual",    stateMutability: "payable",
    inputs: [{ name: "label", type: "string" }, { name: "target", type: "address" }, { name: "yearsCount", type: "uint256" }],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "renew",             stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }, { name: "yearsToAdd", type: "uint256" }],
    outputs: [] },
  { type: "function", name: "extendToForever",   stateMutability: "payable",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [] },
  { type: "function", name: "claimV1Forever",    stateMutability: "nonpayable",
    inputs: [{ name: "v1TokenId", type: "uint256" }, { name: "target", type: "address" }],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "setTarget",         stateMutability: "nonpayable",
    inputs: [{ name: "label", type: "string" }, { name: "target", type: "address" }],
    outputs: [] },

  // ── ERC-721 surface (same shape as V1) ────────────────
  { type: "function", name: "balanceOf",         stateMutability: "view", inputs: [{ name: "who", type: "address" }],   outputs: [{ type: "uint256" }] },
  { type: "function", name: "isApprovedForAll",  stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "operator", type: "address" }],
    outputs: [{ type: "bool" }] },
  { type: "function", name: "setApprovalForAll", stateMutability: "nonpayable",
    inputs: [{ name: "operator", type: "address" }, { name: "approved", type: "bool" }],
    outputs: [] },
  { type: "function", name: "getApproved",       stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "address" }] },
  { type: "function", name: "transferFrom",      stateMutability: "nonpayable",
    inputs: [{ name: "from", type: "address" }, { name: "to", type: "address" }, { name: "tokenId", type: "uint256" }],
    outputs: [] },
  { type: "function", name: "tokenURI",          stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ type: "string" }] },

  // ── admin (Safe) ──────────────────────────────────────
  { type: "function", name: "adminMint",                  stateMutability: "nonpayable",
    inputs: [{ name: "label", type: "string" }, { name: "to", type: "address" }],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "adminMintAnnual",            stateMutability: "nonpayable",
    inputs: [{ name: "label", type: "string" }, { name: "to", type: "address" }, { name: "yearsCount", type: "uint256" }],
    outputs: [{ type: "uint256" }] },
  { type: "function", name: "setReserved",                stateMutability: "nonpayable",
    inputs: [{ name: "label", type: "string" }, { name: "isReserved", type: "bool" }], outputs: [] },
  { type: "function", name: "setReservedBatch",           stateMutability: "nonpayable",
    inputs: [{ name: "labels", type: "string[]" }, { name: "isReserved", type: "bool" }], outputs: [] },
  { type: "function", name: "setLengthPrice",             stateMutability: "nonpayable",
    inputs: [{ name: "bucket", type: "uint8" }, { name: "price", type: "uint256" }], outputs: [] },
  { type: "function", name: "setLengthPriceAnnual",       stateMutability: "nonpayable",
    inputs: [{ name: "bucket", type: "uint8" }, { name: "price", type: "uint256" }], outputs: [] },
  { type: "function", name: "setLengthPriceAnnualBatch",  stateMutability: "nonpayable",
    inputs: [{ name: "buckets", type: "uint8[]" }, { name: "prices", type: "uint256[]" }], outputs: [] },
  { type: "function", name: "setPremiumPrice",            stateMutability: "nonpayable",
    inputs: [{ name: "label", type: "string" }, { name: "price", type: "uint256" }], outputs: [] },
  { type: "function", name: "setPremiumPriceAnnual",      stateMutability: "nonpayable",
    inputs: [{ name: "label", type: "string" }, { name: "price", type: "uint256" }], outputs: [] },
  { type: "function", name: "setGracePeriod",             stateMutability: "nonpayable",
    inputs: [{ name: "sec", type: "uint256" }], outputs: [] },
  { type: "function", name: "withdraw",                   stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }], outputs: [] },
  { type: "function", name: "transferOwnership",          stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }], outputs: [] },

  // ── events (additions only — V1 events still fire too) ─
  { type: "event", name: "Registered",
    inputs: [
      { name: "label",  type: "string",  indexed: true },
      { name: "owner",  type: "address", indexed: true },
      { name: "target", type: "address", indexed: false },
      { name: "paid",   type: "uint256", indexed: false },
    ] },
  { type: "event", name: "RegisteredAnnual",
    inputs: [
      { name: "label",      type: "string",  indexed: true },
      { name: "owner",      type: "address", indexed: true },
      { name: "target",     type: "address", indexed: false },
      { name: "paid",       type: "uint256", indexed: false },
      { name: "expiresAt",  type: "uint256", indexed: false },
      { name: "yearsCount", type: "uint256", indexed: false },
    ] },
  { type: "event", name: "Renewed",
    inputs: [
      { name: "tokenId",       type: "uint256", indexed: true },
      { name: "payer",         type: "address", indexed: true },
      { name: "yearsAdded",    type: "uint256", indexed: false },
      { name: "paid",          type: "uint256", indexed: false },
      { name: "newExpiresAt",  type: "uint256", indexed: false },
    ] },
  { type: "event", name: "ExtendedToForever",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "payer",   type: "address", indexed: true },
      { name: "paid",    type: "uint256", indexed: false },
    ] },
  { type: "event", name: "V1Migrated",
    inputs: [
      { name: "v1TokenId", type: "uint256", indexed: true },
      { name: "v2TokenId", type: "uint256", indexed: true },
      { name: "label",     type: "string",  indexed: false },
      { name: "owner",     type: "address", indexed: false },
    ] },
  { type: "event", name: "Reclaimed",
    inputs: [
      { name: "label",      type: "string",  indexed: true },
      { name: "oldTokenId", type: "uint256", indexed: true },
      { name: "newTokenId", type: "uint256", indexed: true },
      { name: "newOwner",   type: "address", indexed: false },
    ] },
  { type: "event", name: "Transfer",
    inputs: [
      { name: "from",    type: "address", indexed: true },
      { name: "to",      type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ] },
  { type: "event", name: "TargetSet",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "target",  type: "address", indexed: true },
    ] },
] as const;
