import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* API routes now handled by Next.js — no static export */
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
