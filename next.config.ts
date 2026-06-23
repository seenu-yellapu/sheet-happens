import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "xlsx", "pdfjs-dist"],
};

export default nextConfig;
