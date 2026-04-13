import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.137.1", "192.168.1.*", "10.*.*.*", "172.*.*.*"],
  compress: true,
  images: {
    formats: ['image/webp', 'image/avif'],
    unoptimized: false,
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ['recharts', '@react-pdf/renderer'],
  },
};

export default nextConfig;
