import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
} from "viem";
import {
  REGISTRY_ADDRESSES,
  REGISTRY_ABI,
  REGISTRY_V2_ADDRESS,
  REGISTRY_V2_ABI,
  isV2Deployed,
  LIVE_TLDS,
  tldSuffix,
  type Tld,
} from "@/lib/contracts";
import { getLogsChunked, parallelReadContract } from "@/lib/api-utils";
import { displayLabel } from "@/lib/names";

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
 * GET /api/names/recent?limit=50&tld=igra&version=all
 *
 * Returns the most recent N names registered on the chosen TLD's Registry.
 * Useful for explorers, "newly registered" feeds, and integration smoke
 * tests by wallet devs who want to verify they can read live state.
 *
 * Query params:
 *   - limit:   1..200, default 50
 *   - tld:     "igra" (only live TLD; default igra)
 *   - version: "v1" | "v2" | "all" (default "all" — unions both registries)
 *              Use "v2" for the canonical post-launch feed (V1 is migrate-only).
 *
 * Response (200):
 *   {
 *     tld: "igra",
 *     count: 50,
 *     names: [
 *       { tokenId: "11", label: "newest", name: "newest.igra",
 *         owner: "0x...", target: "0x...", mintedAt: 1735000000,
 *         blockNumber: "5176410", txHash: "0x...", registry_version: "v2" },
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
  const versionParam = (url.searchParams.get("version") ?? "all").toLowerCase();
  if (!["v1", "v2", "all"].includes(versionParam)) {
    return Response.json(
      { error: "invalid_version", version: versionParam, valid: ["v1", "v2", "all"] },
      { status: 400, headers: CORS },
    );
  }
  const versionFilter = versionParam as "v1" | "v2" | "all";

  if (!(LIVE_TLDS as readonly string[]).includes(tldParam)) {
    return Response.json(
      { error: "tld_not_live", tld: tldParam, live_tlds: LIVE_TLDS },
      { status: 400, headers: CORS },
    );
  }
  const tld = tldParam as Tld;
  const registry = REGISTRY_ADDRESSES[tld];

  // Skip V1 reads entirely if caller asked for V2 only (saves an RPC roundtrip).
  // Skip V2 reads entirely if caller asked for V1 only.
  const includeV1 = versionFilter !== "v2";
  const includeV2 = versionFilter !== "v1" && tld === "igra" && isV2Deployed();

  try {
    // Mint events = Transfer with from == 0x0. Chunked since Igra RPC caps
    // eth_getLogs at 100k blocks per call. Also chunked across V1 + V2.
    const v1LogsP = includeV1
      ? getLogsChunked({
          client,
          address: registry,
          event: TRANSFER_EVENT,
          args: { from: ZERO_ADDR as Address },
        })
      : Promise.resolve([]);
    const v2LogsP = includeV2
      ? getLogsChunked({
          client,
          address: REGISTRY_V2_ADDRESS,
          event: TRANSFER_EVENT,
          args: { from: ZERO_ADDR as Address },
        })
      : Promise.resolve([]);
    const [v1Logs, v2Logs] = await Promise.all([v1LogsP, v2LogsP]);

    // Tag each log with its source registry so the per-token reads + the
    // response payload can disambiguate V1 vs V2 entries.
    type TaggedLog = (typeof v1Logs)[number] & { _registry: Address; _version: "v1" | "v2" };
    const tagged: TaggedLog[] = [
      ...v1Logs.map((l) => ({ ...l, _registry: registry, _version: "v1" as const })),
      ...v2Logs.map((l) => ({ ...l, _registry: REGISTRY_V2_ADDRESS, _version: "v2" as const })),
    ];

    // Most recent first; cap to `limit`. blockNumber is non-null on mined
    // logs (we never query pending).
    const recent = tagged
      .sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)))
      .slice(0, limit);

    if (recent.length === 0) {
      return Response.json({ tld, count: 0, names: [] }, { headers: CORS });
    }

    // Per-token reads — route to the correct Registry/ABI based on tag.
    // V1 + V2 share the same read function names and signatures (V2 is a
    // superset), so the only thing we need to switch is the address + abi.
    // V2 entries also pull expiresAt for tenure metadata. We keep exactly
    // 5 reads per log so the offset math below is uniform; V1's 5th read
    // is a harmless mintedAt repeat. Typed as `any[]` because each element
    // mixes V1 and V2 ABI types and we intentionally erase that surface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reads: any[] = recent.flatMap((log) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args.tokenId as bigint;
      const isV2 = log._version === "v2";
      const abi = isV2 ? REGISTRY_V2_ABI : REGISTRY_ABI;
      const address = log._registry;
      return [
        { address, abi, functionName: "labelOf",  args: [tokenId] },
        { address, abi, functionName: "ownerOf",  args: [tokenId] },
        { address, abi, functionName: "targetOf", args: [tokenId] },
        { address, abi, functionName: "mintedAt", args: [tokenId] },
        isV2
          ? { address, abi: REGISTRY_V2_ABI, functionName: "expiresAt", args: [tokenId] }
          : { address, abi: REGISTRY_ABI,    functionName: "mintedAt",  args: [tokenId] },
      ];
    });
    const results = await parallelReadContract<unknown>(client, reads);

    const names = recent.map((log, i) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args.tokenId as bigint;
      const labelR    = results[i * 5];
      const ownerR    = results[i * 5 + 1];
      const targetR   = results[i * 5 + 2];
      const mintedAtR = results[i * 5 + 3];
      const expiresAtR = results[i * 5 + 4];
      const label = labelR.status === "success" ? (labelR.result as string) : "";
      const isV2 = log._version === "v2";
      const expiresAt =
        isV2 && expiresAtR.status === "success" ? Number(expiresAtR.result as bigint) : 0;
      const display = displayLabel(label);
      return {
        tokenId: tokenId.toString(),
        label,
        display_label: display,
        name: `${display}${tldSuffix(tld)}`,
        punycode_name: `${label}${tldSuffix(tld)}`,
        owner: ownerR.status === "success" ? (ownerR.result as Address) : null,
        target: targetR.status === "success" ? (targetR.result as Address) : null,
        mintedAt:
          mintedAtR.status === "success" ? Number(mintedAtR.result as bigint) : 0,
        blockNumber: (log.blockNumber ?? 0n).toString(),
        txHash: log.transactionHash,
        registry_version: log._version,
        // V2-only — null/omitted for V1 Forever names
        tenure: isV2 ? (expiresAt === 0 ? "forever" : "annual") : "forever",
        expires_at: isV2 && expiresAt !== 0 ? expiresAt : null,
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
