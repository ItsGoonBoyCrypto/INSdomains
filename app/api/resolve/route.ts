import { createPublicClient, http, type Address } from "viem";
import {
  REGISTRY_ADDRESSES,
  REGISTRY_ABI,
  REGISTRY_V2_ADDRESS,
  REGISTRY_V2_ABI,
  isV2Deployed,
  SUBNAME_EXTENSION_ADDRESS,
  SUBNAME_EXTENSION_ABI,
  TLDS,
  tldSuffix,
  type Tld,
} from "@/lib/contracts";
import { prepareForContract, buildNameEnvelope, displayLabel, NameValidationError } from "@/lib/names";

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

/** Split a full name into (label, tld) — and optional subLabel for 3-segment
 *  names like `pay.alice.igra`. Returns tld=null when no recognised suffix is
 *  present so callers can fall back to `?tld=` param. */
function parseName(input: string): { label: string; subLabel: string | null; tld: Tld | null } {
  // Preserve Unicode case (don't pre-lowercase) so ENSIP-15 normalize can act
  // on emoji and ZWJ sequences cleanly. parseName only splits on dots + TLD —
  // it's prepareForContract that handles canonicalization downstream.
  const s = input.trim();
  const lower = s.toLowerCase();
  for (const tld of TLDS) {
    if (lower.endsWith("." + tld)) {
      const stripped = s.slice(0, -(tld.length + 1));
      // 3-segment? "pay.alice.igra" → after stripping ".igra" we get "pay.alice"
      const dot = stripped.indexOf(".");
      if (dot > 0 && dot < stripped.length - 1) {
        return { subLabel: stripped.slice(0, dot), label: stripped.slice(dot + 1), tld };
      }
      return { label: stripped, subLabel: null, tld };
    }
  }
  return { label: s, subLabel: null, tld: null };
}

/**
 * Try to canonicalize user input into the contract label form. Returns the
 * encoded contract label (ASCII or `xn--…`) on success, null on rejection.
 *
 * For emoji input (`🔥`) this returns `xn--4v8h`. For ASCII input this
 * returns the lowercased + validated form. Sub-labels for subnames get
 * the same treatment so emoji subnames work too (`🔥.alice.igra`).
 */
