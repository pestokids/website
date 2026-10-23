// @vitest-environment edge-runtime
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import type { SubmitError } from "./applications";
import { setupConvex } from "./test.setup";

// Obviously fake data only: the repo is public.
const application = {
  kids: [
    { name: "test kid a", age: "5" },
    { name: "Test Kid B", age: "8+" },
  ],
  goals: ["science", "music"],
  afterSchool: ["bedtime_stories", "tutors"],
  email: "Test.Parent@Example.com",
  attribution: {
    utm_source: "meta",
    utm_medium: "paid_social",
    utm_campaign: "test_campaign",
    fbclid: "test-click-id",
    landing_url: "https://pestokids.com/apply?utm_source=meta",
  },
  posthogDistinctId: "test-distinct-id",
};

const REF_CODE = /^PF-[2-9A-HJ-NP-Z]{4}$/;

async function submitError(promise: Promise<unknown>): Promise<Record<string, unknown>> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ConvexError);
  return (error as ConvexError<SubmitError>).data;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubEnv("EMAIL_SEND_ENABLED", "");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("applications.submit", () => {
  it("stores a new application and returns its id and ref code", async () => {
    const t = setupConvex();
    const result = await t.mutation(api.applications.submit, application);
    expect(result.refCode).toMatch(REF_CODE);

    const doc = await t.run((ctx) => ctx.db.get(result.applicationId));
    expect(doc).toMatchObject({
      email: "test.parent@example.com",
      kids: [
        { name: "Test kid a", age: "5" },
        { name: "Test Kid B", age: "8+" },
      ],
      goals: ["science", "music"],
      afterSchool: ["bedtime_stories", "tutors"],
      refCode: result.refCode,
      attribution: application.attribution,
      posthogDistinctId: "test-distinct-id",
      emailStatus: "pending",
    });
    expect(doc?.createdAt).toBe(doc?.updatedAt);
  });

  it("classifies the source on the server from the raw attribution", async () => {
    const t = setupConvex();
    const paid = await t.mutation(api.applications.submit, application);
    const direct = await t.mutation(api.applications.submit, {
      ...application,
      email: "test.parent2@example.com",
      attribution: {},
    });
    const docs = await t.run(async (ctx) => [
      await ctx.db.get(paid.applicationId),
      await ctx.db.get(direct.applicationId),
    ]);
    expect(docs[0]).toMatchObject({ sourceType: "paid", source: "meta", campaign: "test_campaign" });
    expect(docs[1]).toMatchObject({ sourceType: "direct", source: "direct" });
    expect(docs[1]?.campaign).toBeUndefined();
  });

  it("doesn't accept a client-supplied source", async () => {
    const t = setupConvex();
    const forged = { ...application, sourceType: "paid", source: "meta" };
    await expect(t.mutation(api.applications.submit, forged)).rejects.toThrow(/sourceType/);
  });

  it("upserts by email: keeps refCode, createdAt and first touch, updates the answers", async () => {
    const t = setupConvex();
    const first = await t.mutation(api.applications.submit, application);
    const before = await t.run((ctx) => ctx.db.get(first.applicationId));
    vi.advanceTimersByTime(60_000);

    const second = await t.mutation(api.applications.submit, {
      kids: [{ name: "Test Kid C", age: "3" }],
      goals: ["puzzles"],
      afterSchool: ["mostly_school"],
      email: "  test.parent@EXAMPLE.com ",
      attribution: { utm_source: "whatsapp", referrer: "https://example.org/" },
    });
    expect(second).toEqual(first);

    const docs = await t.run((ctx) => ctx.db.query("applications").collect());
    expect(docs).toHaveLength(1);
    expect(docs[0]).toMatchObject({
      refCode: first.refCode,
      createdAt: before?.createdAt,
      updatedAt: before!.updatedAt + 60_000,
      kids: [{ name: "Test Kid C", age: "3" }],
      goals: ["puzzles"],
      afterSchool: ["mostly_school"],
      // First touch wins.
      attribution: application.attribution,
      sourceType: "paid",
      source: "meta",
      campaign: "test_campaign",
      // Not sent this time, so the stored one is kept.
      posthogDistinctId: "test-distinct-id",
      emailStatus: "pending",
    });
  });

  it("gives different emails different ref codes", async () => {
    const t = setupConvex();
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const { refCode } = await t.mutation(api.applications.submit, {
        ...application,
        email: `test.parent+${i}@example.com`,
      });
      codes.add(refCode);
    }
    expect(codes.size).toBe(20);
  });

  it.each([
    ["kids", { kids: [] }],
    ["kids", { kids: [{ name: "Test1", age: "5" }] }],
    ["kids", { kids: [{ name: "Test Kid", age: "9" }] }],
    ["goals", { goals: ["science", "music", "puzzles", "the_world"] }],
    ["afterSchool", { afterSchool: [] }],
    ["afterSchool", { afterSchool: ["mostly_school", "tutors"] }],
    ["email", { email: "test.parent@example" }],
  ])("rejects invalid %s without writing anything", async (field, patch) => {
    const t = setupConvex();
    const data = await submitError(t.mutation(api.applications.submit, { ...application, ...patch }));
    expect(data).toMatchObject({ code: "invalid", field });
    expect(await t.run((ctx) => ctx.db.query("applications").collect())).toHaveLength(0);
  });

  it("rate-limits repeat submits per email", async () => {
    const t = setupConvex();
    for (let i = 0; i < 5; i++) await t.mutation(api.applications.submit, application);

    const data = await submitError(t.mutation(api.applications.submit, application));
    expect(data).toMatchObject({ code: "rate_limited" });
    expect(data.retryAfter).toBeGreaterThan(0);

    // Other addresses aren't affected.
    await t.mutation(api.applications.submit, { ...application, email: "test.other@example.com" });

    // The window resets.
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    await t.mutation(api.applications.submit, application);
  });

  it("has a global limit across all emails", async () => {
    const t = setupConvex();
    let limited: Record<string, unknown> | null = null;
    for (let i = 0; i < 200 && !limited; i++) {
      try {
        await t.mutation(api.applications.submit, {
          ...application,
          email: `test.parent+${i}@example.com`,
        });
      } catch (error) {
        limited = (error as ConvexError<SubmitError>).data;
      }
    }
    expect(limited).toMatchObject({ code: "rate_limited" });
  });

  it("schedules the confirmation email, which is skipped when sending is off", async () => {
    const t = setupConvex();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const { applicationId } = await t.mutation(api.applications.submit, application);
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      const doc = await t.run((ctx) => ctx.db.get(applicationId));
      expect(doc?.emailStatus).toBe("skipped");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
