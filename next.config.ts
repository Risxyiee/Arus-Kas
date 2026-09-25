import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Static export for landing page — API routes handled by CF Worker */
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
