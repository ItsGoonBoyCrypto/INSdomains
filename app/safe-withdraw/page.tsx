"use client";

/**
 * /safe-withdraw — minimal in-dapp Safe tx composer (approveHash + exec).
 *
 * Problem this solves: the Registry is owned by a Gnosis Safe
 * (TREASURY_SAFE_ADDRESS). `withdraw()` is onlyOwner, so an EOA (even
 * a Safe signer) that calls Registry.withdraw() directly from /admin
 * gets reverted. We can't use app.safe.global because Igra L2 isn't
 * a default-supported chain there.
 *
 * Why NOT single-tx pre-validated signatures:
 *   Safe v1.3+ accepts a "prevalidated" signature shape (v=1, r=owner)
 *   when msg.sender==owner, which would let us do this in ONE tx. We
 *   tried that first — but MetaMask's internal eth_estimateGas is
 *   called with from=0x0 (no account context at estimation time).
 *   Safe's checkSignatures reverts (GS025) in that sim because
 *   msg.sender != owner. MM falls back to block gas limit × a
 *   conservative price → reports "no iKAS for gas" with a bogus 3.5
 *   iKAS estimate, and silently refuses to even broadcast the tx.
 *
 * Why the two-step approveHash flow works:
 *   Step 1: approveHash(txHash) — 50k-gas tx with no complex logic.
 *           MM's sim succeeds trivially, shows real gas price.
 *   Step 2: execTransaction(..., sig=prevalidated).
 *           After step 1, Safe.approvedHashes[owner][txHash] = 1.
 *           Safe's check becomes:
 *             require(msg.sender==owner  ← fails in MM sim
 *                     OR approvedHashes[owner][dataHash] != 0)  ← PASSES
 *           MM's sim from=0x0 now hits the second branch and returns
 *           success → real gas estimate → no bogus "insufficient funds".
 *
 * Single-button UX internally fires both via useWriteContractAsync +
 * waitForTransactionReceipt. User clicks once, MM pops twice, both
 * prompts show sane gas numbers.
 *
 * Gated behind the same isAdmin() check as /admin — only the
 * NEXT_PUBLIC_ADMIN_WALLET address sees this page.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  useAccount, useReadContract, useBalance,
  useWriteContract, usePublicClient,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { encodeFunctionData, isAddress, getAddress, concat, pad, type Address, type Hex } from "viem";
import {
  ArrowLeft, Shield, ArrowRight, Loader2, Check, AlertTriangle, ExternalLink, Layers,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { shortAddr } from "@/lib/names";
import {
  TREASURY_SAFE_ADDRESS,
  TREASURY_SPLITTER_ADDRESS,
  REGISTRY_V2_ADDRESS,
  REGISTRY_V2_ABI,
} from "@/lib/contracts";
import { isAdmin } from "@/lib/admin";

const EXPLORER_TX = "https://explorer.igralabs.com/tx/";
const EXPLORER_ADDR = "https://explorer.igralabs.com/address/";
const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

// Safe v1.5 ABI — minimal: exec + approveHash + getTransactionHash + nonce.
const SAFE_ABI = [
  {
    type: "function", stateMutability: "nonpayable", name: "execTransaction",
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
    type: "function", stateMutability: "nonpayable", name: "approveHash",
    inputs: [{ name: "hashToApprove", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function", stateMutability: "view", name: "getTransactionHash",
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
      { name: "_nonce", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  { type: "function", stateMutability: "view", name: "getOwners",    inputs: [], outputs: [{ type: "address[]" }] },
  { type: "function", stateMutability: "view", name: "getThreshold", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "nonce",        inputs: [], outputs: [{ type: "uint256" }] },
] as const;

const SPLITTER_ABI = [
  { type: "function", stateMutability: "nonpayable", name: "flush", inputs: [], outputs: [] },
] as const;

/**
 * Pre-validated signature. 65 bytes: [r (32) | s (32) | v (1)].
 *   r = owner padded to 32, s = 0, v = 1.
 * After an approveHash() call, Safe's check hits the approvedHashes
 * branch and accepts without msg.sender being the owner.
 */
