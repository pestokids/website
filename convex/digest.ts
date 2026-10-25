import { v } from "convex/values";
import { digestEmail, type DigestCounts } from "../content/email";
import { isValidEmail, normaliseEmail } from "../lib/application";
import type { SourceType } from "../lib/attribution";
import { internal } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import { RESEND_URL } from "./email";

/** Reporting days are San Francisco days, like the analytics tools. */
export const DIGEST_TIME_ZONE = "America/Los_Angeles";
/** Local hour the digest goes out. crons.ts runs at both UTC hours this can be. */
export const DIGEST_HOUR = 9;

type WallClock = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const wallClockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DIGEST_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

/** The date and time on a Los Angeles wall clock at instant `ms`. */
export function wallClock(ms: number): WallClock {
  const parts = Object.fromEntries(
    wallClockFormat.formatToParts(ms).map((p) => [p.type, Number(p.value)]),
  );
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  };
}

/** Los Angeles' offset from UTC at instant `ms`, e.g. -7h in daylight time. */
function offsetAt(ms: number): number {
  const w = wallClock(ms);
  const wallAsUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return wallAsUtc - (ms - (((ms % 1000) + 1000) % 1000));
}

/** The instant a Los Angeles calendar day starts. DST changes at 2am, so midnight always exists. */
export function startOfDay(year: number, month: number, day: number): number {
  const midnightUtc = Date.UTC(year, month - 1, day);
  return midnightUtc - offsetAt(midnightUtc - offsetAt(midnightUtc));
}

/** Yesterday in Los Angeles, relative to `now`: its date and [start, end) in epoch ms. */
export function previousDay(now: number): { date: string; start: number; end: number } {
  const today = wallClock(now);
  // Date.UTC rolls day 0 back into the previous month (and year).
  const y = new Date(Date.UTC(today.year, today.month - 1, today.day - 1));
  const [year, month, day] = [y.getUTCFullYear(), y.getUTCMonth() + 1, y.getUTCDate()];
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${year}-${pad(month)}-${pad(day)}`,
    start: startOfDay(year, month, day),
    end: startOfDay(today.year, today.month, today.day),
  };
}

/** Totals by sourceType and source. Takes only those two fields, so nothing personal gets in. */
export function summarize(
  rows: { sourceType: SourceType; source: string }[],
): DigestCounts {
  const bySourceType = { paid: 0, organic: 0, ai: 0, direct: 0 };
  const bySource = new Map<string, number>();
  for (const { sourceType, source } of rows) {
    bySourceType[sourceType]++;
    bySource.set(source, (bySource.get(source) ?? 0) + 1);
  }
  return {
    total: rows.length,
    bySourceType,
    bySource: [...bySource]
      .sort(([a, x], [b, y]) => y - x || a.localeCompare(b))
      .map(([source, count]) => ({ source, count })),
  };
}

const countsValidator = v.object({
  total: v.number(),
  bySourceType: v.object({
    paid: v.number(),
    organic: v.number(),
    ai: v.number(),
    direct: v.number(),
  }),
  bySource: v.array(v.object({ source: v.string(), count: v.number() })),
});

/** New applications created in [start, end), as counts only. Repeat submits keep their creation time. */
export const counts = internalQuery({
  args: { start: v.number(), end: v.number() },
  returns: countsValidator,
  handler: async (ctx, { start, end }) => {
    const rows = await ctx.db
      .query("applications")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", start).lt("_creationTime", end))
      .collect();
    return summarize(rows.map(({ sourceType, source }) => ({ sourceType, source })));
  },
});

export type DigestEnv = {
  DIGEST_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

export type DigestConfig =
  | { enabled: false }
  | { enabled: true; to: string[]; apiKey: string; from: string };

/**
 * Off unless DIGEST_EMAIL is set (one address, or several separated by
 * commas). When it's on, the Resend vars must be set too.
 */
export function readDigestConfig(env: DigestEnv): DigestConfig | { problems: string[] } {
  const get = (key: keyof DigestEnv) => env[key]?.trim() ?? "";
  const to = get("DIGEST_EMAIL").split(",").map(normaliseEmail).filter(Boolean);
  if (to.length === 0) return { enabled: false };

  const problems: string[] = [];
  const apiKey = get("RESEND_API_KEY");
  const from = get("EMAIL_FROM");
  if (!to.every(isValidEmail)) problems.push("DIGEST_EMAIL must be email addresses separated by commas");
  if (!apiKey) problems.push("RESEND_API_KEY is not set");
  if (!from) problems.push("EMAIL_FROM is not set");
  if (problems.length > 0) return { problems };
  return { enabled: true, to, apiKey, from };
}

/**
 * Emails yesterday's new-application counts to DIGEST_EMAIL. Run by
 * crons.ts at both UTC hours that can be 9am in Los Angeles; only the run
 * that lands on 9am sends. `force` sends now (e.g. from the dashboard).
 */
export const sendDaily = internalAction({
  args: { force: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { force = false }): Promise<null> => {
    const now = Date.now();
    if (!force && wallClock(now).hour !== DIGEST_HOUR) return null;

    const config = readDigestConfig({
      DIGEST_EMAIL: process.env.DIGEST_EMAIL,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      EMAIL_FROM: process.env.EMAIL_FROM,
    });
    if ("problems" in config) {
      console.error(`Daily digest not sent, bad config: ${config.problems.join("; ")}`);
      return null;
    }
    if (!config.enabled) return null;

    const day = previousDay(now);
    const totals = await ctx.runQuery(internal.digest.counts, { start: day.start, end: day.end });
    const email = { date: day.date, ...totals };

    let response: Response;
    try {
      response = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          // One scheduled digest per day, even if the job runs twice. Forced runs always send.
          "Idempotency-Key": `digest/${day.date}${force ? `/${now}` : ""}`,
        },
        body: JSON.stringify({
          from: config.from,
          to: config.to,
          subject: digestEmail.subject(email),
          text: digestEmail.text(email),
        }),
      });
    } catch (error) {
      console.error(
        `Daily digest not sent: could not reach Resend (${error instanceof Error ? error.message : error})`,
      );
      return null;
    }
    if (!response.ok) console.error(`Resend rejected the daily digest: HTTP ${response.status}`);
    return null;
  },
});
