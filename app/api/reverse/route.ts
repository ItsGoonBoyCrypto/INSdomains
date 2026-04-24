import { createPublicClient, http, isAddress } from "viem";
import {
  REVERSE_RESOLVER_ADDRESSES,
  REVERSE_RESOLVER_ABI,
  TLDS,
  type Tld,
} from "@/lib/contracts";

export const runtime = "nodejs";

const RPC = process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";

const client = createPublicClient({ transport: http(RPC) });

const ZERO = "0x0000000000000000000000000000000000000000";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/reverse?address=0xF9d065b70C9357098dc7854D7A28B1498f6d125c
 *
 * Fans out across all 3 per-TLD reverse resolvers and returns:
 *   {
 *     address: "0xf9d065…",
 *     primary: "alice.ins",        // or null if no primary set on any TLD
 *     primaries: {                 // per-TLD breakdown (always included)
 *       ins:  "alice.ins" | null,
 *       igra: "alice.igra" | null,
 *       ikas: "alice.ikas" | null,
 *     }
 *   }
 *
 * `primary` prefers .ins → .igra → .ikas (first non-null wins). Use the
 * `primaries` map if you want to show all three or pick by a different rule.
 *
 * All three reverse resolvers are stale-safe — they return "" if the user
 * no longer owns the underlying token, so you never see a stale name.
 *
 * Always returns 200 on a valid address input (even with no primary set);
 * 400 only on malformed addresses.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("address") ?? "";
  const address = raw.trim().toLowerCase();

  if (!address || !isAddress(address)) {
    return Response.json(
      { error: "invalid_address", address: raw },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Fan out — all 3 reads in parallel, never reject on a single RPC hiccup.
  const results = await Promise.all(
    TLDS.map(async (tld) => {
      const resolver = REVERSE_RESOLVER_ADDRESSES[tld];
      if (resolver === ZERO) return { tld, name: null as string | null };
      try {
        const name = (await client.readContract({
          address: resolver,
          abi: REVERSE_RESOLVER_ABI,
          functionName: "primaryName",
          args: [address as `0x${string}`],
        })) as string;
        return { tld, name: name && name.length > 0 ? name : null };
      } catch {
        return { tld, name: null };
      }
    }),
  );

  const primaries: Record<Tld, string | null> = { ins: null, igra: null, ikas: null };
  for (const r of results) primaries[r.tld as Tld] = r.name;

  // Preference order: .ins first (the original TLD), then .igra, then .ikas.
  const primary = primaries.ins ?? primaries.igra ?? primaries.ikas ?? null;

  return Response.json(
    { address, primary, primaries },
    { headers: CORS_HEADERS },
  );
}
