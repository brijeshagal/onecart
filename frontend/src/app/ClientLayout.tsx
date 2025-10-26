"use client";

import { AppInitializer } from "@/components/AppInitializer";
import { AuthKitProvider } from "@farcaster/auth-kit";
import { getFarcasterConfig } from "@/lib/farcaster-config";
import dynamic from "next/dynamic";

// Import WalletWrapper with SSR disabled to prevent indexedDB errors during build
const WalletWrapper = dynamic(() => import("./WalletWrapper"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-white" />,
});
export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletWrapper>
      <AuthKitProvider config={getFarcasterConfig()}>
        <AppInitializer>{children}</AppInitializer>
      </AuthKitProvider>
    </WalletWrapper>
  );
}
