import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
  // Disable server-side rendering for wagmi/rainbowkit
  experimental: {
    optimizePackageImports: ['@rainbow-me/rainbowkit', 'wagmi', 'viem'],
  },
};

export default nextConfig;
