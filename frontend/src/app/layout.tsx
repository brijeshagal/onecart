import type { Metadata } from "next";
import "./globals.css";
import MiniAppKitWrapper from "./MiniAppKitWrapper";
import WalletWrapper from "./WalletWrapper";
import { AppInitializer } from "@/components/AppInitializer";

export const metadata: Metadata = {
  title: "OneCart - Smart Shopping Assistant",
  description:
    "AI-powered shopping assistant that helps you find and order products from multiple stores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for Farcaster auth performance */}
        <link rel="preconnect" href="https://auth.farcaster.xyz" />
      </head>
      <body className="font-sans antialiased">
        <MiniAppKitWrapper>
          <WalletWrapper>
            <AppInitializer>{children}</AppInitializer>
          </WalletWrapper>
        </MiniAppKitWrapper>
      </body>
    </html>
  );
}
