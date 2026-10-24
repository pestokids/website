// @vitest-environment edge-runtime
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import type { SubmitError } from "./applications";
import { setupConvex, submit } from "./test.setup";

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
    const result = await submit(t, application);
    expect(result.refCode).toMatch(REF_CODE);

    const doc = await t.run((ctx) => ctx.db.get(result.applicationId));
    expect(doc).toMatchObject({
      email: "test.parent@example.com",
      kids: [
        { name: "Test kid a", age: "5" },
        { name: "Test Kid B", age: "8+" },
      ],
      nameCheck: "suspicious",
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
    const paid = await submit(t, application);
    const direct = await submit(t, {
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

  it("checks the kids' names on the server, on every submit", async () => {
    const t = setupConvex();
    const real = { ...application, kids: [{ name: "Aarav", age: "4" }] };
    const { applicationId } = await submit(t, real);
    expect(await t.run((ctx) => ctx.db.get(applicationId))).toMatchObject({ nameCheck: "ok" });

    await submit(t, { ...real, kids: [{ name: "asdf", age: "4" }] });
    expect(await t.run((ctx) => ctx.db.get(applicationId))).toMatchObject({
      kids: [{ name: "Asdf", age: "4" }],
      nameCheck: "suspicious",
    });
  });

  it("doesn't accept a client-supplied nameCheck", async () => {
    const t = setupConvex();
    const forged = { ...application, nameCheck: "ok" };
    await expect(t.mutation(api.applications.submit, forged)).rejects.toThrow(/nameCheck/);
  });

  it("doesn't accept a client-supplied source", async () => {
    const t = setupConvex();
    const forged = { ...application, sourceType: "paid", source: "meta" };
    await expect(submit(t, forged)).rejects.toThrow(/sourceType/);
  });

  it("upserts by email: keeps refCode, createdAt and first touch, updates the answers", async () => {
    const t = setupConvex();
    const first = await submit(t, application);
    const before = await t.run((ctx) => ctx.db.get(first.applicationId));
    vi.advanceTimersByTime(60_000);

    const second = await submit(t, {
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
      const { refCode } = await submit(t, {
        ...application,
        email: `test.parent+${i}@example.com`,
      });
      codes.add(refCode);
    }
    expect(codes.size).toBe(20);
  });

  it("stores up to 3 kids", async () => {
    const t = setupConvex();
    const kids = [...application.kids, { name: "Test Kid C", age: "3" }];
    const { applicationId } = await submit(t, { ...application, kids });
    const doc = await t.run((ctx) => ctx.db.get(applicationId));
    expect(doc?.kids).toEqual([
      { name: "Test kid a", age: "5" },
      { name: "Test Kid B", age: "8+" },
      { name: "Test Kid C", age: "3" },
    ]);
  });

  it.each([
    ["kids", { kids: [] }],
    [
      "kids",
      { kids: ["Test Kid A", "Test Kid B", "Test Kid C", "Test Kid D"].map((name) => ({ name, age: "5" })) },
    ],
    ["kids", { kids: ["Test Kid A", "Test Kid B", "test kid b"].map((name) => ({ name, age: "5" })) }],
    ["kids", { kids: [{ name: "Test1", age: "5" }] }],
    ["kids", { kids: [{ name: "Test Kid", age: "9" }] }],
    ["goals", { goals: ["science", "music", "puzzles", "the_world"] }],
    ["afterSchool", { afterSchool: [] }],
    ["afterSchool", { afterSchool: ["mostly_school", "tutors"] }],
    ["email", { email: "test.parent@example" }],
  ])("rejects invalid %s without writing anything", async (field, patch) => {
    const t = setupConvex();
    const data = await submitError(submit(t, { ...application, ...patch }));
    expect(data).toMatchObject({ code: "invalid", field });
    expect(await t.run((ctx) => ctx.db.query("applications").collect())).toHaveLength(0);
  });

  it("rate-limits repeat submits per email", async () => {
    const t = setupConvex();
    for (let i = 0; i < 5; i++) await submit(t, application);

    const data = await submitError(submit(t, application));
    expect(data).toMatchObject({ code: "rate_limited" });
    expect(data.retryAfter).toBeGreaterThan(0);

    // Other addresses aren't affected.
    await submit(t, { ...application, email: "test.other@example.com" });

    // The window resets.
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    await submit(t, application);
  });

  it("has a global limit across all emails", async () => {
    const t = setupConvex();
    let limited: Record<string, unknown> | null = null;
    for (let i = 0; i < 200 && !limited; i++) {
      try {
        await submit(t, {
          ...application,
          email: `test.parent+${i}@example.com`,
        });
      } catch (error) {
        limited = (error as ConvexError<SubmitError>).data;
      }
    }
    expect(limited).toMatchObject({ code: "rate_limited" });
  });

  it("rejects a throwaway inbox", async () => {
    const t = setupConvex();
    const data = await submitError(submit(t, { ...application, email: "test.parent@yopmail.com" }));
    expect(data).toMatchObject({ code: "invalid", field: "email", reason: "disposable email" });
  });

  it("answers a filled spam trap like a success, but saves and sends nothing", async () => {
    const t = setupConvex();
    vi.stubEnv("LINKRUNNER_SERVER_KEY", "test-linkrunner-key");
    const result = await t.mutation(api.applications.submit, {
      ...application,
      website: "https://spam.example.com",
    });
    expect(result.applicationId).toMatch(/^[0-9a-z]{32}$/);
    expect(result.refCode).toMatch(REF_CODE);

    expect(await t.run((ctx) => ctx.db.query("applications").collect())).toHaveLength(0);
    const scheduled = await t.run((ctx) => ctx.db.system.query("_scheduled_functions").collect());
    expect(scheduled).toHaveLength(0);
  });

  it("ignores an empty spam trap", async () => {
    const t = setupConvex();
    await submit(t, { ...application, website: "  " });
    expect(await t.run((ctx) => ctx.db.query("applications").collect())).toHaveLength(1);
  });

  it("schedules the confirmation email, which is skipped when sending is off", async () => {
    const t = setupConvex();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    try {
      const { applicationId } = await submit(t, application);
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      const doc = await t.run((ctx) => ctx.db.get(applicationId));
      expect(doc?.emailStatus).toBe("skipped");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
