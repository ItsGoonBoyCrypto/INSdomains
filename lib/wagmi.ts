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
import { igra } from "./igra-chain";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

/**
 * Kaspa-native wallets (Kasware, Kastle) inject their EVM provider under a
 * custom namespace rather than only taking over `window.ethereum`, so we
 * can target them explicitly and keep the user's MetaMask/Rabby intact.
 *   - Kasware: window.kasware.ethereum   (docs.kasware.xyz/.../evm)
 *   - Kastle : window.kastle.ethereum    (docs.kastle.cc)
 * Falls back to the root namespace object if `.ethereum` isn't exposed
 * in an older build.
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

function injectedFrom(
  id: string,
  name: string,
  paths: string[]
): (details: WalletDetailsParams) => ReturnType<typeof createConnector> {
  return (walletDetails) =>
    createConnector((config) => {
      const base = injected({
        target: () => {
          const provider = resolveProvider(paths);
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
  installed: hasProvider(["kastle.ethereum", "kastle"]),
  downloadUrls: {
    browserExtension: "https://kastle.cc",
  },
  createConnector: injectedFrom("kastle", "Kastle", ["kastle.ethereum", "kastle"]),
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
        injectedWallet,
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
