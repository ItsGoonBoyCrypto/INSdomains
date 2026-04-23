import { defineChain } from "viem";

export const igra = defineChain({
  id: Number(process.env.NEXT_PUBLIC_IGRA_CHAIN_ID ?? 38833),
  name: "Igra",
  nativeCurrency: { name: "iKAS", symbol: "iKAS", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_IGRA_RPC ?? "https://rpc.igralabs.com:8545"],
    },
  },
  blockExplorers: {
    default: {
      name: "Igra Explorer",
      url: process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com",
    },
  },
  testnet: false,
});

export const IGRA_EXPLORER =
  process.env.NEXT_PUBLIC_IGRA_EXPLORER ?? "https://explorer.igralabs.com";

export const explorerTx = (hash: string) => `${IGRA_EXPLORER}/tx/${hash}`;
export const explorerAddr = (addr: string) => `${IGRA_EXPLORER}/address/${addr}`;
