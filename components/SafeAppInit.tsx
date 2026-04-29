"use client";

/**
 * Initializes the Safe Apps SDK early so Safe (the multisig wallet) can
 * handshake with the iframe when adding insdomains.org as a custom Safe App.
 *
 * Without this, Safe shows: 'this app doesn't support Safe App functionality'
 * because RainbowKit only loads the Safe connector lazily on wallet-button
 * click — too late for Safe's iframe-load handshake.
 *
 * Just instantiating SafeAppsSDK() registers postMessage listeners that
 * respond to Safe's getSafeInfo / getEnvironmentInfo probes.
 */
import { useEffect } from "react";

export function SafeAppInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.parent === window) return; // not in an iframe

    (async () => {
      try {
        const SafeAppsSDK = (await import("@safe-global/safe-apps-sdk")).default;
        const sdk = new SafeAppsSDK();
        // Touch getInfo() to trigger handshake (resolves only inside Safe).
        const info = await sdk.safe.getInfo();
        // eslint-disable-next-line no-console
        console.log("[Safe App] connected inside Safe:", info.safeAddress, "chain", info.chainId);
      } catch {
        /* Not running inside Safe — silent no-op. */
      }
    })();
  }, []);

  return null;
}
