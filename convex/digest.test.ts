// @vitest-environment edge-runtime
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { digestEmail } from "../content/email";
import { internal } from "./_generated/api";
import { previousDay, readDigestConfig, startOfDay, summarize, wallClock } from "./digest";
import { setupConvex, submit } from "./test.setup";

// Obviously fake values only: the repo is public.
const env = {
  DIGEST_EMAIL: "test.team@example.com",
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "Pesto <test.sender@example.com>",
};

const application = {
  kids: [{ name: "Test Kid A", age: "5" }],
  goals: ["science"],
  afterSchool: ["tutors"],
  email: "test.parent@example.com",
  attribution: {},
};

describe("Los Angeles days", () => {
  it("reads the wall clock in daylight and standard time", () => {
    expect(wallClock(Date.parse("2026-10-24T16:00:00Z"))).toMatchObject({ day: 24, hour: 9 });
    expect(wallClock(Date.parse("2026-12-01T17:00:00Z"))).toMatchObject({ day: 1, hour: 9 });
    expect(wallClock(Date.parse("2026-12-01T07:59:59Z"))).toMatchObject({ day: 30, hour: 23 });
  });

  it("finds midnight on either side of a DST change", () => {
    expect(startOfDay(2026, 10, 24)).toBe(Date.parse("2026-10-24T07:00:00Z"));
    expect(startOfDay(2026, 11, 1)).toBe(Date.parse("2026-11-01T07:00:00Z"));
    expect(startOfDay(2026, 11, 2)).toBe(Date.parse("2026-11-02T08:00:00Z"));
    expect(startOfDay(2026, 3, 8)).toBe(Date.parse("2026-03-08T08:00:00Z"));
    expect(startOfDay(2026, 3, 9)).toBe(Date.parse("2026-03-09T07:00:00Z"));
  });

  it("gives yesterday's bounds, including the 25-hour day DST ends on", () => {
    expect(previousDay(Date.parse("2026-10-24T16:00:00Z"))).toEqual({
      date: "2026-10-23",
      start: Date.parse("2026-10-23T07:00:00Z"),
      end: Date.parse("2026-10-24T07:00:00Z"),
    });
    const fallBack = previousDay(Date.parse("2026-11-02T17:00:00Z"));
    expect(fallBack.date).toBe("2026-11-01");
    expect(fallBack.end - fallBack.start).toBe(25 * 60 * 60 * 1000);
  });

  it("crosses month and year boundaries", () => {
    expect(previousDay(Date.parse("2027-01-01T17:00:00Z")).date).toBe("2026-12-31");
    expect(previousDay(Date.parse("2026-03-01T17:00:00Z")).date).toBe("2026-02-28");
  });
});

describe("summarize", () => {
  it("counts by sourceType and by source, most first", () => {
    expect(
      summarize([
        { sourceType: "organic", source: "whatsapp" },
        { sourceType: "paid", source: "meta" },
        { sourceType: "paid", source: "meta" },
        { sourceType: "direct", source: "direct" },
        { sourceType: "ai", source: "chatgpt" },
      ]),
    ).toEqual({
      total: 5,
      bySourceType: { paid: 2, organic: 1, ai: 1, direct: 1 },
      bySource: [
        { source: "meta", count: 2 },
        { source: "chatgpt", count: 1 },
        { source: "direct", count: 1 },
        { source: "whatsapp", count: 1 },
      ],
    });
  });
});

describe("digestEmail", () => {
  it("lists the counts for the day", () => {
    const data = {
      date: "2026-10-23",
      ...summarize([
        { sourceType: "paid", source: "meta" },
        { sourceType: "organic", source: "whatsapp" },
      ]),
    };
    expect(digestEmail.subject(data)).toBe("Founding Families: 2 new applications on Oct 23");
    const text = digestEmail.text(data);
    expect(text).toContain("2 new applications on Oct 23 (Pacific time).");
    expect(text).toMatch(/paid\s+1\n\s+organic\s+1\n\s+ai\s+0\n\s+direct\s+0/);
    expect(text).toMatch(/meta\s+1\n\s+whatsapp\s+1/);
  });

  it("handles a quiet day", () => {
    const data = { date: "2026-10-23", ...summarize([]) };
    expect(digestEmail.subject(data)).toBe("Founding Families: 0 new applications on Oct 23");
    expect(digestEmail.text(data)).toContain("By source\n  (none)");
  });
});

