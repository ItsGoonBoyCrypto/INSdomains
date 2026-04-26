/**
 * Server-side INS resolver. Reads tokenIdOf / ownerOf / targetOf for a given
 * (label, tld) directly via viem against the Igra mainnet RPC.
 *
 * Used by the public profile page (/n/[name]) and per-name OG image generator.
 * Never bundles to the client.
 */
import { createPublicClient, http, type Address } from "viem";
import {
  REGISTRY_ABI,
  REGISTRY_ADDRESSES,
  type Tld,
} from "./contracts";

const RPC = process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

const client = createPublicClient({ transport: http(RPC) });

export type ResolveResult = {
  label: string;
  tld: Tld;
  exists: boolean;
  tokenId?: bigint;
  owner?: Address;
  address?: Address; // resolver target
};

/**
 * Look up `(label, tld)` on the Igra Registry. Returns `exists: false` when the
 * name has not been minted, or when the Registry isn't deployed for the given
 * env (e.g. local dev without contract addresses set).
 */
export async function resolveName(label: string, tld: Tld): Promise<ResolveResult> {
  const registry = REGISTRY_ADDRESSES[tld];
  if (!registry || registry === ZERO) {
    return { label, tld, exists: false };
  }

  try {
    const tokenId = (await client.readContract({
      address: registry,
      abi: REGISTRY_ABI,
      functionName: "tokenIdOf",
      args: [label],
    })) as bigint;

    if (tokenId === 0n) {
      return { label, tld, exists: false };
    }

    const [owner, target] = await Promise.all([
      client.readContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "ownerOf",
        args: [tokenId],
      }) as Promise<Address>,
      client.readContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "targetOf",
        args: [tokenId],
      }) as Promise<Address>,
    ]);

    return { label, tld, exists: true, tokenId, owner, address: target };
  } catch {
    // RPC hiccup — treat as not-found rather than crashing the page.
    return { label, tld, exists: false };
  }
}
