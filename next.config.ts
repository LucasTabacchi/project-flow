import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["date-fns", "lucide-react"],
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
