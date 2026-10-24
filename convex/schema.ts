import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Raw first-touch attribution, as captured by lib/attribution.ts.
export const attribution = v.object({
  utm_source: v.optional(v.string()),
  utm_medium: v.optional(v.string()),
  utm_campaign: v.optional(v.string()),
  utm_content: v.optional(v.string()),
  utm_term: v.optional(v.string()),
  utm_id: v.optional(v.string()),
  fbclid: v.optional(v.string()),
  gclid: v.optional(v.string()),
  ttclid: v.optional(v.string()),
  via: v.optional(v.string()),
  landing_url: v.optional(v.string()),
  referrer: v.optional(v.string()),
});

export default defineSchema({
  applications: defineTable({
    email: v.string(), // lowercased, trimmed
    kids: v.array(v.object({ name: v.string(), age: v.string() })), // age "3".."7" | "8+"
    // Whether a kid's name looks fake (lib/name-check.ts), re-checked on the
    // server. Absent on applications from before the check.
    nameCheck: v.optional(v.union(v.literal("ok"), v.literal("suspicious"))),
    goals: v.array(v.string()), // 1–3 slugs
    afterSchool: v.array(v.string()), // ≥1 slugs
    refCode: v.string(), // unique, used in the WhatsApp prefill
    sourceType: v.union(v.literal("paid"), v.literal("organic"), v.literal("direct")),
    source: v.string(),
    campaign: v.optional(v.string()),
    attribution,
    posthogDistinctId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    emailStatus: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
  })
    .index("by_email", ["email"])
    .index("by_refCode", ["refCode"]),
});
