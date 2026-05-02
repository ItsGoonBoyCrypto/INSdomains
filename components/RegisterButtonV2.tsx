"use client";

/**
 * V2 register button — surfaces the Forever vs Annual choice locked in
 * docs/V2_SPEC.md. Drop-in replacement for the V1 RegisterButton on the
 * .igra TldRow when V2 is enabled (or when caller is admin for private
 * dogfooding before the public flag flips).
 *
 * UX:
 *   - Single primary button mints Forever at the V2 priceFor() rate
 *   - "or Annual ▾" link expands a year-count selector + Annual price
 *   - Both paths share the success / error UI and ShareToXModal hand-off
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Check, ExternalLink, Loader2, ChevronDown } from "lucide-react";
import {
  REGISTRY_V2_ADDRESS, REGISTRY_V2_ABI, isV2Deployed,
} from "@/lib/contracts";
import { ShareToXModal } from "@/components/ShareToXModal";

const IGRA_EXPLORER =
  process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";

const YEAR_CHOICES: readonly number[] = [1, 2, 3, 5, 10];

function formatIkas(wei: bigint | null | undefined): string {
  if (wei == null) return "—";
  // V1+V2 prices are whole-iKAS multiples (no fractional defaults), so
  // dividing by 1e18 gives a clean integer for display.
  const whole = Number(wei / 10n ** 18n);
  return whole.toLocaleString();
}

export function RegisterButtonV2({
  label,
  owner,
}: {
  label: string;
  owner?: `0x${string}`;
}) {
  const { isConnected } = useAccount();

  // Pre-V2-deploy guard. Shouldn't ever render here in practice (caller
  // gates on isV2Deployed/isV2Enabled), but defensive.
  if (!isV2Deployed()) {
    return (
      <button disabled className="btn-primary opacity-50 cursor-not-allowed text-xs">
        V2 not deployed
      </button>
    );
  }

  if (!owner || !isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button onClick={openConnectModal} className="btn-primary text-xs">
            Connect
          </button>
        )}
      </ConnectButton.Custom>
    );
  }

  return <V2Inner label={label} owner={owner} />;
}

function V2Inner({ label, owner }: { label: string; owner: `0x${string}` }) {
  // Pull both Forever + Annual prices live from V2.
  const { data: foreverPrice } = useReadContract({
    address: REGISTRY_V2_ADDRESS,
    abi: REGISTRY_V2_ABI,
    functionName: "priceFor",
    args: [label],
    query: { enabled: !!label },
  });
  const { data: annualPerYear } = useReadContract({
    address: REGISTRY_V2_ADDRESS,
    abi: REGISTRY_V2_ABI,
    functionName: "priceAnnualFor",
    args: [label],
    query: { enabled: !!label },
  });

  // Modal state for Annual year selection + dropdown open
  const [annualOpen, setAnnualOpen] = useState(false);
  const [years, setYears] = useState<number>(1);

  const { writeContract, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || confirming;

  const onMintForever = () => {
    if (foreverPrice == null) return;
    reset();
    writeContract({
      address: REGISTRY_V2_ADDRESS,
      abi: REGISTRY_V2_ABI,
      functionName: "register",
      args: [label, owner],
      value: foreverPrice as bigint,
    });
  };

  const onMintAnnual = () => {
    if (annualPerYear == null) return;
    reset();
    const totalPrice = (annualPerYear as bigint) * BigInt(years);
    writeContract({
      address: REGISTRY_V2_ADDRESS,
      abi: REGISTRY_V2_ABI,
      functionName: "registerAnnual",
      args: [label, owner, BigInt(years)],
      value: totalPrice,
    });
  };

  // After a successful mint, swap to the success state.
  if (confirmed && hash) {
    return <MintedSuccessV2 label={label} hash={hash} />;
  }

  const annualTotal =
    annualPerYear != null ? (annualPerYear as bigint) * BigInt(years) : null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Primary: Forever (the brand promise — keeps the headline) */}
      <button
        onClick={onMintForever}
        disabled={busy || foreverPrice == null}
        className="btn-primary text-xs"
      >
        {busy ? (
          <><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
            {isPending ? "Confirm…" : "Minting…"}
          </>
        ) : (
          <>Forever · {formatIkas(foreverPrice as bigint | undefined)} iKAS</>
        )}
      </button>

      {/* Secondary: Annual toggle */}
      <button
        onClick={() => setAnnualOpen((v) => !v)}
        disabled={busy}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-white/50 transition hover:text-cyan"
      >
        or Annual{" "}
        <ChevronDown
          className={`h-3 w-3 transition ${annualOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Annual year picker + mint */}
      {annualOpen && (
        <div className="mt-1 w-[260px] rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-emerald-300/80">
            <span>Annual tenure</span>
            <span className="font-mono text-emerald-300/60">
              {formatIkas(annualPerYear as bigint | undefined)} iKAS / yr
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {YEAR_CHOICES.map((y) => (
              <button
                key={y}
                onClick={() => setYears(y)}
                className={`rounded-md border px-2 py-1 text-[11px] font-bold transition ${
                  years === y
                    ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-200"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:border-emerald-500/30"
                }`}
              >
                {y}y
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-[11px] text-white/55">
              Total{" "}
              <span className="font-bold text-emerald-200">
                {formatIkas(annualTotal)} iKAS
              </span>
            </div>
            <button
              onClick={onMintAnnual}
              disabled={busy || annualPerYear == null}
              className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : `Mint ${years}y →`}
            </button>
          </div>
          <p className="mt-2 text-[9px] text-white/40">
            30-day grace period after expiry. Renew or extend-to-Forever any time.
          </p>
        </div>
      )}

      {error && (
        <button
          onClick={reset}
          className="max-w-[180px] truncate text-right text-[10px] text-red-300 hover:text-red-200"
          title={error.message}
        >
          {error.message.split("\n")[0] || "Tx failed"} — retry
        </button>
      )}
    </div>
  );
}

function MintedSuccessV2({ label, hash }: { label: string; hash: `0x${string}` }) {
  const { data: tokenId } = useReadContract({
    address: REGISTRY_V2_ADDRESS,
    abi: REGISTRY_V2_ABI,
    functionName: "tokenIdOf",
    args: [label],
    query: { enabled: !!label },
  });

  const [shareOpen, setShareOpen] = useState(false);
  const poppedForHash = useRef<string | null>(null);
  useEffect(() => {
    if (
      typeof tokenId === "bigint" &&
      tokenId > 0n &&
      poppedForHash.current !== hash
    ) {
      poppedForHash.current = hash;
      setShareOpen(true);
    }
  }, [tokenId, hash]);

  const fullName = `${label}.igra`;

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={() => setShareOpen(true)}
          className="btn-primary bg-emerald-400 text-xs"
        >
          <Check className="mr-1 inline h-3 w-3" />
          Minted V2! Share →
        </button>
        {typeof tokenId === "bigint" && tokenId > 0n && (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold text-white/70">
            V2 #{tokenId.toString()}
          </span>
        )}
        <a
          href={`${IGRA_EXPLORER}/tx/${hash}`}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] text-white/50 hover:text-cyan"
        >
          Tx <ExternalLink className="inline h-3 w-3" />
        </a>
      </div>
      <ShareToXModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        names={[fullName]}
        primaryTokenId={typeof tokenId === "bigint" ? tokenId : null}
      />
    </>
  );
}

/** Compact inline link to switch into the V2 register flow. Used in the
 *  TldRow when V2 is enabled and we want to prompt the user that V2 is
 *  the new path even though V1 still serves reads. */
export function V2Pill() {
  return (
    <Link
      href="/app"
      className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan"
    >
      V2
    </Link>
  );
}
