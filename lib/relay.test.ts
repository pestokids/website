import { describe, expect, it } from "vitest";
import { LINKRUNNER_EVENTS_PATH, LINKRUNNER_SCRIPT_PATH, POSTHOG_PATH, relayRewrites } from "./relay";

/** Where Next.js sends a request path: the first rewrite whose source matches, as Next.js picks it. */
function forward(path: string): string | undefined {
  for (const { source, destination } of relayRewrites) {
    const pattern = new RegExp(`^${source.replace(/[.]/g, "\\.").replace("/:path*", "(?:/(.*))?")}$`);
    const match = pattern.exec(path);
    if (match) return destination.replace(":path*", match[1] ?? "");
  }
}

describe("relay rewrites", () => {
  it("sends PostHog's events and flags to its ingest host", () => {
    expect(forward(`${POSTHOG_PATH}/e/`)).toBe("https://us.i.posthog.com/e/");
    expect(forward(`${POSTHOG_PATH}/i/v0/e/`)).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(forward(`${POSTHOG_PATH}/flags/`)).toBe("https://us.i.posthog.com/flags/");
  });

  it("sends PostHog's lazy-loaded code and remote config to its asset host", () => {
    expect(forward(`${POSTHOG_PATH}/static/web-vitals.js`)).toBe(
      "https://us-assets.i.posthog.com/static/web-vitals.js",
    );
    expect(forward(`${POSTHOG_PATH}/array/phc_test/config.js`)).toBe(
      "https://us-assets.i.posthog.com/array/phc_test/config.js",
    );
  });

  it("serves Linkrunner's script and takes its events", () => {
    expect(forward(LINKRUNNER_SCRIPT_PATH)).toBe("https://cdn.linkrunner.io/web/v1/lr.js");
    expect(forward(LINKRUNNER_EVENTS_PATH)).toBe("https://api.linkrunner.io/web/ingest");
  });

  it("leaves the site's own pages alone", () => {
    for (const path of ["/", "/apply", "/privacy", "/sprigs", "/twig"]) expect(forward(path)).toBeUndefined();
  });

  it("uses paths that don't read as analytics, so block lists don't pick them up", () => {
    for (const path of [POSTHOG_PATH, LINKRUNNER_SCRIPT_PATH, LINKRUNNER_EVENTS_PATH]) {
      expect(path).not.toMatch(/ingest|collect|track|analytic|telemetry|event|posthog|linkrunner|\blr\b/i);
    }
  });
});
