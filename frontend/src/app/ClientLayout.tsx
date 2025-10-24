"use client";

import { AppInitializer } from "@/components/AppInitializer";
import dynamic from "next/dynamic";

// Import WalletWrapper with SSR disabled to prevent indexedDB errors during build
const WalletWrapper = dynamic(() => import("./WalletWrapper"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-white" />,
});

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletWrapper>
      <AppInitializer>{children}</AppInitializer>
    </WalletWrapper>
  );
}

