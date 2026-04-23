import type { Address } from "viem";

export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_INS_REGISTRY ??
  "0x0000000000000000000000000000000000000000") as Address;

export const RESOLVER_ADDRESS = (process.env.NEXT_PUBLIC_INS_RESOLVER ??
  "0x0000000000000000000000000000000000000000") as Address;

export const REVERSE_RESOLVER_ADDRESS = (process.env.NEXT_PUBLIC_INS_REVERSE_RESOLVER ??
  "0x0000000000000000000000000000000000000000") as Address;

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
