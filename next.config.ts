import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  adapterPath: require.resolve("@vercel/next"),
};

export default nextConfig;
