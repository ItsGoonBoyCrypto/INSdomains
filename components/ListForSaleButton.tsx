"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatEther, parseEther } from "viem";
import {
  Tag, Star, Loader2, Check, X, AlertCircle,
} from "lucide-react";
import {
  REGISTRY_ABI,
  MARKETPLACE_ABI,
  REGISTRY_ADDRESSES,
  MARKETPLACE_ADDRESSES,
  isTldLive,
  tldSuffix,
  type Tld,
} from "@/lib/contracts";

const DURATIONS: { label: string; days: number }[] = [
  { label: "1 day",   days: 1 },
  { label: "7 days",  days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

type Listing = {
  seller: `0x${string}`;
  expiry: bigint;
  featured: boolean;
  active: boolean;
  price: bigint;
};

export function ListForSaleButton({
  tokenId, label, tld, onChange,
}: { tokenId: bigint; label: string; tld: Tld; onChange?: () => void }) {
  const { address } = useAccount();
  const [open, setOpen] = useState(false);

  const marketplaceAddr = MARKETPLACE_ADDRESSES[tld];
  const registryAddr = REGISTRY_ADDRESSES[tld];
  const tldLive = isTldLive(tld);

  const { data: listingRaw, refetch: refetchListing } = useReadContract({
    address: marketplaceAddr,
    abi: MARKETPLACE_ABI,
    functionName: "getActiveListing",
    args: [tokenId],
    query: { enabled: tldLive },
  });

  const listing = listingRaw as Listing | undefined;
  const isListed = !!listing?.active;

  const notifyChange = () => {
    refetchListing();
    if (onChange) onChange();
  };

  if (!tldLive) return null;
  if (!address) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
          isListed
            ? "border-cyan/40 bg-cyan/10 text-cyan hover:bg-cyan/20"
            : "border-white/10 bg-white/[0.03] text-white/70 hover:border-cyan/30 hover:text-white"
        }`}
        title={isListed ? `Manage your ${tldSuffix(tld)} listing` : `List this ${tldSuffix(tld)} name for sale`}
      >
        <Tag className="h-3.5 w-3.5" />
        {isListed ? "Listed" : "List for sale"}
      </button>

      {open && (
        <ListingModal
          tokenId={tokenId}
          label={label}
          tld={tld}
          marketplaceAddr={marketplaceAddr}
          registryAddr={registryAddr}
          currentListing={listing}
          seller={address}
          onClose={() => setOpen(false)}
          onChange={notifyChange}
        />
      )}
    </>
  );
}

/* ─────────────────────────── Modal ─────────────────────────── */

function ListingModal({
  tokenId, label, tld, marketplaceAddr, registryAddr, currentListing, seller, onClose, onChange,
}: {
  tokenId: bigint;
  label: string;
  tld: Tld;
  marketplaceAddr: `0x${string}`;
  registryAddr: `0x${string}`;
  currentListing: Listing | undefined;
  seller: `0x${string}`;
  onClose: () => void;
  onChange: () => void;
}) {
  const [priceStr, setPriceStr] = useState("");
  const [days, setDays] = useState(7);
  const [featured, setFeatured] = useState(false);

  const { data: approvedForAll, refetch: refetchApproval } = useReadContract({
    address: registryAddr,
    abi: REGISTRY_ABI,
    functionName: "isApprovedForAll",
    args: [seller, marketplaceAddr],
  });
  const isApproved = approvedForAll === true;

  const { data: featureFeeBps } = useReadContract({
    address: marketplaceAddr,
    abi: MARKETPLACE_ABI,
    functionName: "featureFeeBps",
  });
  const { data: saleFeeBps } = useReadContract({
    address: marketplaceAddr,
    abi: MARKETPLACE_ABI,
    functionName: "saleFeeBps",
  });

  // Emergency pause — surfaced in UI, CTAs suppressed when true.
  const { data: mktPaused } = useReadContract({
    address: marketplaceAddr,
    abi: MARKETPLACE_ABI,
    functionName: "paused",
  });

  const priceWei = useMemo(() => {
    try {
      if (!priceStr) return null;
      const n = Number(priceStr);
      if (!Number.isFinite(n) || n <= 0) return null;
      return parseEther(priceStr as `${number}`);
    } catch {
      return null;
    }
  }, [priceStr]);

  // H1 fix — read featureFee directly from the contract against the entered
  // price so `msg.value` always matches what `createListing` expects, even if
  // the admin changes `featureFeeBps` between page load and the user clicking
  // List. Previous version derived the fee from a cached bps + client math
  // which could revert on-chain if bps was bumped.
  const { data: featureFeeFromContract, isLoading: feeLoading } = useReadContract({
    address: marketplaceAddr,
    abi: MARKETPLACE_ABI,
    functionName: "featureFeeOn",
    args: priceWei !== null ? [priceWei] : undefined,
    query: { enabled: priceWei !== null && featured },
  });

  const featureFee = useMemo(() => {
    if (!featured || priceWei === null) return 0n;
    return (featureFeeFromContract as bigint | undefined) ?? 0n;
  }, [featured, priceWei, featureFeeFromContract]);

  const saleFee = useMemo(() => {
    if (priceWei === null) return 0n;
    const bps = BigInt(Number(saleFeeBps ?? 200));
    return (priceWei * bps) / 10_000n;
  }, [priceWei, saleFeeBps]);

  const youReceive = useMemo(() => {
    if (priceWei === null) return 0n;
    return priceWei - saleFee;
  }, [priceWei, saleFee]);

  const {
    writeContract, data: txHash, isPending, reset, error: txError,
  } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // what action is this modal about to take?
  type Step = "approve" | "list" | "cancel";
  const [activeStep, setActiveStep] = useState<Step | null>(null);

  useEffect(() => {
    if (!confirmed || !activeStep) return;
    // step finished — refresh relevant reads
    if (activeStep === "approve") {
      refetchApproval();
      reset();
      setActiveStep(null);
    } else {
      onChange();
      setTimeout(() => {
        onClose();
      }, 600);
    }
  }, [confirmed, activeStep, refetchApproval, reset, onChange, onClose]);

  const busy = isPending || confirming;

  const onApprove = () => {
    setActiveStep("approve");
    writeContract({
      address: registryAddr,
      abi: REGISTRY_ABI,
      functionName: "setApprovalForAll",
      args: [marketplaceAddr, true],
    });
  };

  const onList = () => {
    if (!priceWei) return;
    setActiveStep("list");
    const expiry = BigInt(Math.floor(Date.now() / 1000) + days * 86400);
    writeContract({
      address: marketplaceAddr,
      abi: MARKETPLACE_ABI,
      functionName: "createListing",
      args: [tokenId, priceWei, expiry, featured],
      value: featureFee,
    });
  };

  const onCancel = () => {
    setActiveStep("cancel");
    writeContract({
      address: marketplaceAddr,
      abi: MARKETPLACE_ABI,
      functionName: "cancelListing",
      args: [tokenId],
    });
  };

  const isListed = !!currentListing?.active;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0f17] p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ins-gradient text-lg font-black text-black">
            {label[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40">
              {isListed ? "Manage listing" : "List for sale"}
            </div>
            <h2 className="text-xl font-bold">
              <span className="ins-gradient-text">{label}</span>
              <span className="text-white/30">{tldSuffix(tld)}</span>
            </h2>
          </div>
        </div>

        {isListed ? (
          <CurrentListingView
            listing={currentListing!}
            busy={busy}
            onCancel={onCancel}
            confirming={activeStep === "cancel" && busy}
            txError={txError?.message ?? null}
            onDismissError={reset}
          />
        ) : (
          <>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  Price (iKAS)
                </label>
                <input
                  inputMode="decimal"
                  value={priceStr}
                  onChange={(e) => {
                    // Allow digits and at most one decimal point.
                    const cleaned = e.target.value.replace(/[^\d.]/g, "");
                    const firstDot = cleaned.indexOf(".");
                    const dedotted =
                      firstDot === -1
                        ? cleaned
                        : cleaned.slice(0, firstDot + 1) +
                          cleaned.slice(firstDot + 1).replace(/\./g, "");
                    setPriceStr(dedotted);
                  }}
                  placeholder="50"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-lg font-bold focus:border-cyan/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  Duration
                </label>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.days}
                      onClick={() => setDays(d.days)}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                        days === d.days
                          ? "border-cyan/50 bg-cyan/10 text-cyan"
                          : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-cyan/30">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-cyan"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                    <Star className="h-3.5 w-3.5 fill-cyan text-cyan" /> Featured listing
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/60">
                    Pays {Number(featureFeeBps ?? 100) / 100}% upfront ({formatEther(featureFee)} iKAS) to promote this
                    listing to the Featured section on /marketplace. Non-refundable.
                  </p>
                </div>
              </label>
            </div>

            <FeeBreakdown
              priceWei={priceWei}
              saleFee={saleFee}
              youReceive={youReceive}
              featureFee={featureFee}
              saleFeeBps={Number(saleFeeBps ?? 200)}
              featured={featured}
            />

            {mktPaused ? (
              <div className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-center text-xs text-amber-300">
                Marketplace is paused by admin — new listings are temporarily disabled. Existing listings can still be cancelled.
              </div>
            ) : null}
            <div className="mt-6">
              {!isApproved ? (
                <>
                  <button
                    onClick={onApprove}
                    disabled={busy || Boolean(mktPaused)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ins-gradient px-4 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
                  >
                    {activeStep === "approve" && busy ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Approving…</>
                    ) : (
                      <>Step 1 of 2 · Approve marketplace</>
                    )}
                  </button>
                  <p className="mt-2 text-center text-[10px] text-white/50">
                    One-time approval per wallet. Unlocks all your names for trustless listing.
                  </p>
                </>
              ) : (
                <button
                  onClick={onList}
                  disabled={
                    busy ||
                    priceWei === null ||
                    Boolean(mktPaused) ||
                    (featured && feeLoading)
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ins-gradient px-4 py-3 text-sm font-black text-black transition hover:brightness-110 disabled:opacity-50"
                >
                  {activeStep === "list" && busy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Listing…</>
                  ) : activeStep === "list" && confirmed ? (
                    <><Check className="h-4 w-4" /> Listed</>
                  ) : featured && feeLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading featured fee…</>
                  ) : (
                    <>
                      {featured ? (
                        <><Star className="h-4 w-4 fill-black text-black" /> List for {priceStr || "0"} iKAS + {formatEther(featureFee)} featured fee</>
                      ) : (
                        <><Tag className="h-4 w-4" /> List for {priceStr || "0"} iKAS</>
                      )}
                    </>
                  )}
                </button>
              )}
              {txError && (
                <button
                  onClick={() => { reset(); setActiveStep(null); }}
                  className="mt-2 flex w-full items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-left text-[10px] text-red-300 hover:bg-red-500/10"
                >
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-none" />
                  <span className="break-all">
                    {txError.message.split("\n")[0] || "Tx failed"} — dismiss
                  </span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CurrentListingView({
  listing, busy, onCancel, confirming, txError, onDismissError,
}: {
  listing: Listing;
  busy: boolean;
  onCancel: () => void;
  confirming: boolean;
  txError: string | null;
  onDismissError: () => void;
}) {
  const now = Math.floor(Date.now() / 1000);
  const secondsLeft = Number(listing.expiry) - now;
  const days = Math.max(0, Math.floor(secondsLeft / 86400));
  const hours = Math.max(0, Math.floor((secondsLeft % 86400) / 3600));

  return (
    <div className="mt-6">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <Row k="Price" v={<><span className="text-2xl font-black">{formatEther(listing.price)}</span>{" "}<span className="text-sm text-white/60">iKAS</span></>} />
        <Row k="Featured" v={listing.featured ? <span className="inline-flex items-center gap-1 rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan"><Star className="h-3 w-3 fill-cyan" /> Yes</span> : <span className="text-white/50">No</span>} />
        <Row k="Ends in" v={`${days}d ${hours}h`} />
      </div>

      <button
        onClick={onCancel}
        disabled={busy}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
      >
        {confirming ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling…</>
        ) : (
          <><X className="h-4 w-4" /> Cancel listing</>
        )}
      </button>
      {txError && (
        <button
          onClick={onDismissError}
          className="mt-2 block w-full text-left text-[10px] text-red-300 hover:text-red-200"
        >
          {txError.split("\n")[0] || "Tx failed"} — dismiss
        </button>
      )}
    </div>
  );
}

function FeeBreakdown({
  priceWei, saleFee, youReceive, featureFee, saleFeeBps, featured,
}: {
  priceWei: bigint | null;
  saleFee: bigint;
  youReceive: bigint;
  featureFee: bigint;
  saleFeeBps: number;
  featured: boolean;
}) {
  if (priceWei === null) return null;
  return (
    <div className="mt-5 space-y-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs">
      <Row k="List price"                                        v={<>{formatEther(priceWei)} iKAS</>} />
      <Row k={`Seller fee (${saleFeeBps / 100}% at sale)`}         v={<>−{formatEther(saleFee)} iKAS</>} />
      {featured && (
        <Row k="Featured upfront fee" v={<>−{formatEther(featureFee)} iKAS</>} />
      )}
      <div className="mt-1 h-px bg-white/10" />
      <Row strong k="You receive on sale" v={<>{formatEther(youReceive)} iKAS</>} />
    </div>
  );
}

function Row({ k, v, strong = false }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${strong ? "text-white" : "text-white/70"}`}>
      <span className="text-[11px] uppercase tracking-wider text-white/40">{k}</span>
      <span className={`text-right ${strong ? "font-black" : "font-semibold"}`}>{v}</span>
    </div>
  );
}
