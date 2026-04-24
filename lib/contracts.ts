import type { Address } from "viem";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

/* ──────────────────── Multi-TLD address registry ──────────────────── */
/**
 * INS supports three TLDs that share identical contract logic but live at
 * independent addresses on Igra mainnet: `.ins`, `.igra`, `.ikas`. Each
 * has its own Registry + Marketplace + (optional) ReverseResolver. The
 * frontend fans out reads across all three and lets users pick the TLD
 * they want to register / list / manage.
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

/** True when a TLD has all three contracts deployed + env-wired. */
export function isTldLive(tld: Tld): boolean {
  return (
    REGISTRY_ADDRESSES[tld] !== ZERO &&
    MARKETPLACE_ADDRESSES[tld] !== ZERO
  );
}

/** All TLDs that are fully deployed + env-wired on this build. */
export const LIVE_TLDS: readonly Tld[] = TLDS.filter(isTldLive);

/** Pretty suffix for display, e.g. "ins" → ".ins". */
export function tldSuffix(tld: Tld): string {
  return "." + tld;
}

/* ──────────────────── Legacy single-TLD aliases (.ins) ───────────────
 * Kept so the dozens of existing imports keep working without a big-bang
 * rename. New multi-TLD code should prefer REGISTRY_ADDRESSES[tld] etc.
 */
export const REGISTRY_ADDRESS         = REGISTRY_ADDRESSES.ins;
export const MARKETPLACE_ADDRESS      = MARKETPLACE_ADDRESSES.ins;
export const REVERSE_RESOLVER_ADDRESS = REVERSE_RESOLVER_ADDRESSES.ins;

export const RESOLVER_ADDRESS = (process.env.NEXT_PUBLIC_INS_RESOLVER ??
  ZERO) as Address;

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
