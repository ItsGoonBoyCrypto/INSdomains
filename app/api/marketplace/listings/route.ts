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
  const registry = REGISTRY_ADDRESSES[tld];
  const marketplace = MARKETPLACE_ADDRESSES[tld];

  try {
    // Pull every ListingCreated event since deploy (chunked for the 100k
    // block range cap), dedupe to latest per tokenId — a tokenId can be
    // re-listed multiple times, only the most recent emission matters
    // since the contract overwrites the slot on re-list.
    const logs = await getLogsChunked({
      client,
      address: marketplace,
      event: LISTING_CREATED,
    });

    const latestPerToken = new Map<bigint, (typeof logs)[number]>();
    for (const log of logs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tokenId = (log as any).args.tokenId as bigint;
      const existing = latestPerToken.get(tokenId);
      // blockNumber is non-null on mined logs (we never query pending)
      const a = log.blockNumber ?? 0n;
      const b = existing?.blockNumber ?? 0n;
      if (!existing || a > b) {
        latestPerToken.set(tokenId, log);
      }
    }
    const tokenIds = Array.from(latestPerToken.keys());
    if (tokenIds.length === 0) {
      return Response.json(
        { tld, marketplace, count: 0, listings: [] },
        { headers: CORS },
      );
    }

    // Pull live state for each tokenId via the contract's
    // `getActiveListing` which encapsulates active+expiry+seller-owns
    // checks. If the returned struct has a zero seller, the listing is
    // dead — drop it.
    const reads = tokenIds.flatMap((tokenId) => [
      {
        address: marketplace,
        abi: MARKETPLACE_ABI,
        functionName: "getActiveListing" as const,
        args: [tokenId],
      },
      {
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "labelOf" as const,
        args: [tokenId],
      },
    ]);
    const results = await parallelReadContract<unknown>(client, reads);

    const now = Math.floor(Date.now() / 1000);
    const ZERO = "0x0000000000000000000000000000000000000000";

    const listings = tokenIds
      .map((tokenId, i) => {
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
      { tld, marketplace, count: listings.length, listings },
      { headers: CORS },
    );
  } catch (err) {
    return Response.json(
      { error: "rpc_error", message: (err as Error).message },
      { status: 502, headers: CORS },
    );
  }
}
