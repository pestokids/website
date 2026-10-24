// @vitest-environment edge-runtime
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRetryableStatus, readEmailConfig } from "./email";
import { setupConvex, submit } from "./test.setup";

// Obviously fake values only: the repo is public.
const env = {
  EMAIL_SEND_ENABLED: "true",
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "Pesto <test.sender@example.com>",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "15550000000",
  NEXT_PUBLIC_BETA_DATE: "2026-10-31",
};

const application = {
  kids: [
    { name: "Test Kid A", age: "5" },
    { name: "Test Kid B", age: "8+" },
  ],
  goals: ["science"],
  afterSchool: ["tutors"],
  email: "test.parent@example.com",
  attribution: {},
};

/** Runs the scheduled functions that are due now, and nothing scheduled for later. */
async function runDueScheduledFunctions(t: ReturnType<typeof setupConvex>) {
  vi.runOnlyPendingTimers();
  await t.finishInProgressScheduledFunctions();
}

function idempotencyKeys(fetchSpy: ReturnType<typeof vi.fn>): string[] {
  return fetchSpy.mock.calls.map(
    (call) => ((call[1] as RequestInit).headers as Record<string, string>)["Idempotency-Key"],
  );
}

describe("isRetryableStatus", () => {
  it("retries 429 and 5xx only", () => {
    for (const status of [429, 500, 502, 503]) expect(isRetryableStatus(status)).toBe(true);
    for (const status of [400, 401, 403, 404, 409, 422]) expect(isRetryableStatus(status)).toBe(false);
  });
});

describe("readEmailConfig", () => {
  it("is off unless EMAIL_SEND_ENABLED is true", () => {
    for (const value of [undefined, "", "false", "0", "yes"]) {
      expect(readEmailConfig({ ...env, EMAIL_SEND_ENABLED: value })).toEqual({ enabled: false });
    }
    expect(readEmailConfig({ EMAIL_SEND_ENABLED: "false" })).toEqual({ enabled: false });
  });

  it("returns the send config, with the beta date formatted", () => {
    expect(readEmailConfig(env)).toEqual({
      enabled: true,
      apiKey: "test-resend-key",
      from: "Pesto <test.sender@example.com>",
      whatsappNumber: "15550000000",
      betaDate: "October 31",
    });
  });

  it("reports every missing or malformed var when sending is on", () => {
    const result = readEmailConfig({
      EMAIL_SEND_ENABLED: "true",
      NEXT_PUBLIC_WHATSAPP_NUMBER: "+1 555",
      NEXT_PUBLIC_BETA_DATE: "2026-02-31",
    });
    expect(result).toEqual({
      problems: [
        "RESEND_API_KEY is not set",
        "EMAIL_FROM is not set",
        "NEXT_PUBLIC_WHATSAPP_NUMBER must be E.164 digits without the +",
        "NEXT_PUBLIC_BETA_DATE must be a date in YYYY-MM-DD form",
      ],
    });
  });
});

