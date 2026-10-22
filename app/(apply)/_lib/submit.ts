/**
 * Sends the draft to Convex `applications.submit`. A plain HTTP call: the
 * flow makes exactly one mutation and never subscribes, so it needs no
 * websocket client or provider.
 */
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import type { SubmitError } from "@/convex/applications";
import { config } from "@/lib/config";
import type { Draft, Submitted } from "./flow";

/** Give up on a hung request; a retry is safe because submit upserts by email. */
const TIMEOUT_MS = 20_000;

export type SubmitResult =
  | { ok: true; submitted: Submitted }
  /** `invalid_email`: the server rejected the address. Anything else is shown as a network error. */
  | { ok: false; reason: "invalid_email" | "invalid" | "rate_limited" | "timeout" | "network" };

let client: ConvexHttpClient | null = null;

function timeout(): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS));
}

export async function submitApplication(draft: Draft, email: string): Promise<SubmitResult> {
  const kids = draft.kids.flatMap((k) => (k.age ? [{ name: k.name, age: k.age }] : []));
  if (kids.length !== draft.kids.length) return { ok: false, reason: "invalid" };

  client ??= new ConvexHttpClient(config.convexUrl);
  try {
    const { applicationId, refCode } = await Promise.race([
      client.mutation(api.applications.submit, {
        kids,
        goals: draft.goals,
        afterSchool: draft.afterSchool,
        email,
        attribution: draft.attribution ?? {},
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
      return { ok: false, reason: data.field === "email" ? "invalid_email" : "invalid" };
    }
    if (error instanceof Error && error.message === "timeout") return { ok: false, reason: "timeout" };
    return { ok: false, reason: "network" };
  }
}
