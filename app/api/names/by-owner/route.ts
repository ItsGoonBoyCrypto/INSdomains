import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
} from "viem";
import {
  REGISTRY_ADDRESSES,
  REGISTRY_ABI,
  LIVE_TLDS,
  tldSuffix,
  type Tld,
} from "@/lib/contracts";
import { getLogsChunked, parallelReadContract } from "@/lib/api-utils";

export const runtime = "nodejs";

const RPC = process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";
const client = createPublicClient({ transport: http(RPC) });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // 60s edge cache. Most callers (wallet UIs) hit this on connect/refresh,
  // not in a tight loop, so a short cache is enough to dampen RPC load.
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/names/by-owner?address=0x...&tld=igra
 *
 * Returns every .igra (or .ins / .ikas, when those return) NFT that the
 * given address currently owns. Wallets use this on connect to populate the
 * "Your INS names" section.
 *
 * Method: scan `Transfer` events with `to == address`, dedupe tokenIds,
 * then verify current `ownerOf(tokenId) == address` (filters out names
 * the user has since transferred away).
 *
 * Response (200):
 *   {
 *     address: "0x...",
 *     tld: "igra",
 *     count: 3,
 *     names: [
 *       { label: "alice", name: "alice.igra", tokenId: "5",
 *         target: "0x...", mintedAt: 1735000000 },
 *       …
 *     ]
 *   }
 *
 * Response (400 — bad address):
 *   { error: "invalid_address" }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const addrParam = url.searchParams.get("address") ?? "";
  const tldParam = (url.searchParams.get("tld") ?? "igra").toLowerCase();

  // address validation
  if (!/^0x[a-fA-F0-9]{40}$/.test(addrParam)) {
    return Response.json(
      { error: "invalid_address", address: addrParam },
      { status: 400, headers: CORS },
    );
  }
  const address = addrParam.toLowerCase() as Address;

  // tld validation
  if (!(LIVE_TLDS as readonly string[]).includes(tldParam)) {
    return Response.json(
      {
        error: "tld_not_live",
        tld: tldParam,
        live_tlds: LIVE_TLDS,
      },
      { status: 400, headers: CORS },
    );
  }
  const tld = tldParam as Tld;
  const registry = REGISTRY_ADDRESSES[tld];

  try {
    // Scan Transfer(_, to=address, _) since the Registry's deploy block.
    // Chunked because Igra's RPC caps eth_getLogs at 100k blocks.
    const logs = await getLogsChunked({
      client,
      address: registry,
      event: TRANSFER_EVENT,
      args: { to: address },
    });

    // Unique tokenIds touched by this address
    const tokenIdSet = new Set<bigint>();
    for (const log of logs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args?.tokenId as bigint | undefined;
      if (tokenId !== undefined) tokenIdSet.add(tokenId);
    }
    const tokenIds = Array.from(tokenIdSet);

    if (tokenIds.length === 0) {
      return Response.json(
        { address, tld, count: 0, names: [] },
        { headers: CORS },
      );
    }

    // For each candidate tokenId, fetch current owner + label + target +
    // mintedAt. We use parallelReadContract instead of multicall3 because
    // Igra doesn't have multicall3 deployed at the canonical address.
    const reads = tokenIds.flatMap((tokenId) => [
      {
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "ownerOf" as const,
        args: [tokenId],
      },
      {
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "labelOf" as const,
        args: [tokenId],
      },
      {
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "targetOf" as const,
        args: [tokenId],
      },
      {
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "mintedAt" as const,
        args: [tokenId],
      },
    ]);
    const results = await parallelReadContract<unknown>(client, reads);

    // Re-assemble: only include tokens the address still owns
    const names = tokenIds
      .map((tokenId, i) => {
        const ownerR = results[i * 4];
        const labelR = results[i * 4 + 1];
        const targetR = results[i * 4 + 2];
        const mintedAtR = results[i * 4 + 3];
        if (
          ownerR.status !== "success" ||
          (ownerR.result as Address).toLowerCase() !== address
        ) {
          return null;
        }
        const label = labelR.status === "success" ? (labelR.result as string) : "";
        const target = targetR.status === "success" ? (targetR.result as Address) : null;
        const mintedAt =
          mintedAtR.status === "success"
            ? Number((mintedAtR.result as bigint))
            : 0;
        return {
          tokenId: tokenId.toString(),
          label,
          name: `${label}${tldSuffix(tld)}`,
          target,
          mintedAt,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      // Latest mints first
      .sort((a, b) => b.mintedAt - a.mintedAt);

    return Response.json(
      { address, tld, count: names.length, names },
      { headers: CORS },
    );
  } catch (err) {
    return Response.json(
      {
        error: "rpc_error",
        message: (err as Error).message,
      },
      { status: 502, headers: CORS },
    );
  }
}
