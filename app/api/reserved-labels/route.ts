import {
  createPublicClient,
  decodeAbiParameters,
  decodeFunctionData,
  http,
  parseAbiItem,
  type Hex,
} from "viem";
import { REGISTRY_ADDRESS } from "@/lib/contracts";

export const runtime = "nodejs";
export const revalidate = 30;

const RPC =
  process.env.NEXT_PUBLIC_IGRA_RPC || "https://rpc.igralabs.com:8545";

const SET_RESERVED_SEL = "0xcf84eb00";          // setReserved(string,bool)
const SET_RESERVED_BATCH_SEL = "0xeb8f4c44";    // setReservedBatch(string[],bool)
const SAFE_EXEC_SEL = "0x6a761202";             // Gnosis Safe execTransaction(...)

const CHUNK = 50_000n;

const client = createPublicClient({ transport: http(RPC) });

const reservedEvent = parseAbiItem(
  "event Reserved(string indexed label, bool isReserved)",
);

const safeExecAbi = [
  parseAbiItem(
    "function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) returns (bool)",
  ),
] as const;

function labelOk(s: string): boolean {
  if (!s || s.length > 32) return false;
  return /^[a-z0-9-]+$/.test(s) && !s.startsWith("-") && !s.endsWith("-");
}

function extractLabels(input: Hex, depth = 0): string[] {
  if (depth > 3 || !input || input.length < 10) return [];
  const sel = input.slice(0, 10).toLowerCase();

  if (sel === SET_RESERVED_SEL) {
    const [label] = decodeAbiParameters(
      [{ type: "string" }, { type: "bool" }],
      `0x${input.slice(10)}` as Hex,
    );
    return [label as string];
  }

  if (sel === SET_RESERVED_BATCH_SEL) {
    const [labels] = decodeAbiParameters(
      [{ type: "string[]" }, { type: "bool" }],
      `0x${input.slice(10)}` as Hex,
    );
    return labels as string[];
  }

  if (sel === SAFE_EXEC_SEL) {
    try {
      const decoded = decodeFunctionData({ abi: safeExecAbi, data: input });
      const inner = decoded.args[2] as Hex;
      return extractLabels(inner, depth + 1);
    } catch {
      return [];
    }
  }

  return [];
}

async function fetchReservedLogs() {
  const latest = await client.getBlockNumber();
  const all: Array<{ transactionHash: Hex }> = [];
  let from = 0n;
  while (from <= latest) {
    const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
    const chunk = await client.getLogs({
      address: REGISTRY_ADDRESS,
      event: reservedEvent,
      fromBlock: from,
      toBlock: to,
    });
    all.push(...chunk.map((l) => ({ transactionHash: l.transactionHash as Hex })));
    from = to + 1n;
  }
  return all;
}

export async function GET() {
  if (REGISTRY_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return Response.json({ labels: [] });
  }

  try {
    const logs = await fetchReservedLogs();
    const txHashes = Array.from(new Set(logs.map((l) => l.transactionHash)));

    const labels = new Set<string>();
    for (const hash of txHashes) {
      try {
        const tx = await client.getTransaction({ hash });
        for (const raw of extractLabels(tx.input)) {
          const clean = String(raw).trim().toLowerCase();
          if (labelOk(clean)) labels.add(clean);
        }
      } catch {
        /* skip individual tx errors */
      }
    }

    return Response.json({ labels: Array.from(labels).sort() });
  } catch (e) {
    return Response.json(
      { error: (e as Error).message ?? "failed", labels: [] },
      { status: 500 },
    );
  }
}
