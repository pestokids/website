/**
 * The one place that talks to PostHog (funnel) and Linkrunner (conversions).
 *
 * Both SDKs are loaded with `import()` only when NEXT_PUBLIC_ANALYTICS_ENABLED
 * is true, so with it off (local, Preview) no SDK code is fetched and nothing
 * is sent: every function here is a no-op. The same goes for exception
 * capture and web vitals, which are part of the PostHog init.
 *
 * Nothing is fetched until initAnalytics(), which the root layout calls once
 * the page is idle, after first paint. Calls made before the SDKs are ready
 * are queued and replayed in order; a queued event keeps the page and time it
 * happened on. Analytics never throws into the UI.
 */
import type { Linkrunner } from "@linkrunner/web";
import type { CaptureOptions, PostHog, Properties } from "posthog-js";
import { config } from "./config";

type Sdks = { posthog: PostHog; lr: Linkrunner };
type Call = (sdks: Sdks) => void;

let started = false;
let ready: Sdks | null = null;
let queue: Call[] = [];
/** `via` on the URL the visitor arrived with, read before any client-side navigation. */
let entryVia: string | null | undefined;

function active() {
  return config.analytics.enabled && typeof window !== "undefined";
}

function readEntry() {
  entryVia ??= new URLSearchParams(window.location.search).get("via")?.trim() || null;
}

function safe(fn: Call, sdks: Sdks) {
  try {
    fn(sdks);
  } catch (error) {
    console.warn("Analytics call failed", error);
  }
}

function load() {
  const { analytics } = config;
  if (!analytics.enabled) return;
  Promise.all([import("posthog-js"), import("@linkrunner/web")]).then(
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
        // Uncaught errors and unhandled rejections go to PostHog error
        // tracking. Console errors stay out: they can echo form values.
        capture_exceptions: { capture_unhandled_errors: true, capture_unhandled_rejections: true },
        // LCP, CLS and INP from real visitors, as $web_vitals events.
        capture_performance: { web_vitals: true, web_vitals_allowed_metrics: ["LCP", "CLS", "INP"] },
      });
      // Investor links carry ?via=inv-<name>. Registered before the queue
      // replays, so every event has it, the first one too; persisted, so a
      // later visit without it is still tagged.
      if (entryVia) posthog.register({ via: entryVia });
      ready = { posthog, lr };
      for (const call of queue) safe(call, ready);
      queue = [];
    },
    (error) => console.warn("Analytics failed to load", error),
  );
}

function run(fn: Call) {
  // Synchronous once loaded, so a capture just before a same-tab navigation is queued in time.
  if (ready) return safe(fn, ready);
  if (!active()) return;
  readEntry();
  queue.push(fn);
}

/**
 * Starts loading the SDKs and replays the queue. Called once from the root
 * layout when the page is idle; safe to call again.
 */
export function initAnalytics() {
  if (started || !active()) return;
  started = true;
  readEntry();
  load();
}

export function capture(event: string, properties: Properties, options?: CaptureOptions) {
  if (ready || !active()) return run(({ posthog }) => posthog.capture(event, properties, options));
  // Queued: replayed later, maybe after a client-side navigation, so keep the
  // page and time of the call rather than of the replay.
  const page = { $current_url: window.location.href, $pathname: window.location.pathname };
  const timestamp = new Date();
  run(({ posthog }) => posthog.capture(event, { ...page, ...properties }, { timestamp, ...options }));
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
