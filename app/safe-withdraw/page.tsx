"use client";

/**
 * /safe-withdraw — minimal in-dapp Safe tx composer.
 *
 * Problem this solves: the Registry is owned by a Gnosis Safe
 * (TREASURY_SAFE_ADDRESS). `withdraw()` is onlyOwner, so an EOA (even
 * a Safe signer) that calls Registry.withdraw() directly from /admin
 * gets reverted. Normally you'd go to app.safe.global — but Igra L2
 * isn't a default-supported chain there, and our in-dapp /safe page
 * doesn't exist on INS.
 *
 * This page constructs the Safe execTransaction() call with a
 * PREVALIDATED signature (v=1, r=owner, msg.sender==owner). Safe v1.3+
 * accepts that shape without any off-chain signing — the owner just
 * sends the tx and Safe treats it as pre-approved. Works for 1-of-1
 * Safes transparently; for N-of-M would need N-1 additional on-chain
 * approveHash() calls (we're 1-of-1 so one click is enough).
 *
 * Gated behind the same isAdmin() check as /admin — only the
 * NEXT_PUBLIC_ADMIN_WALLET address sees this page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { encodeFunctionData, formatEther, isAddress, getAddress, concat, pad, numberToHex, type Address } from "viem";
import {
  ArrowLeft, Shield, ArrowRight, Loader2, Check, AlertTriangle, ExternalLink, Layers,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { shortAddr } from "@/lib/names";
import { explorerAddr } from "@/lib/igra-chain";
import {
  TREASURY_SAFE_ADDRESS,
  TREASURY_SPLITTER_ADDRESS,
  REGISTRY_V2_ADDRESS,
  REGISTRY_V2_ABI,
} from "@/lib/contracts";
import { isAdmin } from "@/lib/admin";

const EXPLORER_TX = "https://explorer.igralabs.com/tx/";
const EXPLORER_ADDR = "https://explorer.igralabs.com/address/";

// Minimal Safe v1.3 ABI — just what we need for execTransaction.
const SAFE_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "execTransaction",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getOwners",
    inputs: [],
    outputs: [{ type: "address[]" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getThreshold",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "nonce",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const SPLITTER_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "flush",
    inputs: [],
    outputs: [],
  },
] as const;

/**
 * Pre-validated signature for a 1-of-1 Safe where msg.sender IS the owner.
 * Format: 65 bytes = [r (32) | s (32) | v (1)]
 *   r = owner address, left-padded to 32 bytes
 *   s = zero
 *   v = 1  (signals "approved on-chain OR msg.sender == r")
 *
 * Safe's checkSignatures() then validates:
 *   require(msg.sender == recoveredOwner || approvedHashes[owner][hash] != 0)
 * The msg.sender branch means no prior approveHash() call is needed.
 */
function prevalidatedSig(owner: Address): `0x${string}` {
  const r = pad(owner, { size: 32 });                  // 32 bytes
  const s = ("0x" + "00".repeat(32)) as `0x${string}`; // 32 bytes
  const v = ("0x01") as `0x${string}`;                 // 1 byte
  return concat([r, s, v]) as `0x${string}`;
}

