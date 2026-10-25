/**
 * The landing page events (PostHog, landing spec §7). Vendor calls go
 * through lib/analytics, which is a no-op unless analytics is enabled.
 *
 * landing_viewed and landing_cta_clicked carry this visit's source: the
 * referrer, UTMs, click IDs, `via`, and its sourceType / source / campaign
 * (lib/attribution). `via` is also a super property, so it's on every event.
 */
import type { HeaderLink } from "@/content/landing";
import { capture } from "@/lib/analytics";
import { ATTRIBUTION_PARAMS, classifyAttribution, readAttribution } from "@/lib/attribution";

export const SEEN_KEY = "pesto_landing_seen_v1";

export type Layout = "tall" | "wide";
export type ScreenBucket = "phone" | "tablet" | "laptop" | "desktop";
/** Where the button was: the hero today; the wide-screen header may get one later. */
export type CtaLocation = "hero";

export type View = {
  landingUrl: string;
  referrer: string;
  /** Whether the tall layout's media query matches. */
  tall: boolean;
  /** Window size in CSS pixels. */
  width: number;
  height: number;
  returning: boolean;
};

/**
 * Rough device class from the window size, either way up: phones by their
 * short side, then tablets, laptops and big screens by their long side.
 */
export function screenBucket(width: number, height: number): ScreenBucket {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  if (short < 600) return "phone";
  if (long < 1280) return "tablet";
  if (long < 1920) return "laptop";
  return "desktop";
}

/** This visit's source, as event properties. Params that aren't there are left out. */
export function visitProps(landingUrl: string, referrer: string) {
  const attribution = readAttribution(landingUrl, referrer);
  const { sourceType, source, campaign } = classifyAttribution(attribution);
  const params = Object.fromEntries(
    ATTRIBUTION_PARAMS.flatMap((key) => (attribution[key] ? [[key, attribution[key]]] : [])),
  );
  return { sourceType, source, campaign, referrer: attribution.referrer ?? null, ...params };
}

type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether this browser has opened the landing page before, then marks it as
 * seen. Storage failures count as a first visit.
 */
export function markLandingSeen(storage = browserStorage()): boolean {
  try {
    if (storage?.getItem(SEEN_KEY)) return true;
    storage?.setItem(SEEN_KEY, "1");
  } catch {
    // Disabled storage: every visit looks new.
  }
  return false;
}

export const track = {
  viewed(view: View) {
    capture("landing_viewed", {
      layout: (view.tall ? "tall" : "wide") satisfies Layout,
      screen: screenBucket(view.width, view.height),
      returning: view.returning,
      ...visitProps(view.landingUrl, view.referrer),
    });
  },

  /** "Get in early". */
  ctaClicked(location: CtaLocation, landingUrl: string, referrer: string) {
    capture("landing_cta_clicked", { location, ...visitProps(landingUrl, referrer) });
  },

  /** The phone menu button, when it opens the panel. */
  menuOpened() {
    capture("landing_menu_opened", {});
  },

  linkClicked(link: HeaderLink["id"]) {
    capture("landing_link_clicked", { link });
  },
};
