import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // НЕ используем output: "standalone" — он ломает сборку на Vercel
  // (генерирует .next/standalone/, из-за чего Vercel не находит .next/next-server.js.nft.json).
  // Vercel сам управляет standalone-сборкой через свою инфраструктуру.

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
