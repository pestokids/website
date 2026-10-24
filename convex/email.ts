import { v } from "convex/values";
import { familyOf } from "../app/(apply)/_lib/personalise";
import { confirmationEmail } from "../content/email";
import { parseIsoDate } from "../lib/dates";
import { isWhatsappNumber, whatsappLink } from "../lib/whatsapp";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

export type EmailEnv = {
  EMAIL_SEND_ENABLED?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  NEXT_PUBLIC_WHATSAPP_NUMBER?: string;
  NEXT_PUBLIC_BETA_DATE?: string;
};

export type EmailConfig =
  | { enabled: false }
  | { enabled: true; apiKey: string; from: string; whatsappNumber: string; betaDate: string };

/**
 * Reads the Convex env for sending. Sending is off unless EMAIL_SEND_ENABLED
 * is "true"; when it's on, every other var must be present and well-formed.
 */
export function readEmailConfig(env: EmailEnv): EmailConfig | { problems: string[] } {
  const get = (key: keyof EmailEnv) => env[key]?.trim() ?? "";
  if (!["true", "1"].includes(get("EMAIL_SEND_ENABLED").toLowerCase())) return { enabled: false };

  const problems: string[] = [];
  const apiKey = get("RESEND_API_KEY");
  const from = get("EMAIL_FROM");
  const whatsappNumber = get("NEXT_PUBLIC_WHATSAPP_NUMBER");
  const betaDate = parseIsoDate(get("NEXT_PUBLIC_BETA_DATE"));
  if (!apiKey) problems.push("RESEND_API_KEY is not set");
  if (!from) problems.push("EMAIL_FROM is not set");
  if (!isWhatsappNumber(whatsappNumber)) {
    problems.push("NEXT_PUBLIC_WHATSAPP_NUMBER must be E.164 digits without the +");
  }
  if (!betaDate) problems.push("NEXT_PUBLIC_BETA_DATE must be a date in YYYY-MM-DD form");
  if (problems.length > 0 || !betaDate) return { problems };

  return { enabled: true, apiKey, from, whatsappNumber, betaDate: betaDate.long };
}

export const RESEND_URL = "https://api.resend.com/emails";

/** Delays before the 2nd and 3rd attempts. Only transient failures are retried. */
export const RETRY_DELAYS_MS = [60_000, 10 * 60_000];

/** Network errors, rate limiting and Resend outages are worth retrying; other 4xx aren't. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Sends the confirmation email for one submission through Resend and records
 * the outcome in `emailStatus`. Scheduled by `applications.submit`.
 *
 * `submittedAt` is the application's `updatedAt` for that submission. It keys
 * the Resend idempotency key (so retries can't send twice) and lets a run for
 * an older submission stand down once a newer one has been made.
 */
export const sendConfirmation = internalAction({
  args: {
    applicationId: v.id("applications"),
    submittedAt: v.number(),
    attempt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { applicationId, submittedAt, attempt = 1 }): Promise<null> => {
    const application: Doc<"applications"> | null = await ctx.runQuery(
      internal.applications.get,
      { applicationId },
    );
    // Gone, or superseded by a newer submit, which schedules its own email.
    if (!application || application.updatedAt !== submittedAt) return null;

    const setStatus = async (emailStatus: "sent" | "failed" | "skipped"): Promise<null> => {
      await ctx.runMutation(internal.applications.setEmailStatus, {
        applicationId,
        submittedAt,
        emailStatus,
      });
      return null;
    };
    const retryOrFail = async (problem: string): Promise<null> => {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      if (delay === undefined) {
        console.error(`Confirmation email failed after ${attempt} attempts: ${problem}`);
        return setStatus("failed");
      }
      console.warn(`Confirmation email attempt ${attempt} failed, retrying: ${problem}`);
      await ctx.scheduler.runAfter(delay, internal.email.sendConfirmation, {
        applicationId,
        submittedAt,
        attempt: attempt + 1,
      });
      return null;
    };

    const config = readEmailConfig({
      EMAIL_SEND_ENABLED: process.env.EMAIL_SEND_ENABLED,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
      NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
      NEXT_PUBLIC_BETA_DATE: process.env.NEXT_PUBLIC_BETA_DATE,
    });
    if ("problems" in config) {
      console.error(`Confirmation email not sent, bad config: ${config.problems.join("; ")}`);
      return setStatus("failed");
    }
    if (!config.enabled) return setStatus("skipped");

    const { kids, refCode } = application;
    const text = confirmationEmail.text({
      family: familyOf(kids.map((k) => k.name)),
      kids,
      whatsappUrl: whatsappLink(config.whatsappNumber, refCode),
      betaDate: config.betaDate,
      refCode,
    });

    let response: Response;
    try {
      response = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          // Same key on every attempt: Resend sends at most once per submission.
          "Idempotency-Key": `confirmation/${applicationId}/${submittedAt}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: [application.email],
          subject: confirmationEmail.subject,
          text,
        }),
      });
    } catch (error) {
      return retryOrFail(`could not reach Resend (${error instanceof Error ? error.message : error})`);
    }
    if (response.ok) return setStatus("sent");
    if (isRetryableStatus(response.status)) return retryOrFail(`Resend HTTP ${response.status}`);
    console.error(`Resend rejected the confirmation email: HTTP ${response.status}`);
    return setStatus("failed");
  },
});
