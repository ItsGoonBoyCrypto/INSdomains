import { createPublicClient, http, isAddress } from "viem";
import {
  REVERSE_RESOLVER_ADDRESSES,
  REVERSE_RESOLVER_V2_ADDRESS,
  REVERSE_RESOLVER_ABI,
  TLDS,
  type Tld,
} from "@/lib/contracts";
import { displayLabel } from "@/lib/names";

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
 * Reverse resolution — address → primary name across V1 + V2 reverse
 * resolvers.
 *
 * Response shape (v2 — additive, backwards-compatible with v1):
 *   {
 *     address: "0xf9d065…",
 *     primary: "alice.igra",          // top pick across all RRs (V2 wins)
 *     primary_version: "v2"|"v1"|null, // which RR the top pick came from
 *     primaries: {                     // per-source breakdown
 *       igra_v2: "alice"   | null,    // V2 ReverseResolver (canonical)
 *       igra:    "alice"   | null,    // V1 .igra ReverseResolver
 *       ins:     "old.ins" | null,    // V1 .ins ReverseResolver  (legacy)
 *       ikas:    null,                // V1 .ikas ReverseResolver (legacy)
 *     }
 *   }
 *
 * Selection precedence for the `primary` field:
 *   1. V2 .igra ReverseResolver  (current canonical)
 *   2. V1 .igra ReverseResolver  (pre-launch legacy holders)
 *   3. V1 .ins ReverseResolver   (legacy paused TLD)
 *   4. V1 .ikas ReverseResolver  (legacy paused TLD)
 *
 * All four reverse resolvers are stale-safe on chain — they return "" if
 * the user no longer owns the underlying token, so you never see a stale
 * name in the response.
 *
 * Always returns 200 on a valid address input (no primary on any RR is a
 * valid state — both `primary` and all `primaries.*` will be null).
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

  // Read all three V1 RRs + the V2 RR in parallel. Never reject on a
  // single RPC hiccup — each missed read just becomes a null entry.
  const v1ReadsP = Promise.all(
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

  const v2ReadP = (async () => {
    if (REVERSE_RESOLVER_V2_ADDRESS === ZERO) return null as string | null;
    try {
      const name = (await client.readContract({
        address: REVERSE_RESOLVER_V2_ADDRESS,
        abi: REVERSE_RESOLVER_ABI,
        functionName: "primaryName",
        args: [address as `0x${string}`],
      })) as string;
      return name && name.length > 0 ? name : null;
    } catch {
      return null;
    }
  })();

  const [v1Results, v2Name] = await Promise.all([v1ReadsP, v2ReadP]);

  const v1ByTld: Record<Tld, string | null> = { ins: null, igra: null, ikas: null };
  for (const r of v1Results) v1ByTld[r.tld as Tld] = r.name;

  // Precedence: V2 .igra → V1 .igra → V1 .ins → V1 .ikas.
  // For emoji primaries: the chain stores the Punycode form (xn--…) but the
  // `primary` field returns the BEAUTIFIED form so wallets/explorers show
  // 🔥.igra to users; raw Punycode is preserved in `primaries.*_label`.
  let primary: string | null;
  let primary_label: string | null;
  let primary_version: "v1" | "v2" | null;
  if (v2Name) {
    primary = `${displayLabel(v2Name)}.igra`;
    primary_label = v2Name;
    primary_version = "v2";
  } else if (v1ByTld.igra) {
    primary = `${displayLabel(v1ByTld.igra)}.igra`;
    primary_label = v1ByTld.igra;
    primary_version = "v1";
  } else if (v1ByTld.ins) {
    primary = `${displayLabel(v1ByTld.ins)}.ins`;
    primary_label = v1ByTld.ins;
    primary_version = "v1";
  } else if (v1ByTld.ikas) {
    primary = `${displayLabel(v1ByTld.ikas)}.ikas`;
    primary_label = v1ByTld.ikas;
    primary_version = "v1";
  } else {
    primary = null;
    primary_label = null;
    primary_version = null;
  }

  // Keep the v1 shape (`primaries.ins/igra/ikas`) populated for backwards
  // compat with integrators on the original API. The V2 entry is added
  // alongside as `igra_v2`. Both raw Punycode and beautified forms are
  // available so integrators can pick whichever rendering they prefer.
  const primaries = {
    igra_v2: v2Name,
    igra_v2_display: v2Name ? displayLabel(v2Name) : null,
    igra: v1ByTld.igra,
    igra_display: v1ByTld.igra ? displayLabel(v1ByTld.igra) : null,
    ins: v1ByTld.ins,
    ins_display: v1ByTld.ins ? displayLabel(v1ByTld.ins) : null,
    ikas: v1ByTld.ikas,
    ikas_display: v1ByTld.ikas ? displayLabel(v1ByTld.ikas) : null,
  };

  return Response.json(
    { address, primary, primary_label, primary_version, primaries },
    { headers: CORS_HEADERS },
  );
}
