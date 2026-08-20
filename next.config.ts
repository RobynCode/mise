import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Imported recipes reference images on their source sites.
    remotePatterns: [{ protocol: "https", hostname: "**" }, { protocol: "http", hostname: "**" }],
  },
};

export default nextConfig;
