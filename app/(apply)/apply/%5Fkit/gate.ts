import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * The component kit is for local dev and Preview deployments only. Production
 * (VERCEL_ENV=production, or any production build outside Vercel) gets a 404.
 */
export function assertKitEnabled() {
  const enabled =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!enabled) notFound();
}

export const kitMetadata: Metadata = {
  title: "Component kit",
  robots: { index: false, follow: false },
};
