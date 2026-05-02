"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useState } from "react";
import { wagmiConfig } from "@/lib/wagmi";
import { SafeAppInit } from "@/components/SafeAppInit";
import { WalletReconnectPrompt } from "@/components/WalletReconnectPrompt";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {/* Initialises Safe Apps SDK at boot so safe.igralabs.com /
            app.safe.global can register insdomains.org as a custom Safe
            App without their handshake racing React's wallet-button click. */}
        <SafeAppInit />
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00f0ff",
            accentColorForeground: "#0a0a0a",
            borderRadius: "large",
            fontStack: "system",
            overlayBlur: "large",
          })}
          modalSize="compact"
        >
          {children}
          {/* Sits inside RainbowKitProvider so it can call useConnectModal().
              Floats globally; renders nothing unless the user looks like a
              returning visitor whose session has lapsed (we don't auto-
              reconnect — see WalletReconnectPrompt's docblock). */}
          <WalletReconnectPrompt />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
