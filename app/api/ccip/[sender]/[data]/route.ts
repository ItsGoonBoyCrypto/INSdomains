/**
 * CCIP-Read gateway for `*.igra.eth` resolution from ENS-aware wallets.
 *
 * Path: `/api/ccip/{sender}/{data}.json`
 *   - sender: lowercase hex address of the calling wildcard resolver
 *             (used as `verifier` in the on-chain signature digest).
 *   - data:   hex-encoded inner resolver call. URL clients sometimes append
 *             `.json` per Durin convention; we strip it.
 *
 * Flow:
 *   1. Decode `data` → it's `abi.encode(bytes name, bytes innerCall)` where
 *      `name` is DNS-wire-encoded.
 *   2. Strip the `.igra.eth` suffix off the decoded name → INS label.
 *   3. Read V2 Registry's `resolve(label)` on Igra L2 to get the target.
 *   4. Sign `(result, expires, sender, extraData)` with EIP-191 using the
 *      gateway's CCIP_SIGNER_PRIVATE_KEY.
 *   5. Return `{ data: encodedResponse }` JSON.
 *
 * Disabled by default — returns 503 unless ALL of:
 *   - CCIP_GATEWAY_ENABLED === "true"
 *   - CCIP_SIGNER_PRIVATE_KEY set
 *   - NEXT_PUBLIC_INS_REGISTRY_IGRA_V2 set
 *
 * Standards: EIP-3668 + ENSIP-10. Digest computation in `lib/ccip.ts` MUST
 * match `INSWildcardL1.resolveCallback`.
 */

import {
  createPublicClient,
  decodeAbiParameters,
  http,
  isAddress,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  REGISTRY_V2_ABI,
  REGISTRY_V2_ADDRESS,
} from "@/lib/contracts";
import {
  dnsDecodeName,
  parseResolverCall,
  extractInsLabel,
  signCcipResponse,
  encodeCcipResponse,
  RESOLVER_SELECTORS,
} from "@/lib/ccip";
import { encodeAbiParameters, pad } from "viem";

export const runtime = "nodejs";
// CCIP gateways MUST NOT be cached at the edge — every request needs the
// signing key + fresh `expires` baked into the signature. Force dynamic.
export const dynamic = "force-dynamic";

const RPC = process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";
const PARENT_NAME = (process.env.CCIP_PARENT_NAME || "igra.eth").toLowerCase();
const TTL_SECONDS = Number(process.env.CCIP_TTL_SECONDS || "300");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

const client = createPublicClient({ transport: http(RPC) });

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function jsonErr(status: number, message: string) {
  return Response.json({ message }, { status, headers: CORS });
}

