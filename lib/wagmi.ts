"use client";

import {
  connectorsForWallets,
  type Wallet,
  type WalletDetailsParams,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  rabbyWallet,
  walletConnectWallet,
  coinbaseWallet,
  injectedWallet,
  rainbowWallet,
  trustWallet,
  okxWallet,
  braveWallet,
  safeWallet,
  ledgerWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http, createConnector } from "wagmi";
import { injected } from "wagmi/connectors";
import { createStore as createMipdStore } from "mipd";
import { igra } from "./igra-chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

/**
 * Kaspa-native wallets inject their EVM provider under a custom namespace
 * rather than only taking over `window.ethereum`, so we can target them
 * explicitly and keep the user's MetaMask/Rabby intact.
 *   - Kasware : window.kasware.ethereum   (docs.kasware.xyz/.../evm)
 *   - Kastle  : window.kastle.ethereum    (docs.kastle.cc)
 *   - Kasperia: window.kasperia.ethereum  (2026-07-08, Kasperia dev DM'd Liam
 *               that clicking Connect didn't surface their wallet — root cause
 *               was that we didn't have a connector for them at all)
 *   - Kurncy  : window.kurncy.ethereum    (added same batch; docs coming)
 * Each falls back to the root namespace object AND to `.provider` in case a
 * build ships either shape.
 */
