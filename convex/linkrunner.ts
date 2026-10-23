import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export const CAPTURE_EVENT_URL = "https://api.linkrunner.io/api/v1/capture-event";

/** The server key, or null when the mirror is off (LINKRUNNER_SERVER_KEY unset). */
export function linkrunnerServerKey(value: string | undefined): string | null {
  return value?.trim() || null;
}

/**
 * Body of the server-side signup. `user_id` matches the browser's
 * `lr.identify(applicationId)`; `source: "web"` attributes it to the visitor's
 * Web SDK visit rather than an app install.
 */
export function signupEvent(applicationId: string) {
  return {
    event_name: "signup",
    user_id: applicationId,
    event_id: applicationId,
    source: "web",
  };
}

/**
 * Mirrors a new application's signup to Linkrunner's Event Capture API, so an
 * ad blocker on the phone can't drop the conversion. Scheduled by
 * `applications.submit` only when LINKRUNNER_SERVER_KEY is set. One attempt:
 * web events aren't deduplicated, so a retry could count twice.
 */
export const mirrorSignup = internalAction({
  args: { applicationId: v.id("applications") },
  returns: v.null(),
  handler: async (_ctx, { applicationId }): Promise<null> => {
    const key = linkrunnerServerKey(process.env.LINKRUNNER_SERVER_KEY);
    if (!key) return null;
    try {
      const response = await fetch(CAPTURE_EVENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "linkrunner-key": key },
        body: JSON.stringify(signupEvent(applicationId)),
      });
      if (!response.ok) console.error(`Linkrunner signup mirror: HTTP ${response.status}`);
    } catch (error) {
      console.error(
        `Linkrunner signup mirror: could not reach Linkrunner (${error instanceof Error ? error.message : error})`,
      );
    }
    return null;
  },
});
