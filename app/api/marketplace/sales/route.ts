import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
  type Log,
} from "viem";
import {
  REGISTRY_ABI,
  REGISTRY_V2_ABI,
  REGISTRY_V2_ADDRESS,
  REGISTRY_ADDRESSES,
  MARKETPLACE_ADDRESSES,
  MARKETPLACE_V2_ADDRESS,
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
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

const LISTING_SOLD = parseAbiItem(
  "event ListingSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price, uint256 fee)",
);

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/marketplace/sales?tld=igra&limit=20&offset=0
 *
 * Historical sales feed — unions V1 + V2 marketplaces, decodes each
 * `ListingSold` event, enriches with the sold token's `.igra` label +
 * the block timestamp, sorts newest-first, paginates.
 *
 * Response:
 *   {
 *     sales: [{
 *       token_id, label, name,     // e.g. 12, "alice", "alice.igra"
 *       seller, buyer,             // 0x… addresses
 *       price_ikas, fee_ikas,      // float strings, 6-dp
 *       block, tx_hash,            // number, 0x… hash
 *       timestamp,                 // ISO 8601 UTC
 *       registry_version,          // "v1" | "v2"
 *     }],
 *     total: <int>,
 *     limit: <int>,
 *     offset: <int>,
 *   }
 *
 * Cached at edge for 60s + 5-minute stale-while-revalidate — new sales
 * appear within a minute of the block landing on average.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit  = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit")  ?? "20", 10)));
  const offset =              Math.max(0, parseInt(url.searchParams.get("offset") ?? "0",  10));
  const tld = (url.searchParams.get("tld") ?? "igra") as Tld;

  if (!LIVE_TLDS.includes(tld)) {
    return json({ error: `tld '${tld}' not live` }, 400);
  }

  try {
    const v1MarketAddr = MARKETPLACE_ADDRESSES[tld] as Address | undefined;
    const v2MarketAddr = MARKETPLACE_V2_ADDRESS as Address | undefined;
    const v1RegAddr    = REGISTRY_ADDRESSES[tld] as Address | undefined;
    const v2RegAddr    = REGISTRY_V2_ADDRESS   as Address | undefined;

    const logSets = await Promise.all([
      v2MarketAddr
        ? getLogsChunked({ client, address: v2MarketAddr, event: LISTING_SOLD })
        : Promise.resolve([]),
      v1MarketAddr
        ? getLogsChunked({ client, address: v1MarketAddr, event: LISTING_SOLD })
        : Promise.resolve([]),
    ]);

    type SoldLog = Log<bigint, number, false, typeof LISTING_SOLD, true, [typeof LISTING_SOLD]> & {
      args: { tokenId: bigint; seller: Address; buyer: Address; price: bigint; fee: bigint };
    };

    const tagged: Array<{ log: SoldLog; version: "v1" | "v2" }> = [
      ...(logSets[0] as SoldLog[]).map((log) => ({ log, version: "v2" as const })),
      ...(logSets[1] as SoldLog[]).map((log) => ({ log, version: "v1" as const })),
    ];

    // Newest first.
    tagged.sort((a, b) => Number(b.log.blockNumber - a.log.blockNumber));
    const total = tagged.length;
    const page = tagged.slice(offset, offset + limit);

    if (page.length === 0) {
      return json({ sales: [], total, limit, offset });
    }

    // Enrichment — labels + timestamps in parallel per-version.
    const v2Slice = page.filter((p) => p.version === "v2");
    const v1Slice = page.filter((p) => p.version === "v1");

    const v2Labels =
      v2Slice.length && v2RegAddr
        ? await parallelReadContract<string>(
            client,
            v2Slice.map((p) => ({
              address: v2RegAddr,
              abi: REGISTRY_V2_ABI,
              functionName: "labelOf",
              args: [p.log.args.tokenId],
            })),
          )
        : [];
    const v1Labels =
      v1Slice.length && v1RegAddr
        ? await parallelReadContract<string>(
            client,
            v1Slice.map((p) => ({
              address: v1RegAddr,
              abi: REGISTRY_ABI,
              functionName: "labelOf",
              args: [p.log.args.tokenId],
            })),
          )
        : [];

    const pick = (r: { status: string; result?: string } | undefined) =>
      r && r.status === "success" ? (r.result as string) ?? "" : "";
    const labelByEntry = new Map<SoldLog, string>();
    v2Slice.forEach((p, i) => labelByEntry.set(p.log, pick(v2Labels[i])));
    v1Slice.forEach((p, i) => labelByEntry.set(p.log, pick(v1Labels[i])));

    // Batch-fetch block timestamps (dedupe blocks).
    const uniqueBlocks = Array.from(new Set(page.map((p) => p.log.blockNumber)));
    const blockRows = await Promise.all(
      uniqueBlocks.map((b) => client.getBlock({ blockNumber: b })),
    );
    const tsByBlock = new Map(blockRows.map((b) => [b.number, Number(b.timestamp)]));

    const suffix = tldSuffix(tld);

    const sales = page.map(({ log, version }) => {
      const label = labelByEntry.get(log) ?? "";
      const priceWei = log.args.price;
      const feeWei = log.args.fee;
      return {
        token_id: log.args.tokenId.toString(),
        label,
        name: label ? `${label}${suffix}` : "",
        seller: log.args.seller,
        buyer: log.args.buyer,
        price_ikas: (Number(priceWei) / 1e18).toFixed(6),
        fee_ikas:   (Number(feeWei)   / 1e18).toFixed(6),
        block: Number(log.blockNumber),
        tx_hash: log.transactionHash,
        timestamp: new Date((tsByBlock.get(log.blockNumber) ?? 0) * 1000).toISOString(),
        registry_version: version,
      };
    });

    return json({ sales, total, limit, offset });
  } catch (e) {
    return json({ error: (e as Error).message ?? "failed" }, 500);
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
