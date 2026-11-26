// @vitest-environment edge-runtime
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readAlertConfig, submittedLabel } from "./alerts";
import { setupConvex, submit } from "./test.setup";

// Obviously fake values only: the repo is public.
const env = {
  APPLICATION_ALERT_EMAIL: "test.team@example.com",
  RESEND_API_KEY: "test-resend-key",
  EMAIL_FROM: "Pesto <test.sender@example.com>",
};

const application = {
  kids: [
    { name: "Test Kid A", age: "5" },
    { name: "Test Kid B", age: "8+" },
  ],
  goals: ["space", "being_kind"],
  afterSchool: ["grandparents"],
  email: "test.parent@example.com",
  attribution: { utm_source: "meta", utm_medium: "paid_social", utm_campaign: "test-campaign" },
};

type Sent = { url: string; headers: Record<string, string>; body: Record<string, unknown> };

/** The Resend calls made with the team's address, ignoring confirmation emails. */
function alerts(fetchSpy: ReturnType<typeof vi.fn>): Sent[] {
  return fetchSpy.mock.calls
    .map(([url, init]) => ({
      url: url as string,
      headers: (init as RequestInit).headers as Record<string, string>,
      body: JSON.parse((init as RequestInit).body as string),
    }))
    .filter((c) => (c.body.to as string[]).includes(env.APPLICATION_ALERT_EMAIL));
}

describe("readAlertConfig", () => {
  it("is off without APPLICATION_ALERT_EMAIL", () => {
    expect(readAlertConfig({ ...env, APPLICATION_ALERT_EMAIL: "" })).toEqual({ enabled: false });
    expect(readAlertConfig({ ...env, APPLICATION_ALERT_EMAIL: " , " })).toEqual({ enabled: false });
  });

  it("accepts several addresses", () => {
    expect(
      readAlertConfig({
        ...env,
        APPLICATION_ALERT_EMAIL: "test.team@example.com, Test.Other@Example.com",
      }),
    ).toMatchObject({ enabled: true, to: ["test.team@example.com", "test.other@example.com"] });
  });

  it("reports what's missing when it's on", () => {
    const result = readAlertConfig({ APPLICATION_ALERT_EMAIL: "not-an-email" });
    expect((result as { problems: string[] }).problems).toHaveLength(3);
  });
});

describe("submittedLabel", () => {
  it("shows Pacific time", () => {
    expect(submittedLabel(Date.parse("2026-11-27T17:14:00Z"))).toBe("Nov 27, 9:14 AM");
  });
});

describe("alerts.sendApplicationAlert", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.parse("2026-11-27T17:14:00Z"));
    // Confirmation emails off, so only alerts reach Resend.
    vi.stubEnv("EMAIL_SEND_ENABLED", "");
    fetchSpy = vi.fn(async () => Response.json({ id: "test-email-id" }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function stubAlertEnv() {
    for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  }

  it("emails the team about each new application, with its answers and source", async () => {
    stubAlertEnv();
    const t = setupConvex();
    const { applicationId, refCode } = await submit(t, application);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const sent = alerts(fetchSpy);
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("https://api.resend.com/emails");
    expect(sent[0].headers["Idempotency-Key"]).toMatch(new RegExp(`^alert/${applicationId}/\\d+$`));
    expect(sent[0].body).toMatchObject({
      from: env.EMAIL_FROM,
      to: [env.APPLICATION_ALERT_EMAIL],
      subject: "New waitlist application: Test Kid A & Test Kid B",
    });
    const text = sent[0].body.text as string;
    expect(text).toContain("New waitlist application, Nov 27, 9:14 AM (Pacific time).");
    expect(text).toContain("Parent email: test.parent@example.com");
    expect(text).toContain("Test Kid A, age 5");
    expect(text).toContain("Test Kid B, 8 or older");
    // Retired options keep their labels.
    expect(text).toContain("Wants them to love: space, being kind");
    expect(text).toContain("After school: Grandparents");
    expect(text).toContain("Source: paid · meta · test-campaign");
    expect(text).toContain(`Application code: ${refCode}`);
  });

  it("sends an Updated alert when the same parent submits again", async () => {
    stubAlertEnv();
    const t = setupConvex();
    await submit(t, application);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    vi.setSystemTime(Date.parse("2026-11-27T18:00:00Z"));
    await submit(t, { ...application, goals: ["music"] });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const sent = alerts(fetchSpy);
    expect(sent).toHaveLength(2);
    expect(sent[1].body.subject).toBe("Updated waitlist application: Test Kid A & Test Kid B");
    expect(sent[1].body.text).toContain("Wants them to love: music");
  });

  it("sends nothing for a spam-trap submit", async () => {
    stubAlertEnv();
    const t = setupConvex();
    await submit(t, { ...application, website: "https://spam.example.com" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does nothing when APPLICATION_ALERT_EMAIL isn't set", async () => {
    vi.stubEnv("RESEND_API_KEY", env.RESEND_API_KEY);
    vi.stubEnv("EMAIL_FROM", env.EMAIL_FROM);
    const t = setupConvex();
    await submit(t, application);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
