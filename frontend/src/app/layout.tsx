import type { Metadata } from "next";
import "./globals.css";
import MiniAppKitWrapper from "./MiniAppKitWrapper";
import WalletWrapper from "./WalletWrapper";

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
      <body className="font-sans antialiased">
        <MiniAppKitWrapper>
          <WalletWrapper>{children}</WalletWrapper>
        </MiniAppKitWrapper>
      </body>
    </html>
  );
}
