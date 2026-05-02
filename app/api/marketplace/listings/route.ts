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
  MARKETPLACE_ADDRESSES,
  MARKETPLACE_V2_ADDRESS,
  MARKETPLACE_ABI,
  LIVE_TLDS,
  tldSuffix,
  type Tld,
} from "@/lib/contracts";
import { getLogsChunked, parallelReadContract } from "@/lib/api-utils";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

export const runtime = "nodejs";

const RPC = process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";
const client = createPublicClient({ transport: http(RPC) });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

const LISTING_CREATED = parseAbiItem(
  "event ListingCreated(uint256 indexed tokenId, address indexed seller, uint256 price, uint64 expiry, bool featured)",
);

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/marketplace/listings?tld=igra&limit=50&featured=false
 *
 * Returns currently-active marketplace listings for the chosen TLD. Live
 * means: contract's `getActiveListing(tokenId)` returns a non-empty seller
 * (it checks active flag + expiry + seller-still-owns the NFT).
 *
 * Unions V1 + V2 marketplace listings transparently. Each listing is
 * tagged with `registry_version` ("v1" | "v2") so consumers can render
 * the V2 badge or filter as needed. Each Marketplace instance is bound
 * to its own Registry by immutable constructor arg — V1 listings live
 * on the V1 Marketplace, V2 listings on the V2 Marketplace (deployed
 * 2026-05-02). The unified response is sorted featured-first then
 * by price descending.
 *
 * Useful for explorers + wallet "browse for sale" panes.
 *
 * Query:
 *   tld=igra        (default)
 *   limit=50        (1-200)
 *   featured=true   (only featured listings, default: all)
 *
 * Response (200):
 *   {
 *     tld: "igra",
 *     marketplace: "0xde8d…3642a",
 *     count: 12,
 *     listings: [
 *       { tokenId: "5", label: "alice", name: "alice.igra",
 *         seller: "0x…", price: "30000000000000000000",
 *         price_ikas: "30", expiry: 1735000000, featured: true,
 *         expires_in_seconds: 86400 },
 *       …
 *     ]
 *   }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const tldParam = (url.searchParams.get("tld") ?? "igra").toLowerCase();
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    200,
  );
  const featuredOnly = url.searchParams.get("featured") === "true";

  if (!(LIVE_TLDS as readonly string[]).includes(tldParam)) {
    return Response.json(
      { error: "tld_not_live", tld: tldParam, live_tlds: LIVE_TLDS },
      { status: 400, headers: CORS },
    );
  }
  const tld = tldParam as Tld;

  // Build the per-marketplace work list. For .igra we union V1 + V2
  // (when V2 Marketplace is deployed); other TLDs are V1-only.
  const v1Marketplace = MARKETPLACE_ADDRESSES[tld];
  const v1Registry = REGISTRY_ADDRESSES[tld];
  const includeV2 = tld === "igra" && MARKETPLACE_V2_ADDRESS !== ZERO_ADDR;
  const sources = [
    { marketplace: v1Marketplace, registry: v1Registry, registryAbi: REGISTRY_ABI as typeof REGISTRY_ABI, version: "v1" as const },
    ...(includeV2
      ? [{ marketplace: MARKETPLACE_V2_ADDRESS, registry: REGISTRY_V2_ADDRESS, registryAbi: REGISTRY_V2_ABI as typeof REGISTRY_V2_ABI, version: "v2" as const }]
      : []),
  ];

  try {
    // Pull every ListingCreated event for each Marketplace (chunked for
    // the 100k block range cap), dedupe to latest per tokenId — a tokenId
    // can be re-listed multiple times, only the most recent emission
    // matters since the contract overwrites the slot on re-list.
    type TaggedLog = (Awaited<ReturnType<typeof getLogsChunked>>)[number] & {
      _marketplace: typeof v1Marketplace;
      _registry: typeof v1Registry;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _registryAbi: any;
      _version: "v1" | "v2";
    };
    const logsBySrc = await Promise.all(
      sources.map(async (s) => {
        const ll = await getLogsChunked({
          client,
          address: s.marketplace,
          event: LISTING_CREATED,
        });
        return ll.map((l) => ({
          ...l,
          _marketplace: s.marketplace,
          _registry: s.registry,
          _registryAbi: s.registryAbi,
          _version: s.version,
        })) as TaggedLog[];
      }),
    );
    const logs: TaggedLog[] = logsBySrc.flat();

    // Dedupe per (version, tokenId) — V1 + V2 token ids collide so we
    // can't merge keys naively. Only the most recent ListingCreated for a
    // given (version, tokenId) matters since the contract overwrites the
    // slot on re-list.
    const latestPerToken = new Map<string, TaggedLog>();
    for (const log of logs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args.tokenId as bigint;
      const key = `${log._version}:${tokenId.toString()}`;
      const existing = latestPerToken.get(key);
      const a = log.blockNumber ?? 0n;
      const b = existing?.blockNumber ?? 0n;
      if (!existing || a > b) {
        latestPerToken.set(key, log);
      }
    }
    const entries = Array.from(latestPerToken.values());
    if (entries.length === 0) {
      return Response.json(
        { tld, marketplaces: sources.map((s) => s.marketplace), count: 0, listings: [] },
        { headers: CORS },
      );
    }

    // Pull live state for each entry via that marketplace's
    // `getActiveListing` (active + expiry + seller-still-owns checks).
    // Read labelOf from the matching Registry — V1 and V2 expose the same
    // labelOf signature so the call shape is identical apart from the
    // ABI / address pair routed via the log's tag.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reads: any[] = entries.flatMap((log) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args.tokenId as bigint;
      return [
        {
          address: log._marketplace,
          abi: MARKETPLACE_ABI,
          functionName: "getActiveListing",
          args: [tokenId],
        },
        {
          address: log._registry,
          abi: log._registryAbi,
          functionName: "labelOf",
          args: [tokenId],
        },
      ];
    });
    const results = await parallelReadContract<unknown>(client, reads);

    const now = Math.floor(Date.now() / 1000);
    const ZERO = "0x0000000000000000000000000000000000000000";

    const listings = entries
      .map((log, i) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tokenId = (log as any).args.tokenId as bigint;
        const lr = results[i * 2];
        const labelR = results[i * 2 + 1];
        if (lr.status !== "success") return null;
        // viem returns the struct as an object
        const l = lr.result as {
          seller: Address;
          expiry: bigint;
          featured: boolean;
          active: boolean;
          price: bigint;
        };
        if (!l.seller || l.seller.toLowerCase() === ZERO) return null;
        if (featuredOnly && !l.featured) return null;
        const label = labelR.status === "success" ? (labelR.result as string) : "";
        const expiryNum = Number(l.expiry);
        return {
          tokenId: tokenId.toString(),
          label,
          name: `${label}${tldSuffix(tld)}`,
          seller: l.seller,
          price: l.price.toString(),
          price_ikas: (Number(l.price) / 1e18).toString(),
          expiry: expiryNum,
          expires_in_seconds: Math.max(0, expiryNum - now),
          featured: l.featured,
          registry_version: log._version,
          marketplace: log._marketplace,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      // Featured first, then highest price
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return Number(BigInt(b.price) - BigInt(a.price));
      })
      .slice(0, limit);

    return Response.json(
      {
        tld,
        marketplaces: sources.map((s) => s.marketplace),
        count: listings.length,
        listings,
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