function resolveProvider(paths: string[]): unknown {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as Record<string, unknown>;
  for (const path of paths) {
    const found = path.split(".").reduce<unknown>(
      (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
      w
    );
    if (found !== undefined) return found;
  }
  return undefined;
}

function hasProvider(paths: string[]): boolean {
  return resolveProvider(paths) !== undefined;
}

/**
 * Persistent module-level EIP-6963 store. CRITICAL bug fix from the
 * 2026-07-14 Kasperia dev report: previously we called createMipdStore()
 * inside every eip6963Provider() lookup, which returned a fresh empty
 * store synchronously — and since EIP-6963 announcements arrive
 * ASYNCHRONOUSLY in response to the initial requestProvider event,
 * the store literally never had any providers to return. That's why
 * clicking Connect for Kasperia did nothing — target() kept returning
 * undefined, so wagmi's injected connector had no provider to hand off.
 *
 * The fix: create the store ONCE at module load (client-only), let it
 * accumulate announcements over the app's whole lifetime, and query
 * it at connect time. By the time a user clicks Connect, all announces
 * that were going to fire have already fired.
 */
let mipdStoreSingleton: ReturnType<typeof createMipdStore> | null = null;
function getMipdStore(): ReturnType<typeof createMipdStore> | null {
  if (typeof window === "undefined") return null;
  if (!mipdStoreSingleton) {
    try {
      mipdStoreSingleton = createMipdStore();
    } catch {
      return null;
    }
  }
  return mipdStoreSingleton;
}

/**
 * Look up an EIP-6963 announced provider by matching against its rdns
 * or announced name. Loose substring matching — a wallet might announce
 * as `com.kasperia.wallet` OR `io.kasperia` OR plain `kasperia`; needle
 * on `kasperia` catches all three.
 *
 * Dev-mode: logs the full announced provider list on the first call
 * so we can see EXACTLY what the wallet announces (rdns/name/uuid) if
 * matching needs to be tightened.
 */
let eip6963LoggedInDev = false;
function eip6963Provider(matchers: string[]): unknown {
  const store = getMipdStore();
  if (!store) return undefined;
  const providers = store.getProviders();
  if (process.env.NODE_ENV === "development" && !eip6963LoggedInDev && providers.length > 0) {
    eip6963LoggedInDev = true;
    // eslint-disable-next-line no-console
    console.info(
      "[EIP-6963] announced providers:",
      providers.map((p) => ({ rdns: p.info?.rdns, name: p.info?.name, uuid: p.info?.uuid })),
    );
  }
  const needles = matchers.map((m) => m.toLowerCase());
  for (const p of providers) {
    const rdns = (p.info?.rdns || "").toLowerCase();
    const name = (p.info?.name || "").toLowerCase();
    if (needles.some((n) => rdns.includes(n) || name.includes(n))) {
      return p.provider;
    }
  }
  return undefined;
}

/**
 * Build a RainbowKit connector that resolves its provider by trying
 * EIP-6963 discovery FIRST (spec-compliant wallets), falling back to
 * hard-coded window namespaces for wallets that inject the older way.
 */
function injectedFrom(
  id: string,
  name: string,
  paths: string[],
  eip6963Matchers: string[] = []
): (details: WalletDetailsParams) => ReturnType<typeof createConnector> {
  return (walletDetails) =>
    createConnector((config) => {
      const base = injected({
        target: () => {
          // Prefer EIP-6963 — this is what modern spec-compliant wallets
          // (Kasperia confirmed 2026-07-14) announce themselves through.
          const eipProvider = eip6963Matchers.length
            ? eip6963Provider(eip6963Matchers)
            : undefined;
          const provider = eipProvider ?? resolveProvider(paths);
          if (!provider) return undefined;
          // Wagmi's Target#provider type is strict (EIP1193-shape); we have
          // already narrowed to "has a request function" via resolveProvider,
          // so the cast here is load-bearing, not unsafe.
          return { id, name, provider: provider as never };
        },
        shimDisconnect: true,
      })(config);
      return { ...base, ...walletDetails };
    });
}


const kaswareWallet = (): Wallet => ({
  id: "kasware",
  name: "KasWare",
  iconUrl: "/wallet-icons/kasware.svg",
  iconBackground: "#70C7BA",
  installed: hasProvider(["kasware.ethereum", "kasware"]),
  downloadUrls: {
    browserExtension: "https://www.kasware.xyz",
    chrome:
      "https://chromewebstore.google.com/detail/kasware-wallet/hklhheigdmpoolooomdihmhlpjjdbklf",
  },
  createConnector: injectedFrom("kasware", "KasWare", ["kasware.ethereum", "kasware"]),
});

const kastleWallet = (): Wallet => ({
  id: "kastle",
  name: "Kastle",
  iconUrl: "/wallet-icons/kastle.png",
  iconBackground: "#ffffff",
  installed: hasProvider(["kastle.ethereum", "kastle.provider", "kastle"]),
  downloadUrls: {
    browserExtension: "https://kastle.cc",
  },
  createConnector: injectedFrom("kastle", "Kastle", [
    "kastle.ethereum",
    "kastle.provider",
    "kastle",
  ]),
});

// Kasperia dev confirmed 2026-07-14: their wallet is discovered via
// EIP-6963 (spec-compliant), no hardcoded window namespace needed. We
// still keep the window fallbacks in case a future/older build ships
// the injected-namespace shape instead.
//
// `installed: undefined` (rather than the hasAnyProvider check) means
// RainbowKit ALWAYS shows the wallet as connectable — no "Get Kasperia"
// download page even if we can't detect it at initial page render. If
// the provider truly isn't available, connect() fails at click time
// (worst case: user sees an error toast) which is better UX than
// making the wallet look uninstallable to someone who literally has
// it running. Detection was proving unreliable across page-load timing.
const kasperiaWallet = (): Wallet => ({
  id: "kasperia",
  name: "Kasperia",
  iconUrl: "/wallet-icons/kasperia.jpg",
  iconBackground: "#0a1929",
  installed: undefined,
  downloadUrls: {
    browserExtension: "https://kasperia.com",
  },
  createConnector: injectedFrom(
    "kasperia",
    "Kasperia",
    ["kasperia.ethereum", "kasperia.provider", "kasperia"],
    ["kasperia"],
  ),
});

const kurncyWallet = (): Wallet => ({
  id: "kurncy",
  name: "Kurncy",
  iconUrl: "/wallet-icons/kurncy.jpg",
  iconBackground: "#0a1142",
  installed: undefined,
  downloadUrls: {
    browserExtension: "https://kurncy.com",
  },
  createConnector: injectedFrom(
    "kurncy",
    "Kurncy",
    ["kurncy.ethereum", "kurncy.provider", "kurncy"],
    ["kurncy"],
  ),
});

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [
        metaMaskWallet,
        rabbyWallet,
        kaswareWallet,
        kastleWallet,
        kasperiaWallet,
        kurncyWallet,
        walletConnectWallet,
      ],
    },
    {
      groupName: "More",
      wallets: [
        rainbowWallet,
        coinbaseWallet,
        trustWallet,
        okxWallet,
        braveWallet,
        phantomWallet,
        safeWallet,
        ledgerWallet,
        injectedWallet, // EIP-6963 catch-all — any wallet that self-announces
                        // shows up here even if we don't have a named connector.
      ],
    },
  ],
  {
    appName: "Igra Name Service",
    projectId: projectId || "ins-dev",
  }
);

export const wagmiConfig = createConfig({
  connectors,
  chains: [igra],
  transports: { [igra.id]: http() },
  ssr: true,
});
