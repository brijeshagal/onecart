"use client";

import { AppInitializer } from "@/components/AppInitializer";
import { MiniAppProvider } from "@neynar/react";
// import { AuthKitProvider } from "@farcaster/auth-kit";
import dynamic from "next/dynamic";

// Import WalletWrapper with SSR disabled to prevent indexedDB errors during build
const WalletWrapper = dynamic(() => import("./WalletWrapper"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-white" />,
});

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletWrapper>
      {/* <AuthKitProvider
        config={{
          relay: "https://relay.farcaster.xyz",
          domain: "onecart.app",
          siweUri: "https://onecart.app/register",
          rpcUrl: "https://mainnet.optimism.io",
        }}
      > */}
        <MiniAppProvider>
          <AppInitializer>{children}</AppInitializer>
        </MiniAppProvider>
      {/* </AuthKitProvider> */}
    </WalletWrapper>
  );
}
