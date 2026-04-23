"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { ArrowRight, ExternalLink, History, Loader2, Sparkles } from "lucide-react";
import { REGISTRY_ADDRESS } from "@/lib/contracts";
import { explorerTx } from "@/lib/igra-chain";
import { shortAddr } from "@/lib/names";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
);
const TARGET_SET_EVENT = parseAbiItem(
  "event TargetSet(uint256 indexed tokenId, address indexed target)",
);

type Entry = {
  kind: "mint" | "transfer" | "target";
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
  from?: `0x${string}`;
  to?: `0x${string}`;
  target?: `0x${string}`;
};

export function NameHistory({ tokenId }: { tokenId: bigint }) {
  const client = usePublicClient();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [transferLogs, targetLogs] = await Promise.all([
          client.getLogs({
            address: REGISTRY_ADDRESS,
            event: TRANSFER_EVENT,
            args: { tokenId },
            fromBlock: 0n,
            toBlock: "latest",
          }),
          client.getLogs({
            address: REGISTRY_ADDRESS,
            event: TARGET_SET_EVENT,
            args: { tokenId },
            fromBlock: 0n,
            toBlock: "latest",
          }),
        ]);

        const blocks = new Set<bigint>();
        transferLogs.forEach((l) => blocks.add(l.blockNumber));
        targetLogs.forEach((l) => blocks.add(l.blockNumber));

        const blockTimes = new Map<bigint, number>();
        await Promise.all(
          Array.from(blocks).map(async (bn) => {
            const b = await client.getBlock({ blockNumber: bn });
            blockTimes.set(bn, Number(b.timestamp));
          }),
        );

        const rows: Entry[] = [];

        for (const l of transferLogs) {
          const from = l.args.from as `0x${string}`;
          const to = l.args.to as `0x${string}`;
          rows.push({
            kind: from.toLowerCase() === ZERO_ADDR ? "mint" : "transfer",
            txHash: l.transactionHash,
            blockNumber: l.blockNumber,
            timestamp: blockTimes.get(l.blockNumber) ?? 0,
            from,
            to,
          });
        }
        for (const l of targetLogs) {
          rows.push({
            kind: "target",
            txHash: l.transactionHash,
            blockNumber: l.blockNumber,
            timestamp: blockTimes.get(l.blockNumber) ?? 0,
            target: l.args.target as `0x${string}`,
          });
        }

        rows.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        if (!cancelled) setEntries(rows);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, tokenId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-black/40 p-4 text-xs text-white/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading on-chain history…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-500/5 p-4 text-xs text-red-300">
        Failed to load history: {error.split("\n")[0]}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="rounded-xl bg-black/40 p-4 text-xs text-white/50">
        No history yet.
      </div>
    );
  }

  return (
    <ol className="space-y-1 rounded-xl bg-black/40 p-2">
      {entries.map((e, i) => (
        <li
          key={`${e.txHash}-${i}`}
          className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.03]"
        >
          <div className="flex min-w-0 items-center gap-2.5 text-xs">
            <Icon kind={e.kind} />
            <span className="truncate text-white/80">{describe(e)}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span>{relTime(e.timestamp)}</span>
            <a
              href={explorerTx(e.txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 hover:text-cyan"
              title={e.txHash}
            >
              tx <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Icon({ kind }: { kind: Entry["kind"] }) {
  if (kind === "mint")
    return (
      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
        <Sparkles className="h-3 w-3" />
      </span>
    );
  if (kind === "transfer")
    return (
      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-plum/15 text-plum">
        <ArrowRight className="h-3 w-3" />
      </span>
    );
  return (
    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-cyan/15 text-cyan">
      <History className="h-3 w-3" />
    </span>
  );
}

function describe(e: Entry): string {
  if (e.kind === "mint") return `Minted → ${shortAddr(e.to!)}`;
  if (e.kind === "transfer") return `${shortAddr(e.from!)} → ${shortAddr(e.to!)}`;
  return `Target set → ${shortAddr(e.target!)}`;
}

function relTime(ts: number): string {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString();
}