describe("readDigestConfig", () => {
  it("is off without DIGEST_EMAIL", () => {
    expect(readDigestConfig({ ...env, DIGEST_EMAIL: "" })).toEqual({ enabled: false });
    expect(readDigestConfig({ ...env, DIGEST_EMAIL: " , " })).toEqual({ enabled: false });
  });

  it("accepts several addresses", () => {
    expect(
      readDigestConfig({ ...env, DIGEST_EMAIL: "test.team@example.com, Test.Other@Example.com" }),
    ).toMatchObject({ enabled: true, to: ["test.team@example.com", "test.other@example.com"] });
  });

  it("reports what's missing when it's on", () => {
    const result = readDigestConfig({ DIGEST_EMAIL: "not-an-email" });
    expect(result).toHaveProperty("problems");
    expect((result as { problems: string[] }).problems).toHaveLength(3);
  });
});

describe("digest.sendDaily", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubEnv("EMAIL_SEND_ENABLED", "");
    fetchSpy = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  /**
   * Submits fake applications on 2026-10-23 (LA): two from Meta ads, one
   * direct. In time order: creation times only move forward.
   */
  async function seedYesterday(t: ReturnType<typeof setupConvex>) {
    // The day before isn't counted.
    vi.setSystemTime(Date.parse("2026-10-23T06:59:59Z"));
    await submit(t, { ...application, email: "test.parent+0@example.com" });

    vi.setSystemTime(Date.parse("2026-10-23T07:00:00Z"));
    await submit(t, {
      ...application,
      email: "test.parent+1@example.com",
      attribution: { utm_source: "meta", utm_medium: "paid_social" },
    });
    await submit(t, {
      ...application,
      email: "test.parent+2@example.com",
      attribution: { fbclid: "test-click-id" },
    });
    await submit(t, { ...application, email: "test.parent+3@example.com" });
    // Nor is today.
    vi.setSystemTime(Date.parse("2026-10-24T07:00:00Z"));
    await submit(t, { ...application, email: "test.parent+4@example.com" });
    // A repeat submit today from a family that applied yesterday isn't new.
    await submit(t, { ...application, email: "test.parent+1@example.com" });
  }

  it("emails yesterday's counts at 9am Los Angeles time, without names or emails", async () => {
    vi.stubEnv("DIGEST_EMAIL", env.DIGEST_EMAIL);
    vi.stubEnv("RESEND_API_KEY", env.RESEND_API_KEY);
    vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM);
    const t = setupConvex();
    await seedYesterday(t);

    vi.setSystemTime(Date.parse("2026-10-24T16:00:00Z"));
    await t.action(internal.digest.sendDaily, {});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("digest/2026-10-23");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      from: env.EMAIL_FROM,
      to: [env.DIGEST_EMAIL],
      subject: "Founding Families: 3 new applications on Oct 23",
    });
    expect(body.text).toMatch(/paid\s+2\n\s+organic\s+0\n\s+ai\s+0\n\s+direct\s+1/);
    expect(body.text).toMatch(/meta\s+2\n\s+direct\s+1/);
    expect(body.text).not.toMatch(/Test Kid|test\.parent/i);
  });

  it("does nothing at the UTC hour that isn't 9am in Los Angeles", async () => {
    vi.stubEnv("DIGEST_EMAIL", env.DIGEST_EMAIL);
    vi.stubEnv("RESEND_API_KEY", env.RESEND_API_KEY);
    vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM);
    const t = setupConvex();

    // 10am in daylight time.
    vi.setSystemTime(Date.parse("2026-10-24T17:00:00Z"));
    await t.action(internal.digest.sendDaily, {});
    expect(fetchSpy).not.toHaveBeenCalled();

    // Forced runs send whenever, with their own idempotency key.
    await t.action(internal.digest.sendDaily, { force: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toMatch(
      /^digest\/2026-10-23\/\d+$/,
    );
  });

  it("does nothing when DIGEST_EMAIL isn't set", async () => {
    vi.stubEnv("DIGEST_EMAIL", "");
    vi.stubEnv("RESEND_API_KEY", env.RESEND_API_KEY);
    vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM);
    const t = setupConvex();
    vi.setSystemTime(Date.parse("2026-10-24T16:00:00Z"));
    await t.action(internal.digest.sendDaily, { force: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