export default function SafeWithdrawPage() {
  const { address } = useAccount();
  const allowed = isAdmin(address ?? null);

  const [destination, setDestination] = useState<string>("");
  // Default destination to connected EOA once we know it
  useEffect(() => {
    if (address && !destination) setDestination(address);
  }, [address, destination]);

  // Live chain state
  const { data: registryBalance, refetch: refetchRegistryBal } = useBalance({ address: REGISTRY_V2_ADDRESS });
  const { data: safeBalance } = useBalance({ address: TREASURY_SAFE_ADDRESS });
  const { data: splitterBalance, refetch: refetchSplitterBal } = useBalance({ address: TREASURY_SPLITTER_ADDRESS });
  const { data: eoaBalance } = useBalance({ address });

  const { data: safeOwners } = useReadContract({
    address: TREASURY_SAFE_ADDRESS,
    abi: SAFE_ABI,
    functionName: "getOwners",
  });
  const { data: safeThreshold } = useReadContract({
    address: TREASURY_SAFE_ADDRESS,
    abi: SAFE_ABI,
    functionName: "getThreshold",
  });

  const owners = (safeOwners as Address[] | undefined) ?? [];
  const threshold = Number((safeThreshold as bigint | undefined) ?? 0n);
  const isSigner = address ? owners.map((o) => o.toLowerCase()).includes(address.toLowerCase()) : false;
  const canExecuteDirect = isSigner && threshold === 1;

  // Write states — one per button so UI can show per-tx progress
  const wWithdrawTo = useWriteContract();
  const rWithdrawTo = useWaitForTransactionReceipt({ hash: wWithdrawTo.data });

  const wWithdrawToSplitter = useWriteContract();
  const rWithdrawToSplitter = useWaitForTransactionReceipt({ hash: wWithdrawToSplitter.data });

  const wFlush = useWriteContract();
  const rFlush = useWaitForTransactionReceipt({ hash: wFlush.data });

  // Auto-refresh balances when any tx confirms
  useEffect(() => {
    if (rWithdrawTo.isSuccess || rWithdrawToSplitter.isSuccess || rFlush.isSuccess) {
      refetchRegistryBal();
      refetchSplitterBal();
    }
  }, [rWithdrawTo.isSuccess, rWithdrawToSplitter.isSuccess, rFlush.isSuccess, refetchRegistryBal, refetchSplitterBal]);

  const destValid = destination.length > 0 && isAddress(destination);
  const registryHasBalance = (registryBalance?.value ?? 0n) > 0n;
  const splitterHasBalance = (splitterBalance?.value ?? 0n) > 0n;

  // Build the Safe tx: Safe → Registry.withdraw(destination)
  const execWithdrawTo = () => {
    if (!destValid || !address) return;
    const innerData = encodeFunctionData({
      abi: REGISTRY_V2_ABI,
      functionName: "withdraw",
      args: [getAddress(destination) as Address],
    });
    wWithdrawTo.writeContract({
      address: TREASURY_SAFE_ADDRESS,
      abi: SAFE_ABI,
      functionName: "execTransaction",
      args: [
        REGISTRY_V2_ADDRESS,         // to
        0n,                           // value
        innerData,                    // data: withdraw(destination)
        0,                            // operation: 0 = CALL
        0n, 0n, 0n,                   // safeTxGas, baseGas, gasPrice (all 0 = no refund)
        "0x0000000000000000000000000000000000000000" as Address, // gasToken
        "0x0000000000000000000000000000000000000000" as Address, // refundReceiver
        prevalidatedSig(address),     // signatures (pre-validated, no off-chain sig needed)
      ],
    });
  };

  // Build the Safe tx: Safe → Registry.withdraw(splitter)
  const execWithdrawToSplitter = () => {
    if (!address) return;
    const innerData = encodeFunctionData({
      abi: REGISTRY_V2_ABI,
      functionName: "withdraw",
      args: [TREASURY_SPLITTER_ADDRESS],
    });
    wWithdrawToSplitter.writeContract({
      address: TREASURY_SAFE_ADDRESS,
      abi: SAFE_ABI,
      functionName: "execTransaction",
      args: [
        REGISTRY_V2_ADDRESS,
        0n,
        innerData,
        0,
        0n, 0n, 0n,
        "0x0000000000000000000000000000000000000000" as Address,
        "0x0000000000000000000000000000000000000000" as Address,
        prevalidatedSig(address),
      ],
    });
  };

  // Flush the splitter — no Safe needed (flush() is public)
  const execFlush = () => {
    wFlush.writeContract({
      address: TREASURY_SPLITTER_ADDRESS,
      abi: SPLITTER_ABI,
      functionName: "flush",
      args: [],
    });
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 pt-12 pb-24">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.04] px-3 py-1 text-[11px] font-mono uppercase tracking-widest text-emerald-300">
          <Shield className="h-3 w-3" /> Admin · Safe withdraw
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Withdraw via Treasury <span className="ins-gradient-text">Safe</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/60">
          Composes a Safe <code className="font-mono text-emerald-300">execTransaction</code> call so the owner
          (<code className="font-mono text-white/80">{shortAddr(TREASURY_SAFE_ADDRESS)}</code>) can call{" "}
          <code className="font-mono text-emerald-300">Registry.withdraw()</code> from a signer EOA. One tx, no
          external Safe UI needed. Uses a pre-validated signature (Safe accepts <code>msg.sender == owner</code>
          {" "}without off-chain signing).
        </p>

        {!address && (
          <GateCard heading="Connect your wallet">
            Connect the admin wallet to continue.
            <div className="mt-3"><ConnectButton /></div>
          </GateCard>
        )}

        {address && !allowed && (
          <GateCard heading="Wrong wallet connected" tone="warn">
            You're connected as <code className="font-mono text-white/80">{shortAddr(address)}</code>. This page
            is gated to the admin wallet configured in <code>NEXT_PUBLIC_ADMIN_WALLET</code>.
          </GateCard>
        )}

        {address && allowed && !isSigner && (
          <GateCard heading="Connected wallet is not a Safe signer" tone="warn">
            Your EOA ({shortAddr(address)}) isn't in the Safe's owner set, so pre-validated signatures won't work.
            Signers: {owners.map((o) => shortAddr(o)).join(", ")}
          </GateCard>
        )}

        {address && allowed && isSigner && !canExecuteDirect && (
          <GateCard heading="Safe threshold is > 1" tone="warn">
            The Safe requires {threshold} signatures. Pre-validated signatures only work directly for 1-of-N
            Safes. Collect {threshold - 1} other signer approve-hash calls first, or use app.safe.global with
            Igra added as a custom network.
          </GateCard>
        )}

        {address && allowed && canExecuteDirect && (
          <>
            {/* Live state */}
            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat label="Registry V2" value={registryBalance ? `${Number(registryBalance.formatted).toFixed(4)} iKAS` : "—"} highlight />
              <Stat label="Safe" value={safeBalance ? `${Number(safeBalance.formatted).toFixed(4)} iKAS` : "—"} />
              <Stat label="Splitter" value={splitterBalance ? `${Number(splitterBalance.formatted).toFixed(4)} iKAS` : "—"} />
            </section>
            <div className="mt-2 text-xs text-white/40">
              Connected signer: <code className="font-mono">{shortAddr(address)}</code> ·
              Safe: <a href={EXPLORER_ADDR + TREASURY_SAFE_ADDRESS} target="_blank" rel="noreferrer" className="font-mono text-emerald-300 underline decoration-dotted">{shortAddr(TREASURY_SAFE_ADDRESS)}</a> · threshold {threshold}/{owners.length}
              {" · "}EOA gas: <code className="font-mono">{eoaBalance ? `${Number(eoaBalance.formatted).toFixed(3)} iKAS` : "—"}</code>
            </div>

            {/* Direct withdraw */}
            <section className="mt-8 rounded-2xl border border-cyan/25 bg-cyan/[0.03] p-5">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-cyan" />
                <h2 className="text-base font-bold text-white">Direct withdraw</h2>
              </div>
              <p className="mt-1 text-xs text-white/60">
                Pulls the entire Registry balance into any destination address.
              </p>
              <label className="mt-4 block text-[11px] font-mono uppercase tracking-widest text-white/50">
                Destination
              </label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="0x… destination address"
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm placeholder:text-white/30 focus:border-cyan/40 focus:outline-none"
                spellCheck={false}
              />
              <TxButton
                label={`Withdraw ${registryBalance ? Number(registryBalance.formatted).toFixed(2) : "0"} iKAS`}
                disabled={!destValid || !registryHasBalance}
                write={wWithdrawTo}
                receipt={rWithdrawTo}
                onClick={execWithdrawTo}
              />
            </section>

            {/* Split via splitter */}
            <section className="mt-6 rounded-2xl border border-plum/25 bg-plum/[0.03] p-5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-plum" />
                <h2 className="text-base font-bold text-white">Split through TreasurySplitter (80% / 20%)</h2>
              </div>
              <p className="mt-1 text-xs text-white/60">
                Two steps: (1) Safe moves Registry balance into the splitter, (2) anyone can flush. Final
                distribution: 80% to Treasury Safe, 20% to Igra DAO.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">Step 1 · Safe → Splitter</div>
                  <TxButton
                    label={`Load splitter with ${registryBalance ? Number(registryBalance.formatted).toFixed(2) : "0"} iKAS`}
                    disabled={!registryHasBalance}
                    write={wWithdrawToSplitter}
                    receipt={rWithdrawToSplitter}
                    onClick={execWithdrawToSplitter}
                  />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">Step 2 · Flush (public)</div>
                  <TxButton
                    label={`Flush ${splitterBalance ? Number(splitterBalance.formatted).toFixed(2) : "0"} iKAS`}
                    disabled={!splitterHasBalance}
                    write={wFlush}
                    receipt={rFlush}
                    onClick={execFlush}
                    tint="plum"
                  />
                </div>
              </div>
            </section>
          </>
        )}

        <Link href="/admin" className="mt-10 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
      </main>
      <Footer />
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-2xl border p-4 " + (highlight ? "border-cyan/30 bg-cyan/[0.04]" : "border-white/10 bg-white/[0.02]")}>
      <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">{label}</div>
      <div className={"mt-1 text-xl font-black " + (highlight ? "ins-gradient-text" : "text-white")}>{value}</div>
    </div>
  );
}

