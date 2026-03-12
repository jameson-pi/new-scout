import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.137.1", "192.168.1.*", "10.*.*.*", "172.*.*.*"],
};

export default nextConfig;
