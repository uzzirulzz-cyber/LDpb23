import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel handles output automatically — standalone mode is for self-hosting only.
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
