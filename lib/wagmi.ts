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
 * Look up an EIP-6963 announced provider by matching against its rdns
 * or announced name. Wallets that follow the spec (per Kasperia dev's
 * confirmation, 2026-07-14) announce a `EIP6963ProviderDetail` including
 * `info.rdns` (reverse-DNS identifier) + `info.name` + `info.icon` + a
 * `provider` handle. `mipd` (Multi Injected Provider Discovery) ships
 * with wagmi and gives us the whole set without hand-writing the DOM
 * event dance.
 *
 * We return the first provider whose rdns OR name loosely matches any
 * substring in `matchers` (case-insensitive). Loose matching is
 * deliberate — a wallet might announce as `com.kasperia.wallet` OR
 * `io.kasperia` OR plain `kasperia`; substring on `kasperia` catches
 * all three.
 */
function eip6963Provider(matchers: string[]): unknown {
  if (typeof window === "undefined") return undefined;
  try {
    const store = createMipdStore();
    const providers = store.getProviders();
    const needles = matchers.map((m) => m.toLowerCase());
    for (const p of providers) {
      const rdns = (p.info?.rdns || "").toLowerCase();
      const name = (p.info?.name || "").toLowerCase();
      if (needles.some((n) => rdns.includes(n) || name.includes(n))) {
        return p.provider;
      }
    }
  } catch {
    // mipd throws on old browsers / SSR — swallow, fall through to
    // window-namespace fallback in the caller.
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

function hasAnyProvider(paths: string[], eip6963Matchers: string[] = []): boolean {
  if (eip6963Matchers.length && eip6963Provider(eip6963Matchers)) return true;
  return hasProvider(paths);
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
const kasperiaWallet = (): Wallet => ({
  id: "kasperia",
  name: "Kasperia",
  iconUrl: "/wallet-icons/kasperia.jpg",
  iconBackground: "#0a1929",
  installed: hasAnyProvider(
    ["kasperia.ethereum", "kasperia.provider", "kasperia"],
    ["kasperia"],
  ),
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
  installed: hasAnyProvider(
    ["kurncy.ethereum", "kurncy.provider", "kurncy"],
    ["kurncy"],
  ),
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
