"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseAbiItem, type Address } from "viem";
import { ChevronDown, ChevronRight, Plus, Lock, LockOpen, Loader2, Check, X, ExternalLink } from "lucide-react";
import {
  SUBNAME_EXTENSION_ADDRESS,
  SUBNAME_EXTENSION_ABI,
  REGISTRY_ADDRESSES,
  type Tld,
} from "@/lib/contracts";
import { isValidLabel, cleanLabel, shortAddr } from "@/lib/names";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const EXPLORER = process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";

/**
 * SubnamesPanel — collapsible "Subnames" section on each /domains card for a
 * top-level name (only renders for `.igra` since that's our active TLD).
 *
 * Renders NOTHING when:
 *   (a) SUBNAME_EXTENSION_ADDRESS is the zero address (env var not set), OR
 *   (b) the on-chain `enabled()` getter returns false
 *
 * Both gates must clear, so even if the contract is deployed but admin hasn't
 * flipped enabled yet, users see no subname UI.
 *
 * Uses event-log scanning to enumerate existing subnames since Solidity
 * mappings aren't iterable. ~1 RPC round trip per parent on first expand,
 * cached after.
 */
export function SubnamesPanel({
  parentTokenId,
  parentLabel,
  tld,
}: {
  parentTokenId: bigint;
  parentLabel: string;
  tld: Tld;
}) {
  // .igra-only for now — if you re-enable other TLDs in future, deploy a
  // second SubnameExtension keyed to that registry.
  if (tld !== "igra") return null;
  if (SUBNAME_EXTENSION_ADDRESS === ZERO) return null;

  return <SubnamesPanelInner parentTokenId={parentTokenId} parentLabel={parentLabel} />;
}