function toContractFormOrNull(raw: string): string | null {
  if (!raw) return null;
  try {
    return prepareForContract(raw);
  } catch (e) {
    if (e instanceof NameValidationError) return null;
    return null;
  }
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

  // Canonicalize the user-supplied label. Accepts ASCII (`alice`), emoji
  // (`🔥`), or pre-encoded Punycode (`xn--4v8h`). All three round-trip
  // through prepareForContract to the contract-facing form before we
  // touch the chain — the same string the contract sees.
  const label = toContractFormOrNull(parsed.label);

  if (!label || !validLabel(label)) {
    return Response.json(
      { error: "invalid_label", label: parsed.label, tld },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Subname path (e.g. pay.alice.igra OR 🔥.alice.igra). Only attempted when:
  //   1. SUBNAME_EXTENSION_ADDRESS is set in env (gate A)
  //   2. The contract reports enabled = true (gate B, checked below)
  //   3. The TLD has a registered SubnameExtension (currently .igra only)
  //
  // The sub-label runs through the same emoji-aware canonicalization as the
  // parent — required so `🔥.alice.igra` resolves to the on-chain
  // `xn--4v8h.alice.igra` subname (not silently dropped per the earlier audit
  // finding). subContractLabel is the canonical contract form for the chain.
  const subContractLabel = parsed.subLabel ? toContractFormOrNull(parsed.subLabel) : null;
  if (parsed.subLabel && subContractLabel && validLabel(subContractLabel) && tld === "igra" && SUBNAME_EXTENSION_ADDRESS !== ZERO) {
    try {
      const extEnabled = (await client.readContract({
        address: SUBNAME_EXTENSION_ADDRESS,
        abi: SUBNAME_EXTENSION_ABI,
        functionName: "enabled",
      })) as boolean;
      if (extEnabled) {
        const parentTokenId = (await client.readContract({
          address: REGISTRY_ADDRESSES[tld],
          abi: REGISTRY_ABI,
          functionName: "tokenIdOf",
          args: [label],
        })) as bigint;
        if (parentTokenId !== 0n) {
          const subTokenId = (await client.readContract({
            address: SUBNAME_EXTENSION_ADDRESS,
            abi: SUBNAME_EXTENSION_ABI,
            functionName: "subnameOf",
            args: [parentTokenId, subContractLabel],
          })) as bigint;
          if (subTokenId !== 0n) {
            const [target, subOwner] = await Promise.all([
              client.readContract({
                address: SUBNAME_EXTENSION_ADDRESS,
                abi: SUBNAME_EXTENSION_ABI,
                functionName: "targetOf",
                args: [subTokenId],
              }) as Promise<Address>,
              client.readContract({
                address: SUBNAME_EXTENSION_ADDRESS,
                abi: SUBNAME_EXTENSION_ABI,
                functionName: "ownerOf",
                args: [subTokenId],
              }) as Promise<Address>,
            ]);
            const parentEnv = buildNameEnvelope(label, tld);
            const subDisplay = displayLabel(subContractLabel);
            return Response.json(
              {
                name: `${subDisplay}.${parentEnv.display_label}${tldSuffix(tld)}`,
                subLabel: subContractLabel,
                display_subLabel: subDisplay,
                label,
                display_label: parentEnv.display_label,
                punycode_name: `${subContractLabel}.${label}${tldSuffix(tld)}`,
                normalized_name: `${subDisplay}.${parentEnv.display_label}${tldSuffix(tld)}`,
                tld,
                tokenId: subTokenId.toString(),
                parentTokenId: parentTokenId.toString(),
                isSubname: true,
                address: target,
                owner: subOwner,
                exists: true,
              },
              { headers: CORS_HEADERS },
            );
          }
        }
      }
    } catch {
      // fall through — treat as not found
    }
    // Subname requested but not found → 404 with the subname-shaped envelope
    const parentEnv = buildNameEnvelope(label, tld);
    const subDisplay = subContractLabel ? displayLabel(subContractLabel) : parsed.subLabel;
    return Response.json(
      {
        name: `${subDisplay}.${parentEnv.display_label}${tldSuffix(tld)}`,
        subLabel: subContractLabel ?? parsed.subLabel,
        display_subLabel: subDisplay,
        label,
        display_label: parentEnv.display_label,
        tld,
        isSubname: true,
        address: null,
        exists: false,
      },
      { status: 404, headers: CORS_HEADERS },
    );
  }

  // V2 .igra preference: if a label exists on V2, that's authoritative
  // (post-grace re-registration semantics + V1 holders may have migrated).
  // Falls through to V1 read if not on V2 OR V2 isn't deployed yet.
  if ((tld === "igra" || tld === null) && isV2Deployed()) {
    try {
      const tokenId = (await client.readContract({
        address: REGISTRY_V2_ADDRESS,
        abi: REGISTRY_V2_ABI,
        functionName: "tokenIdOf",
        args: [label],
      })) as bigint;
      if (tokenId !== 0n) {
        const [target, owner, expiresAt] = await Promise.all([
          client.readContract({
            address: REGISTRY_V2_ADDRESS,
            abi: REGISTRY_V2_ABI,
            functionName: "targetOf",
            args: [tokenId],
          }) as Promise<Address>,
          client.readContract({
            address: REGISTRY_V2_ADDRESS,
            abi: REGISTRY_V2_ABI,
            functionName: "ownerOf",
            args: [tokenId],
          }) as Promise<Address>,
          client.readContract({
            address: REGISTRY_V2_ADDRESS,
            abi: REGISTRY_V2_ABI,
            functionName: "expiresAt",
            args: [tokenId],
          }) as Promise<bigint>,
        ]);
        const env = buildNameEnvelope(label, "igra");
        return Response.json(
          {
            ...env,
            tld: "igra" as const,
            tokenId: tokenId.toString(),
            address: target,
            owner,
            exists: true,
            // V2-specific tenure metadata
            registry_version: "v2" as const,
            tenure: expiresAt === 0n ? ("forever" as const) : ("annual" as const),
            expires_at: expiresAt === 0n ? null : Number(expiresAt),
          },
          { headers: CORS_HEADERS },
        );
      }
    } catch {
      // V2 RPC hiccup → fall through to V1
    }
  }

  // V1 path. Tries all TLDs (or just the requested one). Pre-V2-launch this
  // is the only path that ever returns hits; post-launch it serves legacy V1
  // holders whose names haven't been re-minted on V2.
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

      const env = buildNameEnvelope(label, t);
      return Response.json(
        {
          ...env,
          tld: t,
          tokenId: tokenId.toString(),
          address: target,
          owner,
          exists: true,
          registry_version: "v1" as const,
          tenure: "forever" as const,
          expires_at: null,
        },
        { headers: CORS_HEADERS },
      );
    } catch {
      // RPC hiccup on this TLD — try next, don't abort entire request
      continue;
    }
  }

  const env = tld ? buildNameEnvelope(label, tld) : { name: label, label, display_label: label, punycode_name: label, normalized_name: label };
  return Response.json(
    {
      ...env,
      tld,
      address: null,
      exists: false,
    },
    { status: 404, headers: CORS_HEADERS },
  );
}
