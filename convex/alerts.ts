import { v } from "convex/values";
import { familyOf } from "../app/(apply)/_lib/personalise";
import { applicationAlertEmail } from "../content/email";
import { isValidEmail, normaliseEmail } from "../lib/application";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { RESEND_URL } from "./email";

/** Times in the alert are Pacific, like the analytics tools. */
export const ALERT_TIME_ZONE = "America/Los_Angeles";

const submittedFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ALERT_TIME_ZONE,
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Nov 27, 9:14 AM" in Pacific time. */
export function submittedLabel(ms: number): string {
  return submittedFormat.format(ms);
}

export type AlertEnv = {
  APPLICATION_ALERT_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

export type AlertConfig =
  | { enabled: false }
  | { enabled: true; to: string[]; apiKey: string; from: string };

/**
 * Off unless APPLICATION_ALERT_EMAIL is set (one address, or several
 * separated by commas). When it's on, the Resend vars must be set too.
 */
export function readAlertConfig(env: AlertEnv): AlertConfig | { problems: string[] } {
  const get = (key: keyof AlertEnv) => env[key]?.trim() ?? "";
  const to = get("APPLICATION_ALERT_EMAIL").split(",").map(normaliseEmail).filter(Boolean);
  if (to.length === 0) return { enabled: false };

  const problems: string[] = [];
  const apiKey = get("RESEND_API_KEY");
  const from = get("EMAIL_FROM");
  if (!to.every(isValidEmail)) {
    problems.push("APPLICATION_ALERT_EMAIL must be email addresses separated by commas");
  }
  if (!apiKey) problems.push("RESEND_API_KEY is not set");
  if (!from) problems.push("EMAIL_FROM is not set");
  if (problems.length > 0) return { problems };
  return { enabled: true, to, apiKey, from };
}

/**
 * Emails the team about one application, new or resubmitted. Scheduled by
 * `applications.submit` (never for spam-trap submits, which save nothing).
 * Stands down if a newer submit from the same parent has replaced this one,
 * since that submit sends its own alert.
 */
export const sendApplicationAlert = internalAction({
  args: { applicationId: v.id("applications"), submittedAt: v.number(), isNew: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { applicationId, submittedAt, isNew }): Promise<null> => {
    const config = readAlertConfig({
      APPLICATION_ALERT_EMAIL: process.env.APPLICATION_ALERT_EMAIL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
    });
    if ("problems" in config) {
      console.error(`Application alert not sent, bad config: ${config.problems.join("; ")}`);
      return null;
    }
    if (!config.enabled) return null;

    const application: Doc<"applications"> | null = await ctx.runQuery(
      internal.applications.get,
      { applicationId },
    );
    if (!application || application.updatedAt !== submittedAt) return null;

    const data = {
      isNew,
      family: familyOf(application.kids.map((k) => k.name)),
      email: application.email,
      kids: application.kids,
      nameFlagged: application.nameCheck === "suspicious",
      goals: application.goals,
      afterSchool: application.afterSchool,
      sourceType: application.sourceType,
      source: application.source,
      campaign: application.campaign,
      refCode: application.refCode,
      submittedLabel: submittedLabel(submittedAt),
    };

    let response: Response;
    try {
      response = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          // One alert per submission, even if this action runs twice.
          "Idempotency-Key": `alert/${applicationId}/${submittedAt}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: config.to,
          subject: applicationAlertEmail.subject(data),
          text: applicationAlertEmail.text(data),
        }),
      });
    } catch (error) {
      console.error(
        `Application alert not sent: could not reach Resend (${error instanceof Error ? error.message : error})`,
      );
      return null;
    }
    if (!response.ok) console.error(`Resend rejected the application alert: HTTP ${response.status}`);
    return null;
  },
});
