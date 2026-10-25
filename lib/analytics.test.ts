import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Test doubles for both SDKs. `imported` records whether the app ever loaded them.
const sdk = vi.hoisted(() => ({
  imported: { posthog: false, linkrunner: false },
  posthog: {
    init: vi.fn(),
    capture: vi.fn(),
    register: vi.fn(),
    identify: vi.fn(),
    get_distinct_id: vi.fn(() => "test-anon-id"),
  },
  lr: { track: vi.fn(), identify: vi.fn() },
  config: { analytics: { enabled: false } as Record<string, unknown> },
}));

vi.mock("posthog-js", () => {
  sdk.imported.posthog = true;
  return { default: sdk.posthog };
});
vi.mock("@linkrunner/web", () => {
  sdk.imported.linkrunner = true;
  return { lr: sdk.lr };
});
vi.mock("./config", () => ({ config: sdk.config }));

const ENABLED = {
  enabled: true,
  posthogKey: "phc_test",
  posthogHost: "https://test.posthog.example",
  linkrunnerToken: "lr_test",
};

/** A fresh copy of the wrapper (it keeps the loaded SDKs in module state). */
async function freshAnalytics() {
  vi.resetModules();
  return import("./analytics");
}

const loaded = () => vi.waitFor(() => expect(sdk.posthog.init).toHaveBeenCalled());