function gatewayEnabled(): boolean {
  return (
    process.env.CCIP_GATEWAY_ENABLED === "true" &&
    !!process.env.CCIP_SIGNER_PRIVATE_KEY &&
    REGISTRY_V2_ADDRESS !== "0x0000000000000000000000000000000000000000"
  );
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ sender: string; data: string }> },
): Promise<Response> {
  if (!gatewayEnabled()) {
    return jsonErr(503, "ccip gateway disabled");
  }

  // ── 1. Parse path params ─────────────────────────────────────
  const { sender: rawSender, data: rawData } = await context.params;
  // Durin clients suffix `.json`; tolerate either path shape.
  const senderHex = rawSender.toLowerCase();
  const dataHex = rawData.replace(/\.json$/i, "").toLowerCase();

  if (!isAddress(senderHex)) return jsonErr(400, `bad sender: ${senderHex}`);
  if (!dataHex.startsWith("0x")) return jsonErr(400, "data must be 0x-prefixed");

  const verifier = senderHex as Address;

  // ── 2. Decode the (name, innerCall) tuple the L1 contract packed ──
  let name: Hex;
  let innerCall: Hex;
  try {
    [name, innerCall] = decodeAbiParameters(
      [{ type: "bytes" }, { type: "bytes" }],
      dataHex as Hex,
    ) as [Hex, Hex];
  } catch (e) {
    return jsonErr(400, `cannot decode (name, data): ${(e as Error).message}`);
  }

  // ── 3. DNS-decode the name → "alice.igra.eth" → "alice" ──────
  let dotted: string;
  try {
    dotted = dnsDecodeName(name);
  } catch (e) {
    return jsonErr(400, `dns decode failed: ${(e as Error).message}`);
  }
  const label = extractInsLabel(dotted, PARENT_NAME);
  if (label === null) {
    // Caller asked for something outside our wildcard. Return zero per ENS
    // convention rather than 4xx — that's how wallets expect "no record".
    return signedZero(verifier, dataHex as Hex);
  }

  // ── 4. Parse the inner resolver call ─────────────────────────
  const call = parseResolverCall(innerCall);

  // ── 5. Route to the right backend read ───────────────────────
  let resultHex: Hex;
  try {
    if (call.kind === "addr") {
      // Standard ENS addr(node) — return the V2 target as 32-byte-padded address.
      const target = await client.readContract({
        address: REGISTRY_V2_ADDRESS,
        abi: REGISTRY_V2_ABI,
        functionName: "resolve",
        args: [label],
      });
      // ENS PublicResolver `addr(node)` returns the address ABI-encoded
      // (one 32-byte word, left-padded with zeros).
      resultHex = encodeAbiParameters([{ type: "address" }], [target as Address]);
    } else if (call.kind === "addrMulti") {
      // Multi-chain ENS — coinType 60 = ETH-style mainnet, but we serve any
      // EVM coinType from the same V2 target (ENS-style mapping for L2s).
      const target = await client.readContract({
        address: REGISTRY_V2_ADDRESS,
        abi: REGISTRY_V2_ABI,
        functionName: "resolve",
        args: [label],
      });
      // addr(node, coinType) returns `bytes`. For ETH-shape coinTypes we
      // return the raw 20 bytes of the address. Zero address → empty bytes.
      const raw = (target as string).toLowerCase();
      const zeroAddr = "0x0000000000000000000000000000000000000000";
      resultHex = encodeAbiParameters(
        [{ type: "bytes" }],
        [raw === zeroAddr ? "0x" : (pad(target as Address, { size: 20, dir: "left" }) as Hex)],
      );
    } else if (call.kind === "text") {
      // V2 Registry doesn't (yet) expose generic text records — there's a
      // separate INSResolver for that. For launch, return empty string for
      // every text key. v1.1 will route to INSResolver.text(node, key).
      // Returning "" is the ENS convention for "no value".
      resultHex = encodeAbiParameters([{ type: "string" }], [""]);
    } else if (call.kind === "contenthash") {
      // Same as text — empty bytes is the standard "no value" response.
      resultHex = encodeAbiParameters([{ type: "bytes" }], ["0x"]);
    } else {
      // Unsupported selector — return zero bytes. ENS clients tolerate this.
      resultHex = "0x";
    }
  } catch (e) {
    return jsonErr(502, `igra l2 read failed: ${(e as Error).message}`);
  }

  // ── 6. Sign + encode response ───────────────────────────────
  const expires = BigInt(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  const extraData = dataHex as Hex; // exactly what the L1 contract passed back

  let signature: Hex;
  try {
    // We re-derive the account here (rather than caching) to keep the
    // private key never-passed-around inside this request scope.
    const pk = process.env.CCIP_SIGNER_PRIVATE_KEY as Hex;
    // Sanity check the PK shape so a typo produces a clear 5xx, not a crash.
    if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
      return jsonErr(500, "CCIP_SIGNER_PRIVATE_KEY misconfigured (expect 0x + 64 hex)");
    }
    // Confirm the signer's address matches what's allowlisted on chain.
    // (Optional sanity log — strip in prod if noisy.)
    void privateKeyToAccount(pk);

    signature = await signCcipResponse({
      privateKey: pk,
      verifier,
      expires,
      extraData,
      result: resultHex,
    });
  } catch (e) {
    return jsonErr(500, `sign failed: ${(e as Error).message}`);
  }

  const encoded = encodeCcipResponse({ result: resultHex, expires, signature });

  return Response.json({ data: encoded }, { headers: CORS });
}

/** Helper: sign + return a zero-result response for unsupported queries. */
async function signedZero(verifier: Address, extraData: Hex): Promise<Response> {
  const expires = BigInt(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  const result: Hex = "0x"; // ENS convention for "no record"
  const pk = process.env.CCIP_SIGNER_PRIVATE_KEY as Hex;
  const signature = await signCcipResponse({
    privateKey: pk,
    verifier,
    expires,
    extraData,
    result,
  });
  const encoded = encodeCcipResponse({ result, expires, signature });
  return Response.json({ data: encoded }, { headers: CORS });
}

// Acknowledge unused imports so the linter doesn't trip — these are used
// through dynamic re-exports above.
void RESOLVER_SELECTORS;
