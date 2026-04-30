import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
} from "viem";
import {
  REGISTRY_ADDRESSES,
  REGISTRY_ABI,
  MARKETPLACE_ADDRESSES,
  MARKETPLACE_ABI,
  LIVE_TLDS,
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
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

const LISTING_SOLD = parseAbiItem(
  "event ListingSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee)",
);

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/stats
 *
 * Aggregate stats across all live TLDs. Useful for status pages, "X names
 * minted today" badges in wallet UIs, and integration-test smoke checks.
 *
 * Response (200):
 *   {
 *     chain_id: 38833,
 *     network: "Igra L2 mainnet",
 *     live_tlds: ["igra"],
 *     by_tld: {
 *       igra: {
 *         registry: "0x42c2…879c",
 *         marketplace: "0xde8d…3642a",
 *         total_supply: 11,           // total names registered
 *         registry_balance_ikas: "260",  // accumulated mint revenue
 *         marketplace_paused: false,
 *         sale_fee_bps: 200,
 *         feature_fee_bps: 100,
 *         total_volume_ikas: "1.5",   // sum of ListingSold prices over all time
 *         total_sales: 3
 *       }
 *     },
 *     totals: { names: 11, sales: 3, volume_ikas: "1.5" }
 *   }
 */
export async function GET() {
  try {
    const byTld: Record<string, unknown> = {};
    let totalNames = 0;
    let totalSales = 0;
    let totalVolumeWei = 0n;

    for (const tld of LIVE_TLDS) {
      const registry = REGISTRY_ADDRESSES[tld as Tld];
      const marketplace = MARKETPLACE_ADDRESSES[tld as Tld];

      // Parallel reads of registry + marketplace state (no multicall3 on Igra)
      const reads = await parallelReadContract<unknown>(client, [
        {
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "totalSupply" as const,
        },
        {
          address: marketplace,
          abi: MARKETPLACE_ABI,
          functionName: "paused" as const,
        },
        {
          address: marketplace,
          abi: MARKETPLACE_ABI,
          functionName: "saleFeeBps" as const,
        },
        {
          address: marketplace,
          abi: MARKETPLACE_ABI,
          functionName: "featureFeeBps" as const,
        },
      ]);

      const balance = await client.getBalance({ address: registry });

      // Sum of all-time ListingSold prices on this marketplace (chunked
      // because Igra RPC caps eth_getLogs at 100k blocks).
      const sold = await getLogsChunked({
        client,
        address: marketplace,
        event: LISTING_SOLD,
      });
      const tldVolumeWei = sold.reduce(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (sum, l) => sum + (((l as any).args?.price as bigint | undefined) ?? 0n),
        0n,
      );

      const totalSupply =
        reads[0].status === "success" ? Number(reads[0].result as bigint) : 0;
      const paused = reads[1].status === "success" ? (reads[1].result as boolean) : false;
      const saleFeeBps =
        reads[2].status === "success" ? Number(reads[2].result as number) : 0;
      const featureFeeBps =
        reads[3].status === "success" ? Number(reads[3].result as number) : 0;

      byTld[tld] = {
        registry,
        marketplace,
        total_supply: totalSupply,
        registry_balance_ikas: (Number(balance) / 1e18).toString(),
        marketplace_paused: paused,
        sale_fee_bps: saleFeeBps,
        feature_fee_bps: featureFeeBps,
        total_volume_ikas: (Number(tldVolumeWei) / 1e18).toString(),
        total_sales: sold.length,
      };

      totalNames += totalSupply;
      totalSales += sold.length;
      totalVolumeWei += tldVolumeWei;
    }

    return Response.json(
      {
        chain_id: 38833,
        network: "Igra L2 mainnet",
        live_tlds: LIVE_TLDS,
        by_tld: byTld,
        totals: {
          names: totalNames,
          sales: totalSales,
          volume_ikas: (Number(totalVolumeWei) / 1e18).toString(),
        },
      },
      { headers: CORS },
    );
  } catch (err) {
    return Response.json(
      { error: "rpc_error", message: (err as Error).message },
      { status: 502, headers: CORS },
    );
  }
}
