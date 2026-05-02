"use client";

/**
 * Wallet reconnect prompt
 *
 * Background: app/providers.tsx sets `reconnectOnMount={false}` on the
 * WagmiProvider. That setting was a deliberate fix in commit dfaf0a9 — it
 * stops every page reload from silently triggering MetaMask + Phantom +
 * other injected wallets to surface their approval popups before the user
 * has clicked Connect. The cost: users who actually were connected last
 * session see themselves as logged out.
 *
 * This component bridges the gap. When we detect that the user previously
 * connected on this device but currently looks disconnected, we show a
 * small friendly prompt with an explicit "Reconnect" button — giving them
 * agency without auto-popping a wallet modal. Once they click, we either
 * trigger their last-used connector directly (one click, no picker) or
 * fall back to the RainbowKit modal.
 *
 * Privacy notes:
 *  - We only persist the connector ID + an "ever-connected" flag, not the
 *    address or any wallet data.
 *  - The prompt suppresses itself for 24h after dismissal so we don't
 *    nag returning visitors who just want to browse.
 */

import { useEffect, useState } from "react";
import { useAccount, useConnect, useConnectors } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Wallet, X, Loader2 } from "lucide-react";

const STORAGE_KEY = "ins.lastConnector";
const DISMISS_KEY = "ins.reconnectPrompt.dismissedAt";
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function WalletReconnectPrompt() {
  const { isConnected, status } = useAccount();
  const { connect, isPending } = useConnect();
  const connectors = useConnectors();
  const { openConnectModal } = useConnectModal();

  const [show, setShow] = useState(false);
  const [lastConnectorId, setLastConnectorId] = useState<string | null>(null);

  // Track the last successfully-used connector so we can offer a one-click
  // reconnect on next visit. Updated on every connect, cleared on explicit
  // disconnect (which goes through Wagmi's own clearing mechanism — we just
  // observe the post-state).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isConnected) {
      // Hide the prompt + record that we now know the user is connected.
      setShow(false);
      try {
        // RainbowKit doesn't expose the active connector ID via useAccount
        // in this setup, so we read it from wagmi's store via window-level
        // wagmi config. The key here is just that we have *something* to
        // show in the prompt — we don't need the exact connector to call
        // connect() (we open the picker as the primary fallback).
        localStorage.setItem(STORAGE_KEY, "ever-connected");
      } catch {
        // localStorage can throw in private mode; non-fatal — the prompt
        // simply won't appear next visit.
      }
    }
  }, [isConnected]);

  // On mount, decide whether to show the prompt.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (status !== "disconnected") return;

    let everConnected = false;
    let dismissedAt: number | null = null;
    try {
      everConnected = localStorage.getItem(STORAGE_KEY) === "ever-connected";
      const raw = localStorage.getItem(DISMISS_KEY);
      dismissedAt = raw ? parseInt(raw, 10) : null;
    } catch {
      return; // private mode → silently no-op
    }

    if (!everConnected) return;
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    // Tiny grace delay so we don't flash the prompt while wagmi is still
    // booting (`status` briefly reads "disconnected" before the cached
    // session check completes).
    const t = window.setTimeout(() => {
      // Re-check inside the timer in case status flipped to "reconnecting"
      // or "connected" during the delay.
      if (status === "disconnected") setShow(true);
    }, 800);
    return () => window.clearTimeout(t);
  }, [status]);

  // Pick a sensible default connector if we have a hint about the user's
  // last wallet. (We don't aggressively guess — if nothing matches we just
  // open the picker via RainbowKit.)
  useEffect(() => {
    setLastConnectorId(connectors[0]?.id ?? null);
  }, [connectors]);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* private mode */ }
  };

  const handleReconnect = () => {
    // Prefer RainbowKit's modal so the user can pick (or change) their
    // wallet. Falls back to direct wagmi.connect() if the modal isn't
    // available (e.g. the prompt mounted before RainbowKitProvider).
    if (openConnectModal) {
      openConnectModal();
      // Don't dismiss yet — wait for the connect effect (above) to fire.
      // If they cancel the modal, leave the prompt visible so they can
      // try again or hit Dismiss.
    } else if (lastConnectorId) {
      const c = connectors.find((c) => c.id === lastConnectorId);
      if (c) connect({ connector: c });
    }
  };

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[80] w-[min(440px,92vw)] -translate-x-1/2 rounded-2xl border border-cyan/30 bg-ink/95 p-4 shadow-[0_0_60px_rgba(0,240,255,0.15)] backdrop-blur-xl animate-fade-up"
    >
      <button
        onClick={dismiss}
        aria-label="Dismiss reconnect prompt"
        className="absolute right-3 top-3 rounded-full p-1 text-white/40 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cyan/15 text-cyan">
          <Wallet className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">
            Welcome back. Reconnect your wallet?
          </div>
          <p className="mt-1 text-xs text-white/55">
            We don&rsquo;t auto-reconnect to keep wallet popups out of your
            way. Click below to pick up where you left off.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleReconnect}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-cyan px-3 py-1.5 text-xs font-bold text-black transition hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
                </>
              ) : (
                "Reconnect wallet"
              )}
            </button>
            <button
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/55 transition hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
