import type { NextConfig } from "next";

// Validates the public env vars; throws (and fails dev/build) if any are missing.
import "./lib/config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: lets phones on the local network load the dev server.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  // Keeps the indicator clear of the Dev panel bar.
  devIndicators: { position: "bottom-right" },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      // Temporary until the landing page ships at /. Query strings (UTMs) carry over.
      { source: "/", destination: "/apply", permanent: false },
    ];
  },
};

export default nextConfig;
