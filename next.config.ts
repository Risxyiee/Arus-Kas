import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Cloudflare Pages compatibility */
  output: "export",
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
