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
      linkrunnerToken: "lr_test",
    },
  },
}));

import { initAnalytics } from "@/lib/analytics";
import { markLandingSeen, screenBucket, SEEN_KEY, track, visitProps, type View } from "./track";

// Made-up campaign values only: the repo is public.
const SHARED =
  "https://pestokids.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=test_campaign" +
  "&utm_content=test_ad&utm_term=test_term&utm_id=test-1&fbclid=test-fbclid&via=inv-test&step=email";

const sharedSource = {
  sourceType: "paid",
  source: "meta",
  campaign: "test_campaign",
  referrer: "https://l.facebook.com/",
  utm_source: "meta",
  utm_medium: "paid_social",
  utm_campaign: "test_campaign",
  utm_content: "test_ad",
  utm_term: "test_term",
  utm_id: "test-1",
  fbclid: "test-fbclid",
  via: "inv-test",
};

const phone: View = {
  landingUrl: SHARED,
  referrer: "https://l.facebook.com/",
  tall: true,
  width: 390,
  height: 844,
  returning: false,
};

/** The single PostHog capture made by `fn`. */
function captured(fn: () => void) {
  fn();
  expect(sdk.posthog.capture).toHaveBeenCalledTimes(1);
  const [event, properties, options] = sdk.posthog.capture.mock.calls[0];
  return { event, properties, options };
}

beforeAll(async () => {
  vi.stubGlobal("window", { location: new URL("https://pestokids.com/") });
  initAnalytics();
  await vi.waitFor(() => expect(sdk.posthog.init).toHaveBeenCalled());
});

beforeEach(() => {
  sdk.posthog.capture.mockClear();
  sdk.lr.track.mockClear();
});

describe("landing_viewed", () => {
  it("a shared link on a phone: layout, screen, returning and the full source", () => {
    expect(captured(() => track.viewed(phone))).toEqual({
      event: "landing_viewed",
      properties: { layout: "tall", screen: "phone", returning: false, ...sharedSource },
      options: undefined,
    });
  });

  it("a typed URL on a laptop, coming back", () => {
    const view = { ...phone, landingUrl: "https://pestokids.com/", referrer: "", tall: false };
    expect(captured(() => track.viewed({ ...view, width: 1440, height: 900, returning: true }))).toEqual({
      event: "landing_viewed",
      properties: {
        layout: "wide",
        screen: "laptop",
        returning: true,
        sourceType: "direct",
        source: "direct",
        campaign: null,
        referrer: null,
      },
      options: undefined,
    });
  });

  it("from an AI assistant: sourceType ai", () => {
    const view = { ...phone, landingUrl: "https://pestokids.com/", referrer: "https://chatgpt.com/" };
    expect(captured(() => track.viewed(view)).properties).toMatchObject({
      sourceType: "ai",
      source: "chatgpt",
      referrer: "https://chatgpt.com/",
    });
  });

  it("an investor link keeps via and stays direct", () => {
    const view = { ...phone, landingUrl: "https://pestokids.com/?via=inv-test", referrer: "" };
    expect(captured(() => track.viewed(view)).properties).toMatchObject({
      sourceType: "direct",
      source: "direct",
      via: "inv-test",
    });
  });

  it("sends no Linkrunner events", () => {
    track.viewed(phone);
    expect(sdk.lr.track).not.toHaveBeenCalled();
  });
});

describe("landing_cta_clicked", () => {
  it("names the button and carries the same source properties", () => {
    expect(captured(() => track.ctaClicked("hero", SHARED, "https://l.facebook.com/"))).toEqual({
      event: "landing_cta_clicked",
      properties: { location: "hero", ...sharedSource },
      options: undefined,
    });
  });
});

describe("landing_menu_opened", () => {
  it("has no properties of its own", () => {
    expect(captured(() => track.menuOpened())).toEqual({
      event: "landing_menu_opened",
      properties: {},
      options: undefined,
    });
  });
});

describe("landing_link_clicked", () => {
  it.each(["privacy", "terms", "contact", "instagram"] as const)("%s", (link) => {
    expect(captured(() => track.linkClicked(link))).toEqual({
      event: "landing_link_clicked",
      properties: { link },
      options: undefined,
    });
  });
});

describe("visitProps", () => {
  it("drops params that aren't attribution", () => {
    expect(visitProps(SHARED, "")).not.toHaveProperty("step");
  });
});

describe("screenBucket", () => {
  it.each([
    [344, 882, "phone"],
    [375, 667, "phone"],
    [390, 844, "phone"],
    [844, 390, "phone"],
    [744, 1133, "tablet"],
    [820, 1180, "tablet"],
    [1180, 820, "tablet"],
    [884, 1104, "tablet"],
    [1104, 884, "tablet"],
    [1280, 800, "laptop"],
    [1440, 900, "laptop"],
    [1000, 1000, "tablet"],
    [1920, 1080, "desktop"],
    [2560, 1440, "desktop"],
  ] as const)("%i×%i → %s", (width, height, bucket) => {
    expect(screenBucket(width, height)).toBe(bucket);
  });
});

describe("markLandingSeen", () => {
  function memoryStorage() {
    const data: Record<string, string> = {};
    return {
      data,
      getItem: (key: string) => data[key] ?? null,
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
    };
  }

  it("is false the first time, true after", () => {
    const storage = memoryStorage();
    expect(markLandingSeen(storage)).toBe(false);
    expect(storage.data[SEEN_KEY]).toBe("1");
    expect(markLandingSeen(storage)).toBe(true);
  });

  it("counts a visit as new when storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(markLandingSeen(blocked)).toBe(false);
    expect(markLandingSeen(null)).toBe(false);
  });
});
