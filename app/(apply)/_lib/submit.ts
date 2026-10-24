/**
 * Sends the draft to Convex `applications.submit`. A plain HTTP call: the
 * flow makes exactly one mutation and never subscribes, so it needs no
 * websocket client or provider.
 */
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { SubmitError } from "@/convex/applications";
import { distinctId } from "@/lib/analytics";
import { DISPOSABLE_EMAIL_REASON } from "@/lib/application";
import { isDisposableEmail } from "@/lib/disposable-email";
import { config } from "@/lib/config";
import { canReceiveMail } from "./deliverability";
import type { Draft, Submitted } from "./flow";

/** Give up on a hung request; a retry is safe because submit upserts by email. */
const TIMEOUT_MS = 20_000;

export type SubmitResult =
  | { ok: true; submitted: Submitted }
  /**
   * `invalid_email` / `disposable_email`: the address was rejected (bad
   * format, or a throwaway inbox). `undeliverable_email`: its domain can't
   * receive mail. Anything else is shown as a network error.
   */
  | {
      ok: false;
      reason:
        | "invalid_email"
        | "disposable_email"
        | "undeliverable_email"
        | "invalid"
        | "rate_limited"
        | "timeout"
        | "network";
    };

let client: ConvexHttpClient | null = null;

function timeout(): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS));
}

/**
 * Checks run in order: spam trap → throwaway inbox → MX lookup → Convex.
 * `trap` is the email step's off-screen spam-trap field, sent as is. When it's
 * filled, the email checks are skipped: the server answers a bot with a
 * decoy success, so it never sees a real rejection.
 */
export async function submitApplication(
  draft: Draft,
  email: string,
  trap = "",
): Promise<SubmitResult> {
  const kids = draft.kids.flatMap((k) => (k.age ? [{ name: k.name, age: k.age }] : []));
  if (kids.length !== draft.kids.length) return { ok: false, reason: "invalid" };
  if (!trap) {
    if (isDisposableEmail(email)) return { ok: false, reason: "disposable_email" };
    if (!(await canReceiveMail(email))) return { ok: false, reason: "undeliverable_email" };
  }

  client ??= new ConvexHttpClient(config.convexUrl);
  // The anonymous PostHog ID, so the application can be joined to its funnel events.
  const posthogDistinctId = distinctId();
  try {
    const { applicationId, refCode } = await Promise.race([
      client.mutation(api.applications.submit, {
        kids,
        goals: draft.goals,
        afterSchool: draft.afterSchool,
        email,
        attribution: draft.attribution ?? {},
        ...(posthogDistinctId && { posthogDistinctId }),
        ...(trap && { website: trap }),
      }),
      timeout(),
    ]);
    return {
      ok: true,
      submitted: {
        applicationId,
        refCode,
        email,
        kidNames: kids.map((k) => k.name),
        submittedAt: Date.now(),
      },
    };
  } catch (error) {
    if (error instanceof ConvexError) {
      const data = error.data as SubmitError;
      if (data.code === "rate_limited") return { ok: false, reason: "rate_limited" };
      if (data.field !== "email") return { ok: false, reason: "invalid" };
      return {
        ok: false,
        reason: data.reason === DISPOSABLE_EMAIL_REASON ? "disposable_email" : "invalid_email",
      };
    }
    if (error instanceof Error && error.message === "timeout") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "network" };
  }
}
