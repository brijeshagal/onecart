"use client";

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseSepolia } from "viem/chains";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

const wagmiConfig = getDefaultConfig({
  appName: "OneCart",
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID || "",
  chains: [baseSepolia],
});

export default function WalletWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
