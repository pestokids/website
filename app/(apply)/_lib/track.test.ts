import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Each event is checked where it leaves the app: at the SDK calls.
const sdk = vi.hoisted(() => ({
  posthog: {
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    identify: vi.fn(),
    get_distinct_id: vi.fn(() => "test-anon-id"),
  },
  lr: { track: vi.fn(), identify: vi.fn() },
}));

vi.mock("posthog-js", () => ({ default: sdk.posthog }));
vi.mock("@linkrunner/web", () => ({ lr: sdk.lr }));
vi.mock("@/lib/config", () => ({
  config: {
    analytics: {
      enabled: true,
      posthogKey: "phc_test",
      posthogHost: "https://test.posthog.example",
      linkrunnerToken: "lr_test",
    },
  },
}));

import { initAnalytics } from "@/lib/analytics";
import { captureAttribution, createDraft, reducer, type Action, type Draft } from "./flow";
import { emailDomain, stepProps, track } from "./track";

function draftWith(...actions: Action[]): Draft {
  return actions.reduce(reducer, createDraft(0));
}

// Obviously fake data only: the repo is public.
const twoKids = draftWith(
  { type: "addKid", name: "Test Kid A" },
  { type: "addKid", name: "Test Kid B" },
  { type: "setAge", kidIndex: 0, age: "5" },
  { type: "setAge", kidIndex: 1, age: "8+" },
  { type: "toggleGoal", slug: "science" },
  { type: "toggleGoal", slug: "music" },
  { type: "toggleAfterSchool", slug: "bedtime_stories" },
  { type: "toggleAfterSchool", slug: "tutors" },
);

const submitted = {
  applicationId: "test-application-id",
  refCode: "PF-TEST",
  email: "test.parent@example.com",
  kidNames: ["Test Kid A", "Test Kid B"],
};

/** The single PostHog capture made by `fn`. */
function captured(fn: () => void) {
  fn();
  expect(sdk.posthog.capture).toHaveBeenCalledTimes(1);
  const [event, properties, options] = sdk.posthog.capture.mock.calls[0];
  return { event, properties, options };
}

beforeAll(async () => {
  vi.stubGlobal("window", { location: new URL("https://pestokids.com/apply") });
  initAnalytics();
  await vi.waitFor(() => expect(sdk.posthog.init).toHaveBeenCalled());
});

beforeEach(() => {
  sdk.posthog.capture.mockClear();
  sdk.posthog.register.mockClear();
  sdk.posthog.identify.mockClear();
  sdk.lr.track.mockClear();
  sdk.lr.identify.mockClear();
});

describe("stepProps", () => {
  it.each([
    ["welcome", 0, { step: "welcome", step_index: 1, kids_count: 0 }],
    ["names", 0, { step: "names", step_index: 2, kids_count: 0 }],
    ["age-1", 2, { step: "age", step_index: 3, kids_count: 2, kid_index: 0 }],
    ["age-2", 2, { step: "age", step_index: 3, kids_count: 2, kid_index: 1 }],
    ["goals", 1, { step: "goals", step_index: 4, kids_count: 1 }],
    ["how", 1, { step: "how", step_index: 5, kids_count: 1 }],
    ["after-school", 1, { step: "after_school", step_index: 6, kids_count: 1 }],
    ["why", 1, { step: "why", step_index: 7, kids_count: 1 }],
    ["email", 1, { step: "email", step_index: 8, kids_count: 1 }],
    ["received", 2, { step: "received", step_index: 9, kids_count: 2 }],
  ] as const)("%s", (step, kids, expected) => {
    expect(stepProps(step, kids)).toEqual(expected);
  });
});

describe("emailDomain", () => {
  it("takes the lowercased part after the last @", () => {
    expect(emailDomain("test.parent@Example.COM")).toBe("example.com");
    expect(emailDomain("test.parent")).toBe("");
  });
});

describe("source super properties", () => {
  it("registers the draft's first-touch source and UTMs", () => {
    const draft = captureAttribution(
      createDraft(0),
      "https://pestokids.com/apply?utm_source=meta&utm_medium=paid_social&utm_campaign=test_campaign&utm_content=test_ad&utm_id=123&fbclid=test-click-id",
      "",
    );
    track.source(draft);
    expect(sdk.posthog.register).toHaveBeenCalledWith({
      sourceType: "paid",
      source: "meta",
      campaign: "test_campaign",
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "test_campaign",
      utm_content: "test_ad",
      utm_id: "123",
    });
  });

  it("registers a direct visit with a null campaign", () => {
    track.source(captureAttribution(createDraft(0), "https://pestokids.com/apply", ""));
    expect(sdk.posthog.register).toHaveBeenCalledWith({
      sourceType: "direct",
      source: "direct",
      campaign: null,
    });
  });

  it("registers nothing without captured attribution (e.g. after submit)", () => {
    track.source(createDraft(0));
    expect(sdk.posthog.register).not.toHaveBeenCalled();
  });
});

