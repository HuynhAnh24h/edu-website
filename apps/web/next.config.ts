import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isStaticExport ? "export" : "standalone",
  trailingSlash: isStaticExport,
  images: {
    unoptimized: isStaticExport,
  },
};

export default nextConfig;
