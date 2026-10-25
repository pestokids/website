import type { MetadataRoute } from "next";
import { absoluteUrl, PRIVATE_ROUTES } from "@/lib/site";

/**
 * AI crawlers named outright, so the answer to "may we read this?" is a clear
 * yes for each. A crawler that matches its own group ignores `*`, so every
 * group repeats the same rules.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "Google-Extended",
];

/** Everything is open except the private routes (/apply). */
export default function robots(): MetadataRoute.Robots {
  const rules = { allow: "/", disallow: [...PRIVATE_ROUTES] };
  return {
    rules: [
      { userAgent: "*", ...rules },
      { userAgent: AI_CRAWLERS, ...rules },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