beforeEach(() => {
  vi.clearAllMocks();
  sdk.imported.posthog = false;
  sdk.imported.linkrunner = false;
  vi.stubGlobal("window", { location: new URL("https://pestokids.com/") });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("with analytics off", () => {
  beforeEach(() => {
    sdk.config.analytics = { enabled: false };
  });

  it("loads neither SDK and sends nothing", async () => {
    const a = await freshAnalytics();
    a.initAnalytics();
    a.capture("ff_started", { step: "welcome" });
    a.registerSuperProperties({ source: "meta" });
    a.trackConversion("flow_started");
    a.identifyApplicant("test-application-id", "test.parent@example.com");
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(sdk.imported).toEqual({ posthog: false, linkrunner: false });
    for (const fn of [...Object.values(sdk.posthog), ...Object.values(sdk.lr)]) {
      expect(fn).not.toHaveBeenCalled();
    }
    expect(a.distinctId()).toBeUndefined();
  });
});

describe("with analytics on", () => {
  beforeEach(() => {
    sdk.config.analytics = ENABLED;
  });

  it("inits PostHog once, without pageviews or autocapture, masking replay inputs, capturing exceptions and web vitals", async () => {
    const a = await freshAnalytics();
    a.initAnalytics();
    a.initAnalytics();
    await loaded();

    expect(sdk.posthog.init).toHaveBeenCalledTimes(1);
    expect(sdk.posthog.init).toHaveBeenCalledWith("phc_test", {
      api_host: "https://test.posthog.example",
      capture_pageview: false,
      persistence: "localStorage+cookie",
      autocapture: false,
      rageclick: false,
      capture_dead_clicks: false,
      session_recording: { maskAllInputs: true },
      capture_exceptions: { capture_unhandled_errors: true, capture_unhandled_rejections: true },
      capture_performance: { web_vitals: true, web_vitals_allowed_metrics: ["LCP", "CLS", "INP"] },
    });
  });

  it("loads nothing until initAnalytics (called when the page is idle)", async () => {
    const a = await freshAnalytics();
    a.capture("landing_viewed", { layout: "tall" });
    a.trackConversion("flow_started");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sdk.posthog.init).not.toHaveBeenCalled();
    expect(sdk.posthog.capture).not.toHaveBeenCalled();
    expect(sdk.lr.track).not.toHaveBeenCalled();
    a.initAnalytics();
    await loaded();
    await vi.waitFor(() => expect(sdk.lr.track).toHaveBeenCalledWith("flow_started", undefined));
    expect(sdk.posthog.capture.mock.calls[0][0]).toBe("landing_viewed");
  });

  it("queues calls made before the SDKs load and replays them in order", async () => {
    const a = await freshAnalytics();
    a.registerSuperProperties({ source: "meta" });
    a.capture("ff_step_viewed", { step: "welcome" });
    a.capture("ff_started", { step: "welcome" });
    expect(sdk.posthog.capture).not.toHaveBeenCalled();
    a.initAnalytics();
    await loaded();
    await vi.waitFor(() => expect(sdk.posthog.capture).toHaveBeenCalledTimes(2));

    const order = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder;
    expect(order(sdk.posthog.init)[0]).toBeLessThan(order(sdk.posthog.register)[0]);
    expect(order(sdk.posthog.register)[0]).toBeLessThan(order(sdk.posthog.capture)[0]);
    expect(sdk.posthog.capture.mock.calls.map((c) => c[0])).toEqual(["ff_step_viewed", "ff_started"]);
  });

  it("a queued event keeps the page and time it happened on, not those of the replay", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-25T10:00:00Z") });
    const a = await freshAnalytics();
    a.capture("landing_cta_clicked", { location: "hero" }, { transport: "sendBeacon" });
    // A client-side navigation to /apply, then the page goes idle.
    vi.stubGlobal("window", { location: new URL("https://pestokids.com/apply?utm_source=test") });
    vi.setSystemTime(new Date("2026-10-25T10:00:05Z"));
    a.initAnalytics();
    await vi.waitFor(() => expect(sdk.posthog.capture).toHaveBeenCalledTimes(1));
    vi.useRealTimers();

    expect(sdk.posthog.capture).toHaveBeenCalledWith(
      "landing_cta_clicked",
      { $current_url: "https://pestokids.com/", $pathname: "/", location: "hero" },
      { timestamp: new Date("2026-10-25T10:00:00Z"), transport: "sendBeacon" },
    );
  });

  it("registers via from the arrival URL before replaying, so every event carries it", async () => {
    vi.stubGlobal("window", { location: new URL("https://pestokids.com/?via=inv-test&utm_source=x") });
    const a = await freshAnalytics();
    a.capture("landing_viewed", {});
    // The visitor moves on before the SDKs load; via still comes from where they arrived.
    vi.stubGlobal("window", { location: new URL("https://pestokids.com/privacy") });
    a.initAnalytics();
    await vi.waitFor(() => expect(sdk.posthog.capture).toHaveBeenCalled());

    expect(sdk.posthog.register).toHaveBeenCalledTimes(1);
    expect(sdk.posthog.register).toHaveBeenCalledWith({ via: "inv-test" });
    expect(sdk.posthog.register.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.posthog.capture.mock.invocationCallOrder[0],
    );
  });

  it("registers nothing without via, so an earlier visit's via is kept", async () => {
    const a = await freshAnalytics();
    a.initAnalytics();
    await loaded();
    expect(sdk.posthog.register).not.toHaveBeenCalled();
  });

  it("captures synchronously once loaded, passing capture options through", async () => {
    const a = await freshAnalytics();
    a.initAnalytics();
    await loaded();
    a.capture("ff_whatsapp_opened", { step: "received" }, { transport: "sendBeacon" });
    expect(sdk.posthog.capture).toHaveBeenCalledWith(
      "ff_whatsapp_opened",
      { step: "received" },
      { transport: "sendBeacon" },
    );
  });

  it("identifies the applicant in PostHog, then in Linkrunner, then tracks the signup", async () => {
    const a = await freshAnalytics();
    a.initAnalytics();
    await loaded();
    a.identifyApplicant("test-application-id", "test.parent@example.com");

    expect(sdk.posthog.identify).toHaveBeenCalledWith("test-application-id", {
      email: "test.parent@example.com",
    });
    expect(sdk.lr.identify).toHaveBeenCalledWith("test-application-id");
    expect(sdk.lr.track).toHaveBeenCalledWith("signup", { email: "test.parent@example.com" });
    expect(sdk.lr.identify.mock.invocationCallOrder[0]).toBeLessThan(
      sdk.lr.track.mock.invocationCallOrder[0],
    );
  });

  it("sends Linkrunner conversions", async () => {
    const a = await freshAnalytics();
    a.trackConversion("flow_started");
    a.initAnalytics();
    await vi.waitFor(() => expect(sdk.lr.track).toHaveBeenCalledWith("flow_started", undefined));
  });

  it("returns PostHog's distinct ID only once loaded", async () => {
    const a = await freshAnalytics();
    expect(a.distinctId()).toBeUndefined();
    a.initAnalytics();
    await loaded();
    expect(a.distinctId()).toBe("test-anon-id");
  });

  it("never throws into the app when an SDK call fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    sdk.posthog.capture.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const a = await freshAnalytics();
    a.initAnalytics();
    await loaded();
    expect(() => a.capture("ff_started", {})).not.toThrow();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does nothing on the server", async () => {
    vi.unstubAllGlobals();
    const a = await freshAnalytics();
    a.initAnalytics();
    a.capture("ff_started", {});
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(sdk.imported).toEqual({ posthog: false, linkrunner: false });
  });
});
