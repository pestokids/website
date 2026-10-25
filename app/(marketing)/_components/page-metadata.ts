import type { Metadata } from "next";
import { meta } from "@/content/landing";
import { shareCard } from "./share-card";

/**
 * Title, description, canonical URL and link-preview tags for an indexed
 * page. Every page shares the felt share card. Next merges `openGraph`
 * shallowly, so each page sets it in full here rather than inheriting it.
 */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const image = { ...shareCard, alt: meta.shareAlt };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, siteName: meta.siteName, title, description, images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