describe("funnel events", () => {
  it("ff_step_viewed", () => {
    expect(captured(() => track.stepViewed("age-2", 2))).toEqual({
      event: "ff_step_viewed",
      properties: { step: "age", step_index: 3, kids_count: 2, kid_index: 1 },
      options: undefined,
    });
  });

  it("ff_started, plus Linkrunner flow_started", () => {
    expect(captured(() => track.started(createDraft(0)))).toMatchObject({
      event: "ff_started",
      properties: { step: "welcome", step_index: 1, kids_count: 0 },
    });
    expect(sdk.lr.track).toHaveBeenCalledTimes(1);
    expect(sdk.lr.track).toHaveBeenCalledWith("flow_started", undefined);
  });

  it.each([
    ["names", { step: "names", step_index: 2, kids_count: 2 }],
    ["age-1", { step: "age", step_index: 3, kids_count: 2, kid_index: 0, age: "5" }],
    ["age-2", { step: "age", step_index: 3, kids_count: 2, kid_index: 1, age: "8+" }],
    ["goals", { step: "goals", step_index: 4, kids_count: 2, goals: ["science", "music"] }],
    ["how", { step: "how", step_index: 5, kids_count: 2 }],
    [
      "after-school",
      {
        step: "after_school",
        step_index: 6,
        kids_count: 2,
        after_school: ["bedtime_stories", "tutors"],
      },
    ],
    ["why", { step: "why", step_index: 7, kids_count: 2 }],
  ] as const)("ff_step_completed on %s", (step, properties) => {
    expect(captured(() => track.stepCompleted(step, twoKids))).toEqual({
      event: "ff_step_completed",
      properties,
      options: undefined,
    });
    expect(sdk.lr.track).not.toHaveBeenCalled();
  });

  it.each(["ghost", "chip", "typo"] as const)("ff_email_suggestion_used (%s)", (kind) => {
    expect(
      captured(() => track.emailSuggestionUsed(twoKids, "test.parent@gmail.com", kind)),
    ).toMatchObject({
      event: "ff_email_suggestion_used",
      properties: { step: "email", step_index: 8, kids_count: 2, domain: "gmail.com", kind },
    });
  });

  it("ff_submitted, then identify in PostHog and signup in Linkrunner", () => {
    expect(captured(() => track.submitted(twoKids, submitted))).toEqual({
      event: "ff_submitted",
      properties: {
        step: "email",
        step_index: 8,
        kids_count: 2,
        ages: ["5", "8+"],
        goals: ["science", "music"],
        after_school: ["bedtime_stories", "tutors"],
        email_domain: "example.com",
      },
      options: undefined,
    });
    expect(sdk.posthog.identify).toHaveBeenCalledWith("test-application-id", {
      email: "test.parent@example.com",
    });
    expect(sdk.lr.identify).toHaveBeenCalledWith("test-application-id");
    expect(sdk.lr.track).toHaveBeenCalledTimes(1);
    expect(sdk.lr.track).toHaveBeenCalledWith("signup", { email: "test.parent@example.com" });
    // Captured under the anonymous ID first, so it joins the earlier steps.
    expect(sdk.posthog.capture.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.posthog.identify.mock.invocationCallOrder[0],
    );
  });

  it.each([
    "network",
    "timeout",
    "rate_limited",
    "invalid",
    "invalid_email",
    "disposable_email",
    "undeliverable_email",
  ] as const)(
    "ff_submit_failed (%s), with no identify or signup",
    (reason) => {
      expect(captured(() => track.submitFailed(twoKids, reason))).toMatchObject({
        event: "ff_submit_failed",
        properties: { step: "email", step_index: 8, kids_count: 2, reason },
      });
      expect(sdk.posthog.identify).not.toHaveBeenCalled();
      expect(sdk.lr.track).not.toHaveBeenCalled();
    },
  );

  it("ff_whatsapp_opened, sent as a beacon before the same-tab navigation", () => {
    expect(captured(() => track.whatsappOpened(2))).toEqual({
      event: "ff_whatsapp_opened",
      properties: { step: "received", step_index: 9, kids_count: 2 },
      options: { send_instantly: true, transport: "sendBeacon" },
    });
  });

  it("ff_calendar_added", () => {
    expect(captured(() => track.calendarAdded(1))).toEqual({
      event: "ff_calendar_added",
      properties: { step: "received", step_index: 9, kids_count: 1 },
      options: undefined,
    });
  });
});

describe("desktop events (PostHog only)", () => {
  it("ff_desktop_gate_viewed registers the URL's source first", () => {
    const event = captured(() =>
      track.desktopGateViewed(
        "https://pestokids.com/apply?utm_source=whatsapp&utm_medium=referral&utm_campaign=test_campaign&utm_id=wa-test",
        "",
      ),
    );
    expect(event).toEqual({ event: "ff_desktop_gate_viewed", properties: {}, options: undefined });
    expect(sdk.posthog.register).toHaveBeenCalledWith({
      sourceType: "organic",
      source: "whatsapp",
      campaign: "test_campaign",
      utm_source: "whatsapp",
      utm_medium: "referral",
      utm_campaign: "test_campaign",
      utm_id: "wa-test",
    });
    expect(sdk.posthog.register.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.posthog.capture.mock.invocationCallOrder[0],
    );
    expect(sdk.lr.track).not.toHaveBeenCalled();
  });

  it("ff_desktop_link_copied", () => {
    expect(captured(() => track.desktopLinkCopied())).toEqual({
      event: "ff_desktop_link_copied",
      properties: {},
      options: undefined,
    });
    expect(sdk.lr.track).not.toHaveBeenCalled();
  });
});
