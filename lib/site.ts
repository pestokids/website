/**
 * The site's address and which routes search engines may index. Read by the
 * root metadata, robots.txt, sitemap.xml, /llms.txt and the structured data.
 */

/** Canonical origin. www redirects here (set up on Vercel). */
export const SITE_URL = "https://pestokids.com";

/** In sitemap.xml, in this order. Add /team and /faq when they ship. */
export const INDEXED_ROUTES = ["/", "/privacy", "/terms", "/contact"] as const;

/** `/privacy` → `https://pestokids.com/privacy`, `/` → `https://pestokids.com/`. */
export function absoluteUrl(route: string): string {
  return new URL(route, SITE_URL).href;
}
