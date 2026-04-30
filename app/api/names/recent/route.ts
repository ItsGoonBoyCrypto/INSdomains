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
  // Recent mints can be cached briefly — explorers polling this don't need
  // sub-30s freshness; the activity bot is what gives real-time signal.
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

/// ERC-721 mint = Transfer(from = 0x000…, to = recipient, tokenId)
const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);
const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/names/recent?limit=50&tld=igra
 *
 * Returns the most recent N names registered on the chosen TLD's Registry.
 * Useful for explorers, "newly registered" feeds, and integration smoke
 * tests by wallet devs who want to verify they can read live state.
 *
 * Response (200):
 *   {
 *     tld: "igra",
 *     count: 50,
 *     names: [
 *       { tokenId: "11", label: "newest", name: "newest.igra",
 *         owner: "0x...", target: "0x...", mintedAt: 1735000000,
 *         blockNumber: "5176410", txHash: "0x..." },
 *       …
 *     ]
 *   }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const tldParam = (url.searchParams.get("tld") ?? "igra").toLowerCase();

  if (!(LIVE_TLDS as readonly string[]).includes(tldParam)) {
    return Response.json(
      { error: "tld_not_live", tld: tldParam, live_tlds: LIVE_TLDS },
      { status: 400, headers: CORS },
    );
  }
  const tld = tldParam as Tld;
  const registry = REGISTRY_ADDRESSES[tld];

  try {
    // Mint events = Transfer with from == 0x0. Chunked since Igra RPC caps
    // eth_getLogs at 100k blocks per call.
    const logs = await getLogsChunked({
      client,
      address: registry,
      event: TRANSFER_EVENT,
      args: { from: ZERO_ADDR as Address },
    });

    // Most recent first; cap to `limit`. blockNumber is non-null on mined
    // logs (we never query pending).
    const recent = logs
      .sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)))
      .slice(0, limit);

    if (recent.length === 0) {
      return Response.json({ tld, count: 0, names: [] }, { headers: CORS });
    }

    // Pull label + target + mintedAt + current owner for each tokenId
    const reads = recent.flatMap((log) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args.tokenId as bigint;
      return [
        {
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "labelOf" as const,
          args: [tokenId],
        },
        {
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "ownerOf" as const,
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
      ];
    });
    const results = await parallelReadContract<unknown>(client, reads);

    const names = recent.map((log, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args.tokenId as bigint;
      const labelR = results[i * 4];
      const ownerR = results[i * 4 + 1];
      const targetR = results[i * 4 + 2];
      const mintedAtR = results[i * 4 + 3];
      const label = labelR.status === "success" ? (labelR.result as string) : "";
      return {
        tokenId: tokenId.toString(),
        label,
        name: `${label}${tldSuffix(tld)}`,
        owner: ownerR.status === "success" ? (ownerR.result as Address) : null,
        target: targetR.status === "success" ? (targetR.result as Address) : null,
        mintedAt:
          mintedAtR.status === "success" ? Number(mintedAtR.result as bigint) : 0,
        blockNumber: (log.blockNumber ?? 0n).toString(),
        txHash: log.transactionHash,
      };
    });

    return Response.json(
      { tld, count: names.length, names },
      { headers: CORS },
    );
  } catch (err) {
    return Response.json(
      { error: "rpc_error", message: (err as Error).message },
      { status: 502, headers: CORS },
    );
  }
}
