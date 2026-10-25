import type { NextConfig } from "next";

// Validates the public env vars; throws (and fails dev/build) if any are missing.
import "./lib/config";
import { relayRewrites } from "./lib/relay";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Dev only: lets phones on the local network load the dev server.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  // PostHog's endpoints end in a slash (/e/, /flags/). Without this, each one
  // would get a 308 to the slashless URL first.
  skipTrailingSlashRedirect: true,
  // Analytics through our own origin, so ad blockers don't drop it (lib/relay).
  async rewrites() {
    return relayRewrites;
  },
  // The landing art's file names carry a content hash (scripts/landing-art.mjs),
  // so a changed image gets a new URL and the old one can be cached for good.
  async headers() {
    return [
      {
        source: "/landing/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
