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

  // Helper — scan one Registry, return owned tokens with V2 metadata when applicable.
  async function scanRegistry(opts: {
    address: Address;
    abi: typeof REGISTRY_ABI | typeof REGISTRY_V2_ABI;
    version: "v1" | "v2";
  }) {
    const logs = await getLogsChunked({
      client,
      address: opts.address,
      event: TRANSFER_EVENT,
      args: { to: address },
    });

    const tokenIdSet = new Set<bigint>();
    for (const log of logs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args?.tokenId as bigint | undefined;
      if (tokenId !== undefined) tokenIdSet.add(tokenId);
    }
    const tokenIds = Array.from(tokenIdSet);
    if (tokenIds.length === 0) return [];

    // For V2 we also pull expiresAt; for V1 we keep mintedAt as the 4th read
    // so the offset math stays uniform (5 reads per token regardless).
    const reads = tokenIds.flatMap((tokenId) => {
      const base = [
        { address: opts.address, abi: opts.abi, functionName: "ownerOf" as const,   args: [tokenId] },
        { address: opts.address, abi: opts.abi, functionName: "labelOf" as const,   args: [tokenId] },
        { address: opts.address, abi: opts.abi, functionName: "targetOf" as const,  args: [tokenId] },
        { address: opts.address, abi: opts.abi, functionName: "mintedAt" as const,  args: [tokenId] },
      ];
      base.push(
        opts.version === "v2"
          ? { address: opts.address, abi: REGISTRY_V2_ABI, functionName: "expiresAt" as const, args: [tokenId] }
          : { address: opts.address, abi: REGISTRY_ABI,    functionName: "mintedAt" as const,  args: [tokenId] },
      );
      return base;
    });
    const results = await parallelReadContract<unknown>(client, reads);

    return tokenIds
      .map((tokenId, i) => {
        const ownerR    = results[i * 5];
        const labelR    = results[i * 5 + 1];
        const targetR   = results[i * 5 + 2];
        const mintedAtR = results[i * 5 + 3];
        const expiresAtR = results[i * 5 + 4];
        if (
          ownerR.status !== "success" ||
          (ownerR.result as Address).toLowerCase() !== address
        ) {
          return null;
        }
        const label = labelR.status === "success" ? (labelR.result as string) : "";
        const target = targetR.status === "success" ? (targetR.result as Address) : null;
        const mintedAt =
          mintedAtR.status === "success" ? Number(mintedAtR.result as bigint) : 0;
        const expiresAt =
          opts.version === "v2" && expiresAtR.status === "success"
            ? Number(expiresAtR.result as bigint)
            : 0;
        return {
          tokenId: tokenId.toString(),
          label,
          name: `${label}${tldSuffix(tld)}`,
          target,
          mintedAt,
          registry_version: opts.version,
          tenure: opts.version === "v2" ? (expiresAt === 0 ? "forever" : "annual") : "forever",
          expires_at: opts.version === "v2" && expiresAt !== 0 ? expiresAt : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  try {
    const v1Results = await scanRegistry({ address: registry, abi: REGISTRY_ABI, version: "v1" });

    // V2 union — only for .igra (V2 is .igra-only), only when V2 is deployed.
    const v2Results =
      tld === "igra" && isV2Deployed()
        ? await scanRegistry({ address: REGISTRY_V2_ADDRESS, abi: REGISTRY_V2_ABI, version: "v2" })
        : [];

    const names = [...v1Results, ...v2Results]
      // Latest mints first across both versions
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
