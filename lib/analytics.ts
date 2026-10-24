/**
 * The one place that talks to PostHog (funnel) and Linkrunner (conversions).
 *
 * Both SDKs are loaded with `import()` only when NEXT_PUBLIC_ANALYTICS_ENABLED
 * is true, so with it off (local, Preview) no SDK code is fetched and nothing
 * is sent: every function here is a no-op. Calls made before the SDKs finish
 * loading are queued and replayed in order. Analytics never throws into the UI.
 */
import type { Linkrunner } from "@linkrunner/web";
import type { CaptureOptions, PostHog, Properties } from "posthog-js";
import { config } from "./config";

type Sdks = { posthog: PostHog; lr: Linkrunner };

let loading: Promise<Sdks> | null = null;
let ready: Sdks | null = null;

function load(): Promise<Sdks> | null {
  const { analytics } = config;
  if (!analytics.enabled || typeof window === "undefined") return null;
  loading ??= Promise.all([import("posthog-js"), import("@linkrunner/web")]).then(
    ([{ default: posthog }, { lr }]) => {
      posthog.init(analytics.posthogKey, {
        api_host: analytics.posthogHost,
        // Steps are client state, not pages; ff_step_viewed covers them.
        capture_pageview: false,
        persistence: "localStorage+cookie",
        // Button labels carry kids' names ("That's Meera!"), so no automatic
        // click capture. The funnel events are all explicit.
        autocapture: false,
        rageclick: false,
        capture_dead_clicks: false,
        // Only applies if replay is switched on in the PostHog project.
        session_recording: { maskAllInputs: true },
      });
      ready = { posthog, lr };
      return ready;
    },
  );
  return loading;
}

function run(fn: (sdks: Sdks) => void) {
  const safe = (sdks: Sdks) => {
    try {
      fn(sdks);
    } catch (error) {
      console.warn("Analytics call failed", error);
    }
  };
  // Synchronous once loaded, so a capture just before a same-tab navigation is queued in time.
  if (ready) return safe(ready);
  load()?.then(safe, (error) => console.warn("Analytics failed to load", error));
}

/** Starts loading the SDKs. Called once from the root layout; safe to call again. */
export function initAnalytics() {
  run(() => {});
}

export function capture(event: string, properties: Properties, options?: CaptureOptions) {
  run(({ posthog }) => posthog.capture(event, properties, options));
}

/** Super properties: added to every later PostHog event, and kept across visits. */
export function registerSuperProperties(properties: Properties) {
  run(({ posthog }) => posthog.register(properties));
}

/** A Linkrunner conversion event (mapped to ad-network conversions in its dashboard). */
export function trackConversion(event: string, data?: Record<string, unknown>) {
  run(({ lr }) => lr.track(event, data));
}

/**
 * Ties both tools to the submitted application: PostHog merges the anonymous
 * visitor into `applicationId`, and Linkrunner records the signup.
 */
export function identifyApplicant(applicationId: string, email: string) {
  run(({ posthog, lr }) => {
    posthog.identify(applicationId, { email });
    lr.identify(applicationId);
    lr.track("signup", { email });
  });
}

/** PostHog's current (anonymous until identify) distinct ID, once loaded. */
export function distinctId(): string | undefined {
  try {
    return ready?.posthog.get_distinct_id() || undefined;
  } catch {
    return undefined;
  }
}
