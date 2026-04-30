/**
 * Shared utilities for /api/* route handlers.
 *
 * The Igra RPC caps `eth_getLogs` at 100,000 blocks per call and doesn't
 * have multicall3 deployed at the canonical address, so we need:
 *
 *   1. `getLogsChunked` — scan in 100k-block windows, concatenate.
 *   2. `parallelReadContract` — drop-in for `client.multicall` that just
 *      fans out individual `readContract` calls. Higher RPC count but no
 *      multicall3 dep.
 *
 * Both take the public client and target the same contract, so callers
 * stay terse.
 */
import type { PublicClient, Address, AbiEvent } from "viem";

/**
 * The .igra Registry + Marketplace were deployed around block 4,855,000
 * (2026-04-26). Pin a safe lower bound so getLogs scans don't waste time
 * walking blocks before the contract existed. Bump if you redeploy.
 */
export const IGRA_REGISTRY_DEPLOY_BLOCK = 4_800_000n;

/** Igra RPC's max block range per `eth_getLogs` call (provider-enforced). */
const MAX_RANGE = 99_000n;

/**
 * Chunked replacement for `client.getLogs(...)` that walks the chain in
 * MAX_RANGE-sized windows. Pass `fromBlock` if you know the contract's
 * deploy block (saves work); otherwise it defaults to the registry deploy
 * floor.
 */
export async function getLogsChunked<T extends AbiEvent>(opts: {
  client: PublicClient;
  address: Address;
  event: T;
  args?: Record<string, unknown>;
  fromBlock?: bigint;
}): Promise<Awaited<ReturnType<PublicClient["getLogs"]>>> {
  const { client, address, event, args, fromBlock } = opts;
  const head = await client.getBlockNumber();
  const start = fromBlock ?? IGRA_REGISTRY_DEPLOY_BLOCK;
  const all: Awaited<ReturnType<PublicClient["getLogs"]>> = [];

  for (let from = start; from <= head; from += MAX_RANGE + 1n) {
    const to = from + MAX_RANGE > head ? head : from + MAX_RANGE;
    const logs = await client.getLogs({
      address,
      // viem's getLogs is overloaded; the cast keeps the call site terse
      // without forcing every caller to spell the full event-arg type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event: event as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: args as any,
      fromBlock: from,
      toBlock: to,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    all.push(...(logs as any[]));
  }
  return all;
}

/**
 * Drop-in for `client.multicall(...)` that does NOT require multicall3 to
 * be deployed on-chain. Fans out individual reads in parallel. Returns the
 * same `{ status, result } | { status, error }` shape as multicall so
 * callers can swap with minimal change.
 *
 * For the small N (<= 50) we do per-API-route this is fine; throughput is
 * RPC-limited but our endpoints are edge-cached for 30-60s anyway.
 */
export async function parallelReadContract<TResult>(
  client: PublicClient,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reads: Array<Parameters<PublicClient["readContract"]>[0]>,
): Promise<Array<{ status: "success"; result: TResult } | { status: "failure"; error: Error }>> {
  return Promise.all(
    reads.map(async (r) => {
      try {
        const result = (await client.readContract(r)) as TResult;
        return { status: "success" as const, result };
      } catch (e) {
        return { status: "failure" as const, error: e as Error };
      }
    }),
  );
}
