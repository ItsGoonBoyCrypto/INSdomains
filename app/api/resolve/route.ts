import { createPublicClient, http, type Address } from "viem";
import {
  REGISTRY_ADDRESSES,
  REGISTRY_ABI,
  TLDS,
  tldSuffix,
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
  // 60s edge cache — reads are cheap but chain RPC latency isn't.
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
};

/** Split a full name (`alice.igra`) into (label, tld). Returns tld=null when
 *  no recognised suffix is present so callers can fall back to `?tld=` param. */
function parseName(input: string): { label: string; tld: Tld | null } {
  const s = input.trim().toLowerCase();
  for (const tld of TLDS) {
    if (s.endsWith("." + tld)) {
      return { label: s.slice(0, -(tld.length + 1)), tld };
    }
  }
  return { label: s, tld: null };
}

function validLabel(s: string): boolean {
  if (!s || s.length > 32) return false;
  if (!/^[a-z0-9-]+$/.test(s)) return false;
  if (s.startsWith("-") || s.endsWith("-")) return false;
  return true;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * GET /api/resolve?name=alice.ins
 *   or /api/resolve?name=alice&tld=igra
 *   or /api/resolve?name=alice          (searches all 3 TLDs, .ins first)
 *
 * Response (200 — found):
 *   { name: "alice.ins", label: "alice", tld: "ins",
 *     address: "0x…", owner: "0x…", tokenId: "42", exists: true }
 *
 * Response (404 — not found):
 *   { name, label, tld, address: null, exists: false }
 *
 * Response (400 — bad input):
 *   { error: "invalid_label", label, tld }
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("name") ?? "";
  const tldParam = url.searchParams.get("tld")?.toLowerCase();

  const parsed = parseName(raw);
  const tld: Tld | null =
    parsed.tld ??
    (tldParam && (TLDS as readonly string[]).includes(tldParam)
      ? (tldParam as Tld)
      : null);
  const label = parsed.label;

  if (!label || !validLabel(label)) {
    return Response.json(
      { error: "invalid_label", label, tld },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // If no TLD specified, try all 3 in preference order (.ins → .igra → .ikas)
  const tldsToTry: readonly Tld[] = tld ? [tld] : TLDS;

  for (const t of tldsToTry) {
    const registry = REGISTRY_ADDRESSES[t];
    if (registry === ZERO) continue;

    try {
      const tokenId = (await client.readContract({
        address: registry,
        abi: REGISTRY_ABI,
        functionName: "tokenIdOf",
        args: [label],
      })) as bigint;

      if (tokenId === 0n) continue; // not minted on this TLD — try next

      const [target, owner] = await Promise.all([
        client.readContract({
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "targetOf",
          args: [tokenId],
        }) as Promise<Address>,
        client.readContract({
          address: registry,
          abi: REGISTRY_ABI,
          functionName: "ownerOf",
          args: [tokenId],
        }) as Promise<Address>,
      ]);

      return Response.json(
        {
          name: `${label}${tldSuffix(t)}`,
          label,
          tld: t,
          tokenId: tokenId.toString(),
          address: target,
          owner,
          exists: true,
        },
        { headers: CORS_HEADERS },
      );
    } catch {
      // RPC hiccup on this TLD — try next, don't abort entire request
      continue;
    }
  }

  return Response.json(
    {
      name: tld ? `${label}${tldSuffix(tld)}` : label,
      label,
      tld,
      address: null,
      exists: false,
    },
    { status: 404, headers: CORS_HEADERS },
  );
}
