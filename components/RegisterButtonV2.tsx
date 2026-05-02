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
import { Check, ExternalLink, Loader2 } from "lucide-react";
import {
  REGISTRY_V2_ADDRESS, REGISTRY_V2_ABI, isV2Deployed,
} from "@/lib/contracts";
import { ShareToXModal } from "@/components/ShareToXModal";

const IGRA_EXPLORER =
  process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";

// Public Annual tenure is intentionally locked to 1 year — the contract
// (INSRegistryIgraV2) accepts 1..10 years so admin can still gift multi-year
// names via adminMintAnnual to ecosystem partners, but the public dApp UI
// keeps the choice simple: Forever or 1-year. Decision locked 2026-05-02.
const ANNUAL_YEARS = 1;

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

  const { writeContract, data: hash, error, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || confirming;
  // Track which path the user clicked so the button-level loading state
  // shows on the right tile, not both.
  const [activePath, setActivePath] = useState<"forever" | "annual" | null>(null);

  const onMintForever = () => {
    if (foreverPrice == null) return;
    reset();
    setActivePath("forever");
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
    setActivePath("annual");
    writeContract({
      address: REGISTRY_V2_ADDRESS,
      abi: REGISTRY_V2_ABI,
      functionName: "registerAnnual",
      args: [label, owner, BigInt(ANNUAL_YEARS)],
      value: (annualPerYear as bigint) * BigInt(ANNUAL_YEARS),
    });
  };

  // After a successful mint, swap to the success state.
  if (confirmed && hash) {
    return <MintedSuccessV2 label={label} hash={hash} />;
  }

  const foreverBusy = busy && activePath === "forever";
  const annualBusy = busy && activePath === "annual";

  return (
    <div className="flex flex-col items-stretch gap-2 sm:min-w-[220px]">
      {/* Forever — primary brand option. Cyan/plum gradient, big, "pay once". */}
      <button
        onClick={onMintForever}
        disabled={busy || foreverPrice == null}
        className="group relative overflow-hidden rounded-xl border border-cyan/40 bg-gradient-to-br from-cyan/15 via-cyan/10 to-plum/15 px-4 py-2.5 text-left transition hover:border-cyan/70 hover:from-cyan/25 hover:to-plum/25 disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
              Forever
            </div>
            <div className="mt-0.5 text-base font-black text-white">
              {formatIkas(foreverPrice as bigint | undefined)} iKAS
            </div>
          </div>
          <div className="text-right text-[10px] text-white/55">
            {foreverBusy ? (
              <Loader2 className="ml-auto h-4 w-4 animate-spin text-cyan" />
            ) : (
              <>
                pay once<br />
                no renewals
              </>
            )}
          </div>
        </div>
      </button>

      {/* Annual 1yr — secondary, but visually equal weight. Emerald accent. */}
      <button
        onClick={onMintAnnual}
        disabled={busy || annualPerYear == null}
        className="group relative overflow-hidden rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/12 via-emerald-500/8 to-transparent px-4 py-2.5 text-left transition hover:border-emerald-500/70 hover:from-emerald-500/22 disabled:opacity-50"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">
              Annual · 1 year
            </div>
            <div className="mt-0.5 text-base font-black text-white">
              {formatIkas(annualPerYear as bigint | undefined)} iKAS
            </div>
          </div>
          <div className="text-right text-[10px] text-white/55">
            {annualBusy ? (
              <Loader2 className="ml-auto h-4 w-4 animate-spin text-emerald-300" />
            ) : (
              <>
                renewable<br />
                30-day grace
              </>
            )}
          </div>
        </div>
      </button>

      {error && (
        <button
          onClick={() => { reset(); setActivePath(null); }}
          className="truncate text-right text-[10px] text-red-300 hover:text-red-200"
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
        registryVersion="v2"
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