function SubnamesPanelInner({
  parentTokenId,
  parentLabel,
}: {
  parentTokenId: bigint;
  parentLabel: string;
}) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Gate (b): contract reports it's enabled
  const { data: enabled, isLoading: enabledLoading } = useReadContract({
    address: SUBNAME_EXTENSION_ADDRESS,
    abi: SUBNAME_EXTENSION_ABI,
    functionName: "enabled",
  });
  const { data: lockedFlag } = useReadContract({
    address: SUBNAME_EXTENSION_ADDRESS,
    abi: SUBNAME_EXTENSION_ABI,
    functionName: "lockedParents",
    args: [parentTokenId],
    query: { enabled: enabled === true },
  });

  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<{ subTokenId: bigint; label: string; owner: string; target: string }[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const fetchSubs = async () => {
    if (!publicClient) return;
    setLoadingSubs(true);
    setScanError(null);
    try {
      const SubnameMintedEvent = parseAbiItem(
        "event SubnameMinted(uint256 indexed parentTokenId, string indexed subLabel, uint256 indexed subTokenId, address to)",
      );
      // Scan from contract creation; fast in practice since this contract is new
      const logs = await publicClient.getLogs({
        address: SUBNAME_EXTENSION_ADDRESS,
        event: SubnameMintedEvent,
        args: { parentTokenId },
        fromBlock: 0n,
        toBlock: "latest",
      });
      // Note: indexed string is hashed in the topic — not recoverable. Fetch
      // each subId's label + owner + target via subLabelOf / ownerOf / targetOf.
      const subTokenIds = logs.map((l) => l.args.subTokenId).filter((x): x is bigint => x !== undefined);
      const seen = new Set<string>();
      const dedupedIds = subTokenIds.filter((id) => {
        const k = id.toString();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (dedupedIds.length === 0) {
        setSubs([]);
        return;
      }
      // Batch read label + owner + target for each
      const reads = await Promise.all(
        dedupedIds.flatMap((id) => [
          publicClient.readContract({ address: SUBNAME_EXTENSION_ADDRESS, abi: SUBNAME_EXTENSION_ABI, functionName: "subLabelOf", args: [id] }),
          publicClient.readContract({ address: SUBNAME_EXTENSION_ADDRESS, abi: SUBNAME_EXTENSION_ABI, functionName: "ownerOf",    args: [id] }),
          publicClient.readContract({ address: SUBNAME_EXTENSION_ADDRESS, abi: SUBNAME_EXTENSION_ABI, functionName: "targetOf",   args: [id] }),
        ]),
      );
      const out = dedupedIds.map((id, i) => ({
        subTokenId: id,
        label: reads[i * 3] as string,
        owner: reads[i * 3 + 1] as string,
        target: reads[i * 3 + 2] as string,
      }));
      // Filter out any owned-by-zero (burned, shouldn't happen in v1)
      setSubs(out.filter((x) => x.owner !== ZERO));
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "scan failed");
    } finally {
      setLoadingSubs(false);
    }
  };

  // Auto-fetch on first expand
  useEffect(() => {
    if (open && enabled === true && subs.length === 0 && !loadingSubs && !scanError) {
      void fetchSubs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enabled]);

  // Gate (a) is checked above; gate (b) here
  if (enabledLoading) return null;
  if (enabled !== true) return null;

  const isParentOwner = address?.toLowerCase() === undefined ? false : true; // parent ownership comes from outer card

  return (
    <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/55">
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Subnames
          {subs.length > 0 && <span className="text-white/35">({subs.length})</span>}
          {lockedFlag === true && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300/70">
              <Lock className="h-2.5 w-2.5" /> locked
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {scanError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] p-2 text-[11px] text-red-300">
              Scan error: {scanError}
            </div>
          )}

          {loadingSubs && subs.length === 0 && (
            <div className="flex items-center gap-2 text-[11px] text-white/45">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading subnames…
            </div>
          )}

          {!loadingSubs && subs.length === 0 && !scanError && (
            <div className="text-[11px] text-white/45">
              No subnames yet. Create one below.
            </div>
          )}

          {subs.map((s) => (
            <SubnameRow
              key={s.subTokenId.toString()}
              subTokenId={s.subTokenId}
              label={s.label}
              owner={s.owner as Address}
              target={s.target as Address}
              parentLabel={parentLabel}
              connected={address}
              onChange={fetchSubs}
            />
          ))}

          <AddSubname
            parentTokenId={parentTokenId}
            parentLabel={parentLabel}
            locked={lockedFlag === true}
            onCreated={fetchSubs}
          />

          {address && isParentOwner && (
            <ParentLockToggle
              parentTokenId={parentTokenId}
              locked={lockedFlag === true}
              onToggled={() => { /* state will refetch via useReadContract on next render */ }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Single subname row ──────────────────────────────────── */
function SubnameRow({
  subTokenId, label, owner, target, parentLabel, connected, onChange,
}: {
  subTokenId: bigint;
  label: string;
  owner: Address;
  target: Address;
  parentLabel: string;
  connected?: Address;
  onChange: () => void;
}) {
  const isOwner = connected?.toLowerCase() === owner.toLowerCase();
  const [editing, setEditing] = useState(false);
  const [newTarget, setNewTarget] = useState(target);
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (confirmed) {
      setEditing(false);
      onChange();
      const t = setTimeout(reset, 1500);
      return () => clearTimeout(t);
    }
  }, [confirmed, onChange, reset]);

  const valid = /^0x[a-fA-F0-9]{40}$/.test(newTarget.trim());

  const onSave = () => {
    if (!valid) return;
    writeContract({
      address: SUBNAME_EXTENSION_ADDRESS,
      abi: SUBNAME_EXTENSION_ABI,
      functionName: "setSubnameTarget",
      args: [subTokenId, newTarget as Address],
    });
  };

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-white/85">
          {label}<span className="text-white/40">.{parentLabel}.igra</span>
        </span>
        <span className="text-[10px] text-white/30">#{subTokenId.toString()}</span>
      </div>
      <div className="mt-1 text-[10px] text-white/50">
        owner <a href={`${EXPLORER}/address/${owner}`} target="_blank" rel="noreferrer" className="font-mono hover:text-cyan">{shortAddr(owner)}</a>
        {!editing && (
          <>
            {" · "}target <a href={`${EXPLORER}/address/${target}`} target="_blank" rel="noreferrer" className="font-mono hover:text-cyan">{shortAddr(target)}</a>
            {isOwner && (
              <button onClick={() => setEditing(true)} className="ml-2 text-cyan hover:underline">edit</button>
            )}
          </>
        )}
      </div>
      {editing && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
            placeholder="0x… new target"
            className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-[11px] focus:outline-none focus:border-cyan/40"
            spellCheck={false}
          />
          <button
            onClick={onSave}
            disabled={!valid || isPending || confirming}
            className="inline-flex items-center gap-1 rounded-md border border-cyan/40 bg-cyan/10 px-2 py-1 text-[10px] font-bold text-cyan hover:bg-cyan/20 disabled:opacity-40"
          >
            {isPending || confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Save
          </button>
          <button
            onClick={() => { setEditing(false); setNewTarget(target); reset(); }}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/60 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
      {error && <div className="mt-1 text-[10px] text-red-300">{error.message.split("\n")[0]}</div>}
    </div>
  );
}

/* ── Add subname form ────────────────────────────────────── */
function AddSubname({
  parentTokenId, parentLabel, locked, onCreated,
}: {
  parentTokenId: bigint;
  parentLabel: string;
  locked: boolean;
  onCreated: () => void;
}) {
  const { address } = useAccount();
  const [label, setLabel] = useState("");
  const [recipient, setRecipient] = useState<string>("");
  const cleaned = cleanLabel(label);
  const labelOk = isValidLabel(cleaned);
  const recipOk = /^0x[a-fA-F0-9]{40}$/.test(recipient.trim());
  const valid = labelOk && recipOk && !!address && !locked;

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (confirmed) {
      setLabel(""); setRecipient("");
      onCreated();
      const t = setTimeout(reset, 1500);
      return () => clearTimeout(t);
    }
  }, [confirmed, onCreated, reset]);

  // Default recipient = connected wallet
  useEffect(() => {
    if (address && !recipient) setRecipient(address);
  }, [address, recipient]);

  const onMint = () => {
    if (!valid) return;
    writeContract({
      address: SUBNAME_EXTENSION_ADDRESS,
      abi: SUBNAME_EXTENSION_ABI,
      functionName: "mintSubname",
      args: [parentTokenId, cleaned, recipient as Address],
    });
  };

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-white/45 mb-2">Add subname</div>
      <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="pay"
          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs focus:outline-none focus:border-plum/40"
          spellCheck={false}
        />
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x…"
          className="rounded-md border border-white/10 bg-black/30 px-2 py-1 font-mono text-[11px] focus:outline-none focus:border-plum/40"
          spellCheck={false}
        />
        <button
          onClick={onMint}
          disabled={!valid || isPending || confirming}
          className="inline-flex items-center gap-1 rounded-md border border-plum/40 bg-plum/10 px-3 py-1 text-xs font-bold text-plum hover:bg-plum/20 disabled:opacity-40"
        >
          {isPending || confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Mint
        </button>
      </div>
      <div className="mt-1 text-[10px] text-white/40">
        Will mint <span className="font-mono text-white/60">{cleaned || "_"}.{parentLabel}.igra</span>
        {locked && <span className="ml-2 text-amber-300">⚠ parent is locked — unlock first</span>}
      </div>
      {error && <div className="mt-1 text-[10px] text-red-300">{error.message.split("\n")[0]}</div>}
    </div>
  );
}

/* ── Parent lock toggle ──────────────────────────────────── */
function ParentLockToggle({
  parentTokenId, locked, onToggled,
}: {
  parentTokenId: bigint;
  locked: boolean;
  onToggled: () => void;
}) {
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (confirmed) {
      onToggled();
      const t = setTimeout(reset, 1500);
      return () => clearTimeout(t);
    }
  }, [confirmed, onToggled, reset]);

  const toggle = () => {
    writeContract({
      address: SUBNAME_EXTENSION_ADDRESS,
      abi: SUBNAME_EXTENSION_ABI,
      functionName: "lockParentSubnames",
      args: [parentTokenId, !locked],
    });
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] p-2 text-[11px]">
      <span className="text-white/50">
        {locked ? "🔒 No more subnames can be minted under this name." : "🔓 Anyone with parent ownership can mint subnames."}
      </span>
      <button
        onClick={toggle}
        disabled={isPending || confirming}
        className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-white/70 hover:text-white disabled:opacity-40"
      >
        {isPending || confirming ? <Loader2 className="h-3 w-3 animate-spin" /> : (locked ? <LockOpen className="h-3 w-3" /> : <Lock className="h-3 w-3" />)}
        {locked ? "Unlock" : "Lock"}
      </button>
    </div>
  );
}