function prevalidatedSig(owner: Address): Hex {
  const r = pad(owner, { size: 32 });
  const s = ("0x" + "00".repeat(32)) as Hex;
  const v = "0x01" as Hex;
  return concat([r, s, v]) as Hex;
}

/** The 10 args Safe uses for both getTransactionHash() and execTransaction(). */
function buildSafeArgs(to: Address, data: Hex) {
  return {
    to,
    value: 0n,
    data,
    operation: 0,                                // 0 = CALL
    safeTxGas: 0n,
    baseGas: 0n,
    gasPrice: 0n,
    gasToken: ZERO_ADDR,
    refundReceiver: ZERO_ADDR,
  };
}

type StepState = {
  stage: "idle" | "approving" | "executing" | "done" | "error";
  message?: string;
  approveTx?: Hex;
  execTx?: Hex;
};

export default function SafeWithdrawPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const allowed = isAdmin(address ?? null);

  const [destination, setDestination] = useState<string>("");
  useEffect(() => {
    if (address && !destination) setDestination(address);
  }, [address, destination]);

  // Live chain state
  const { data: registryBalance, refetch: refetchRegistryBal } = useBalance({ address: REGISTRY_V2_ADDRESS });
  const { data: safeBalance } = useBalance({ address: TREASURY_SAFE_ADDRESS });
  const { data: splitterBalance, refetch: refetchSplitterBal } = useBalance({ address: TREASURY_SPLITTER_ADDRESS });
  const { data: eoaBalance } = useBalance({ address });

  const { data: safeOwners } = useReadContract({
    address: TREASURY_SAFE_ADDRESS, abi: SAFE_ABI, functionName: "getOwners",
  });
  const { data: safeThreshold } = useReadContract({
    address: TREASURY_SAFE_ADDRESS, abi: SAFE_ABI, functionName: "getThreshold",
  });

  const owners = (safeOwners as Address[] | undefined) ?? [];
  const threshold = Number((safeThreshold as bigint | undefined) ?? 0n);
  const isSigner = address ? owners.map((o) => o.toLowerCase()).includes(address.toLowerCase()) : false;
  const canExecuteDirect = isSigner && threshold === 1;

  // Async writer — gives us a promise we can await between the two txs
  const { writeContractAsync } = useWriteContract();

  // Per-action state machines
  const [withdrawState, setWithdrawState] = useState<StepState>({ stage: "idle" });
  const [splitState, setSplitState] = useState<StepState>({ stage: "idle" });
  const [flushState, setFlushState] = useState<StepState>({ stage: "idle" });

  const destValid = destination.length > 0 && isAddress(destination);
  const registryHasBalance = (registryBalance?.value ?? 0n) > 0n;
  const splitterHasBalance = (splitterBalance?.value ?? 0n) > 0n;

  /**
   * Core 2-step flow:
   *   1. read Safe nonce + getTransactionHash() view
   *   2. send approveHash(hash)  → wait for receipt
   *   3. send execTransaction(..., prevalidated sig) → wait for receipt
   */
  async function runSafeTx(
    targetAddress: Address,
    innerData: Hex,
    owner: Address,
    setState: (s: StepState) => void,
  ) {
    if (!publicClient) { setState({ stage: "error", message: "No RPC client available" }); return; }

    try {
      const args = buildSafeArgs(targetAddress, innerData);

      // 1. Fetch current Safe nonce and compute the tx hash on-chain
      const currentNonce = await publicClient.readContract({
        address: TREASURY_SAFE_ADDRESS,
        abi: SAFE_ABI,
        functionName: "nonce",
      });
      const txHash = await publicClient.readContract({
        address: TREASURY_SAFE_ADDRESS,
        abi: SAFE_ABI,
        functionName: "getTransactionHash",
        args: [
          args.to, args.value, args.data, args.operation,
          args.safeTxGas, args.baseGas, args.gasPrice,
          args.gasToken, args.refundReceiver,
          currentNonce,
        ],
      });

      // 2. approveHash — small, always sim-safe
      setState({ stage: "approving", message: "Approving hash on Safe…" });
      const approveTx = await writeContractAsync({
        address: TREASURY_SAFE_ADDRESS,
        abi: SAFE_ABI,
        functionName: "approveHash",
        args: [txHash as Hex],
      });
      setState({ stage: "approving", approveTx, message: "Waiting for approval to confirm…" });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // 3. execTransaction — now sim passes (approved hash is on-chain)
      setState({ stage: "executing", approveTx, message: "Executing withdraw…" });
      const execTx = await writeContractAsync({
        address: TREASURY_SAFE_ADDRESS,
        abi: SAFE_ABI,
        functionName: "execTransaction",
        args: [
          args.to, args.value, args.data, args.operation,
          args.safeTxGas, args.baseGas, args.gasPrice,
          args.gasToken, args.refundReceiver,
          prevalidatedSig(owner),
        ],
      });
      setState({ stage: "executing", approveTx, execTx, message: "Waiting for execution to confirm…" });
      await publicClient.waitForTransactionReceipt({ hash: execTx });

      setState({ stage: "done", approveTx, execTx });
      refetchRegistryBal();
      refetchSplitterBal();
    } catch (e) {
      setState({ stage: "error", message: (e as Error).message?.slice(0, 300) ?? "failed" });
    }
  }

  const runWithdraw = () => {
    if (!destValid || !address) return;
    const innerData = encodeFunctionData({
      abi: REGISTRY_V2_ABI,
      functionName: "withdraw",
      args: [getAddress(destination) as Address],
    });
    void runSafeTx(REGISTRY_V2_ADDRESS, innerData, address, setWithdrawState);
  };

  const runSplitLoad = () => {
    if (!address) return;
    const innerData = encodeFunctionData({
      abi: REGISTRY_V2_ABI,
      functionName: "withdraw",
      args: [TREASURY_SPLITTER_ADDRESS],
    });
    void runSafeTx(REGISTRY_V2_ADDRESS, innerData, address, setSplitState);
  };

  const runFlush = async () => {
    if (!publicClient) return;
    try {
      setFlushState({ stage: "executing", message: "Flushing splitter…" });
      const tx = await writeContractAsync({
        address: TREASURY_SPLITTER_ADDRESS,
        abi: SPLITTER_ABI,
        functionName: "flush",
        args: [],
      });
      setFlushState({ stage: "executing", execTx: tx });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      setFlushState({ stage: "done", execTx: tx });
      refetchSplitterBal();
    } catch (e) {
      setFlushState({ stage: "error", message: (e as Error).message?.slice(0, 300) });
    }
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
          Executes a Safe transaction in <b>two steps</b>: (1) approve the tx hash on-chain, then
          (2) execute with a pre-validated signature. This bypasses MetaMask&apos;s broken estimation of
          prevalidated-sig calls — each step simulates cleanly on its own, so MM shows a real
          (tiny) gas estimate instead of refusing the tx.
        </p>

        {!address && (
          <GateCard heading="Connect your wallet">
            Connect the admin wallet to continue.
            <div className="mt-3"><ConnectButton /></div>
          </GateCard>
        )}

        {address && !allowed && (
          <GateCard heading="Wrong wallet connected" tone="warn">
            You&apos;re connected as <code className="font-mono text-white/80">{shortAddr(address)}</code>. This page
            is gated to the admin wallet configured in <code>NEXT_PUBLIC_ADMIN_WALLET</code>.
          </GateCard>
        )}

        {address && allowed && !isSigner && (
          <GateCard heading="Connected wallet is not a Safe signer" tone="warn">
            Your EOA ({shortAddr(address)}) isn&apos;t in the Safe&apos;s owner set.
            Signers: {owners.map((o) => shortAddr(o)).join(", ")}
          </GateCard>
        )}

        {address && allowed && isSigner && !canExecuteDirect && (
          <GateCard heading={`Safe threshold is ${threshold} — this flow is 1-of-N only`} tone="warn">
            Collect {threshold - 1} other signer approveHash calls first, or use app.safe.global with
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
                Pulls the entire Registry balance into any destination address. Two MetaMask prompts — approve + exec.
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
                disabled={withdrawState.stage === "approving" || withdrawState.stage === "executing"}
              />
              <StepRunner
                label={`Withdraw ${registryBalance ? Number(registryBalance.formatted).toFixed(2) : "0"} iKAS`}
                disabled={!destValid || !registryHasBalance}
                state={withdrawState}
                onClick={runWithdraw}
                tint="cyan"
              />
            </section>

            {/* Split via splitter */}
            <section className="mt-6 rounded-2xl border border-plum/25 bg-plum/[0.03] p-5">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-plum" />
                <h2 className="text-base font-bold text-white">Split through TreasurySplitter (80 / 20)</h2>
              </div>
              <p className="mt-1 text-xs text-white/60">
                Two phases: (1) Safe moves Registry balance into the splitter (approve + exec, 2 MM prompts).
                Then (2) anyone calls flush — splits 80% to Treasury, 20% to DAO.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">Phase 1 · Safe → Splitter</div>
                  <StepRunner
                    label={`Load splitter with ${registryBalance ? Number(registryBalance.formatted).toFixed(2) : "0"} iKAS`}
                    disabled={!registryHasBalance}
                    state={splitState}
                    onClick={runSplitLoad}
                    tint="plum"
                  />
                </div>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-widest text-white/50">Phase 2 · Flush (public)</div>
                  <StepRunner
                    label={`Flush ${splitterBalance ? Number(splitterBalance.formatted).toFixed(2) : "0"} iKAS`}
                    disabled={!splitterHasBalance}
                    state={flushState}
                    onClick={runFlush}
                    tint="plum"
                    singleStep
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

function StepRunner({
  label, disabled, state, onClick, tint, singleStep,
}: {
  label: string;
  disabled: boolean;
  state: StepState;
  onClick: () => void;
  tint: "cyan" | "plum";
  singleStep?: boolean;
}) {
  const busy = state.stage === "approving" || state.stage === "executing";
  const done = state.stage === "done";
  const colour = tint === "plum"
    ? "border-plum/40 bg-plum/15 text-plum hover:bg-plum/25"
    : "border-cyan/40 bg-cyan/15 text-cyan hover:bg-cyan/25";

  const buttonLabel = busy
    ? (singleStep ? "Submitting…" : state.stage === "approving" ? "1/2 · Approving hash…" : "2/2 · Executing…")
    : done ? "Done"
    : label;

  return (
    <div className="mt-2">
      <button
        onClick={onClick}
        disabled={disabled || busy}
        className={"inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40 " + colour}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        {buttonLabel}
      </button>
      {state.message && (
        <div className="mt-1 text-[11px] text-white/50">{state.message}</div>
      )}
      {state.approveTx && (
        <a
          href={EXPLORER_TX + state.approveTx}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-emerald-300"
        >
          approve: {state.approveTx.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {state.execTx && (
        <a
          href={EXPLORER_TX + state.execTx}
          target="_blank"
          rel="noreferrer"
          className="mt-1 ml-2 inline-flex items-center gap-1 text-[11px] font-mono text-white/50 hover:text-emerald-300"
        >
          exec: {state.execTx.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {state.stage === "error" && state.message && (
        <div className="mt-2 rounded-lg border border-red-400/25 bg-red-400/[0.05] p-2 text-xs text-red-300">
          {state.message}
        </div>
      )}
    </div>
  );
}
