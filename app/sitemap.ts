import type { MetadataRoute } from "next";
import { absoluteUrl, INDEXED_ROUTES } from "@/lib/site";

/** The indexed routes. /apply is left out: it's noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_ROUTES.map((route) => ({ url: absoluteUrl(route) }));
}
