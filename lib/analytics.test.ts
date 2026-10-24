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
  vi.stubGlobal("window", {});
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

  it("inits PostHog once, without pageviews or autocapture, masking replay inputs, capturing exceptions", async () => {
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
    });
  });

  it("queues calls made before the SDKs load and replays them in order", async () => {
    const a = await freshAnalytics();
    a.registerSuperProperties({ source: "meta" });
    a.capture("ff_step_viewed", { step: "welcome" });
    a.capture("ff_started", { step: "welcome" });
    expect(sdk.posthog.capture).not.toHaveBeenCalled();
    await loaded();
    await vi.waitFor(() => expect(sdk.posthog.capture).toHaveBeenCalledTimes(2));

    const order = (fn: { mock: { invocationCallOrder: number[] } }) => fn.mock.invocationCallOrder;
    expect(order(sdk.posthog.init)[0]).toBeLessThan(order(sdk.posthog.register)[0]);
    expect(order(sdk.posthog.register)[0]).toBeLessThan(order(sdk.posthog.capture)[0]);
    expect(sdk.posthog.capture.mock.calls.map((c) => c[0])).toEqual(["ff_step_viewed", "ff_started"]);
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