describe("email.sendConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function submitAndSend(response: () => Promise<Response>, app = application) {
    const fetchSpy = vi.fn(response);
    vi.stubGlobal("fetch", fetchSpy);
    const t = setupConvex();
    const { applicationId, refCode } = await submit(t, app);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const doc = await t.run((ctx) => ctx.db.get(applicationId));
    return { fetchSpy, doc, applicationId, refCode };
  }

  it("sends a plain-text email through Resend and marks it sent", async () => {
    const { fetchSpy, doc, applicationId, refCode } = await submitAndSend(async () =>
      Response.json({ id: "test-email-id" }),
    );
    expect(doc?.emailStatus).toBe("sent");
    expect(fetchSpy).toHaveBeenCalledOnce();

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-resend-key");
    expect(headers["Idempotency-Key"]).toBe(`confirmation/${applicationId}/${doc?.updatedAt}`);

    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      from: "Pesto <test.sender@example.com>",
      to: ["test.parent@example.com"],
      subject: "Your Founding Family application",
    });
    expect(body.html).toBeUndefined();
    const prefill = encodeURIComponent(`Hi Pesto! 👋 (${refCode})`);
    expect(body.text).toContain("Test Kid A & Test Kid B");
    expect(body.text).toContain("Test Kid A, age 5");
    expect(body.text).toContain("Test Kid B, 8 or older");
    expect(body.text).toContain(`https://wa.me/15550000000?text=${prefill}`);
    expect(body.text).toContain("Beta day is October 31.");
    expect(body.text).toContain(refCode);
  });

  it("names all 3 kids, without an Oxford comma", async () => {
    const kids = [...application.kids, { name: "Test Kid C", age: "3" }];
    const { fetchSpy } = await submitAndSend(async () => Response.json({ id: "test-email-id" }), {
      ...application,
      kids,
    });
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    const { text } = JSON.parse(init.body as string);
    expect(text).toContain("your application for Test Kid A, Test Kid B & Test Kid C:");
    expect(text).toContain("a 2-minute story for Test Kid A, Test Kid B & Test Kid C to try tonight");
    expect(text).toContain("Test Kid A, age 5");
    expect(text).toContain("Test Kid B, 8 or older");
    expect(text).toContain("Test Kid C, age 3");
  });

  it("marks the email failed, without retrying, when Resend rejects it with a 4xx", async () => {
    const { doc, fetchSpy } = await submitAndSend(async () => new Response("{}", { status: 422 }));
    expect(doc?.emailStatus).toBe("failed");
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("retries a 5xx after ~1 min with the same idempotency key, then sends", async () => {
    const statuses = [503, 200];
    const { doc, fetchSpy } = await submitAndSend(async () =>
      Response.json({}, { status: statuses.shift() }),
    );
    expect(doc?.emailStatus).toBe("sent");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(new Set(idempotencyKeys(fetchSpy)).size).toBe(1);
  });

  it("retries a 429", async () => {
    const statuses = [429, 200];
    const { doc, fetchSpy } = await submitAndSend(async () =>
      Response.json({}, { status: statuses.shift() }),
    );
    expect(doc?.emailStatus).toBe("sent");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("gives up after 3 attempts (~1 min and ~10 min apart) when Resend can't be reached", async () => {
    const calledAt: number[] = [];
    const { doc, fetchSpy } = await submitAndSend(async () => {
      calledAt.push(Date.now());
      throw new TypeError("network down");
    });
    expect(doc?.emailStatus).toBe("failed");
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(new Set(idempotencyKeys(fetchSpy)).size).toBe(1);
    const gaps = calledAt.slice(1).map((at, i) => at - calledAt[i]);
    expect(gaps[0]).toBeGreaterThanOrEqual(60_000);
    expect(gaps[0]).toBeLessThan(2 * 60_000);
    expect(gaps[1]).toBeGreaterThanOrEqual(10 * 60_000);
    expect(gaps[1]).toBeLessThan(11 * 60_000);
  });

  it("stays pending while a retry is scheduled", async () => {
    const fetchSpy = vi.fn(async () => new Response("{}", { status: 500 }));
    vi.stubGlobal("fetch", fetchSpy);
    const t = setupConvex();
    const { applicationId } = await submit(t, application);
    await runDueScheduledFunctions(t);
    expect(fetchSpy).toHaveBeenCalledOnce();
    const doc = await t.run((ctx) => ctx.db.get(applicationId));
    expect(doc?.emailStatus).toBe("pending");
  });

  it("sends once for the latest submit when the same email submits twice quickly", async () => {
    const fetchSpy = vi.fn(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchSpy);
    const t = setupConvex();
    await submit(t, application);
    vi.advanceTimersByTime(1);
    const { applicationId } = await submit(t, {
      ...application,
      goals: ["music"],
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const doc = await t.run((ctx) => ctx.db.get(applicationId));
    expect(doc?.emailStatus).toBe("sent");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(idempotencyKeys(fetchSpy)).toEqual([`confirmation/${applicationId}/${doc?.updatedAt}`]);
  });

  it("doesn't let a retry for an older submit send or overwrite a newer one's status", async () => {
    const t = setupConvex();
    const first = await submit(t, application);
    const oldKey = `confirmation/${first.applicationId}/${Date.now()}`;
    // The older submission's sends keep failing; the newer one's succeed.
    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const key = (init.headers as Record<string, string>)["Idempotency-Key"];
      return new Response("{}", { status: key === oldKey ? 500 : 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    await runDueScheduledFunctions(t); // attempt 1 fails, retry due in ~1 min

    vi.advanceTimersByTime(1);
    await submit(t, { ...application, goals: ["music"] });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const doc = await t.run((ctx) => ctx.db.get(first.applicationId));
    expect(doc?.emailStatus).toBe("sent");
    expect(idempotencyKeys(fetchSpy).filter((key) => key === oldKey)).toHaveLength(1);
  });

  it("marks the email failed, without calling Resend, when the config is broken", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { doc, fetchSpy } = await submitAndSend(async () => Response.json({}));
    expect(doc?.emailStatus).toBe("failed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
