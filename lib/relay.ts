/**
 * PostHog and Linkrunner, served from our own origin.
 *
 * Ad blockers drop requests to PostHog's and Linkrunner's domains, so the
 * browser only talks to these paths on pestokids.com, and next.config.ts
 * forwards them. Not PostHog's usual `/ingest`: block lists already have
 * rules aimed at it (EasyPrivacy's `/ingest/*^ip=`). The names mean nothing on
 * purpose: keep them that way, since anything that reads as analytics ends up
 * on a block list.
 */
export const POSTHOG_PATH = "/sprig";
export const LINKRUNNER_SCRIPT_PATH = "/twig/s.js";
export const LINKRUNNER_EVENTS_PATH = "/twig/e";

/** PostHog's app, for links the SDK builds (the toolbar). */
export const POSTHOG_UI_HOST = "https://us.posthog.com";

export const relayRewrites = [
  // PostHog's lazy-loaded code (web vitals, exception capture) and remote
  // config come from its asset host. Both before the catch-all.
  { source: `${POSTHOG_PATH}/static/:path*`, destination: "https://us-assets.i.posthog.com/static/:path*" },
  { source: `${POSTHOG_PATH}/array/:path*`, destination: "https://us-assets.i.posthog.com/array/:path*" },
  { source: `${POSTHOG_PATH}/:path*`, destination: "https://us.i.posthog.com/:path*" },
  { source: LINKRUNNER_SCRIPT_PATH, destination: "https://cdn.linkrunner.io/web/v1/lr.js" },
  { source: LINKRUNNER_EVENTS_PATH, destination: "https://api.linkrunner.io/web/ingest" },
];
