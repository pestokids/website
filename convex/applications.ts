import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { classifyAttribution } from "../lib/attribution";
import { validateApplication } from "../lib/application";
import { components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation, type MutationCtx } from "./_generated/server";
import { linkrunnerServerKey } from "./linkrunner";
import { attribution } from "./schema";

/**
 * Errors `submit` throws on purpose, as `ConvexError` data. Anything else is
 * an unexpected server error.
 */
export type SubmitError =
  | { code: "invalid"; field: string; reason: string }
  | { code: "rate_limited"; retryAfter: number };

const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Repeat submits from one address (e.g. fixing an answer), not a flood.
  submitPerEmail: { kind: "fixed window", rate: 5, period: HOUR },
  // Backstop across everyone. Convex mutations can't see the caller's IP.
  submitGlobal: { kind: "token bucket", rate: 60, period: MINUTE, capacity: 120, shards: 4 },
});

// No 0/O or 1/I, so the code survives being read aloud or retyped.
const REF_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const REF_CODE_LENGTH = 4;
const REF_CODE_ATTEMPTS = 10;

function randomRefCode(): string {
  let code = "";
  for (let i = 0; i < REF_CODE_LENGTH; i++) {
    code += REF_CODE_ALPHABET[Math.floor(Math.random() * REF_CODE_ALPHABET.length)];
  }
  return `PF-${code}`;
}

async function uniqueRefCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < REF_CODE_ATTEMPTS; i++) {
    const code = randomRefCode();
    const taken = await ctx.db
      .query("applications")
      .withIndex("by_refCode", (q) => q.eq("refCode", code))
      .first();
    if (!taken) return code;
  }
  throw new Error("Could not generate a unique ref code");
}

async function limit(ctx: MutationCtx, name: "submitPerEmail" | "submitGlobal", key?: string) {
  const status = await rateLimiter.limit(ctx, name, { key });
  if (!status.ok) {
    throw new ConvexError<SubmitError>({ code: "rate_limited", retryAfter: status.retryAfter });
  }
}

/**
 * The only public function (spec §2.2). Validates the application with the
 * same rules as the client, then upserts it by email: a repeat keeps its
 * refCode, createdAt and first-touch attribution, and updates the answers.
 * Either way the confirmation email is (re)sent.
 */
export const submit = mutation({
  args: {
    kids: v.array(v.object({ name: v.string(), age: v.string() })),
    goals: v.array(v.string()),
    afterSchool: v.array(v.string()),
    email: v.string(),
    attribution,
    posthogDistinctId: v.optional(v.string()),
  },
  returns: v.object({ applicationId: v.id("applications"), refCode: v.string() }),
  handler: async (ctx, args) => {
    const result = validateApplication(args);
    if (!result.ok) {
      throw new ConvexError<SubmitError>({
        code: "invalid",
        field: result.field,
        reason: result.reason,
      });
    }
    const app = result.value;

    await limit(ctx, "submitGlobal");
    await limit(ctx, "submitPerEmail", app.email);

    const now = Date.now();
    const existing = await ctx.db
      .query("applications")
      .withIndex("by_email", (q) => q.eq("email", app.email))
      .unique();

    let applicationId: Id<"applications">;
    let refCode: string;
    if (existing) {
      applicationId = existing._id;
      refCode = existing.refCode;
      await ctx.db.patch(applicationId, {
        kids: app.kids,
        goals: app.goals,
        afterSchool: app.afterSchool,
        posthogDistinctId: app.posthogDistinctId ?? existing.posthogDistinctId,
        updatedAt: now,
        emailStatus: "pending",
      });
    } else {
      refCode = await uniqueRefCode(ctx);
      const { sourceType, source, campaign } = classifyAttribution(app.attribution);
      applicationId = await ctx.db.insert("applications", {
        email: app.email,
        kids: app.kids,
        goals: app.goals,
        afterSchool: app.afterSchool,
        refCode,
        sourceType,
        source,
        campaign: campaign ?? undefined,
        attribution: app.attribution,
        posthogDistinctId: app.posthogDistinctId,
        createdAt: now,
        updatedAt: now,
        emailStatus: "pending",
      });
      // Optional server copy of the Linkrunner signup, for new applications only.
      if (linkrunnerServerKey(process.env.LINKRUNNER_SERVER_KEY)) {
        await ctx.scheduler.runAfter(0, internal.linkrunner.mirrorSignup, { applicationId });
      }
    }

    await ctx.scheduler.runAfter(0, internal.email.sendConfirmation, {
      applicationId,
      submittedAt: now,
    });
    return { applicationId, refCode };
  },
});

export const get = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, { applicationId }): Promise<Doc<"applications"> | null> =>
    ctx.db.get(applicationId),
});

/**
 * Records the confirmation email's outcome for the submission made at
 * `submittedAt`. Ignored if a newer submit has since reset the status.
 */
export const setEmailStatus = internalMutation({
  args: {
    applicationId: v.id("applications"),
    submittedAt: v.number(),
    emailStatus: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
  },
  returns: v.null(),
  handler: async (ctx, { applicationId, submittedAt, emailStatus }) => {
    const application = await ctx.db.get(applicationId);
    if (application?.updatedAt !== submittedAt) return null;
    await ctx.db.patch(applicationId, { emailStatus });
    return null;
  },
});