function GateCard({ heading, tone, children }: { heading: string; tone?: "warn"; children: React.ReactNode }) {
  const ring = tone === "warn" ? "border-amber-400/25 bg-amber-400/[0.05]" : "border-white/10 bg-white/[0.02]";
  const Icon = tone === "warn" ? AlertTriangle : Shield;
  const iconClass = tone === "warn" ? "text-amber-300" : "text-cyan";
  return (
    <div className={"mt-6 rounded-2xl border p-5 " + ring}>
      <div className="flex items-center gap-2">
        <Icon className={"h-4 w-4 " + iconClass} />
        <h2 className="text-base font-bold text-white">{heading}</h2>
      </div>
      <div className="mt-2 text-sm text-white/70">{children}</div>
    </div>
  );
}

type WriteSlot = ReturnType<typeof useWriteContract>;
type ReceiptSlot = ReturnType<typeof useWaitForTransactionReceipt>;

function TxButton({
  label, disabled, write, receipt, onClick, tint,
}: {
  label: string;
  disabled: boolean;
  write: WriteSlot;
  receipt: ReceiptSlot;
  onClick: () => void;
  tint?: "cyan" | "plum";
}) {
  const busy = write.isPending || receipt.isLoading;
  const colour = tint === "plum"
    ? "border-plum/40 bg-plum/15 text-plum hover:bg-plum/25"
    : "border-cyan/40 bg-cyan/15 text-cyan hover:bg-cyan/25";
  const errMsg = write.error?.message || receipt.error?.message;

  return (
    <div className="mt-2">
      <button
        onClick={onClick}
        disabled={disabled || busy}
        className={"inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 " + colour}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> :
         receipt.isSuccess ? <Check className="h-4 w-4" /> :
         <ArrowRight className="h-4 w-4" />}
        {busy ? "Submitting…" : receipt.isSuccess ? "Done" : label}
      </button>
      {write.data && (
        <a
          href={EXPLORER_TX + write.data}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-emerald-300"
        >
          {write.data.slice(0, 12)}… <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {errMsg && (
        <div className="mt-2 rounded-lg border border-red-400/25 bg-red-400/[0.05] p-2 text-xs text-red-300">
          {errMsg.slice(0, 200)}
        </div>
      )}
    </div>
  );
}
