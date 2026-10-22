import { describe, expect, it, vi } from "vitest";

// lib/config validates process.env at import; give it a valid env first.
vi.hoisted(() => {
  Object.assign(process.env, {
    NEXT_PUBLIC_BETA_DATE: "2026-10-31",
    NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE: "2026-11-30",
    NEXT_PUBLIC_WHATSAPP_NUMBER: "15555550100",
    NEXT_PUBLIC_CONVEX_URL: "http://127.0.0.1:3210",
    NEXT_PUBLIC_ANALYTICS_ENABLED: "",
  });
});

import { ConfigError, parseIsoDate, parsePublicEnv, type RawPublicEnv } from "./config";

const valid: RawPublicEnv = {
  NEXT_PUBLIC_BETA_DATE: "2026-10-31",
  NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE: "2026-11-30",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "15555550100",
  NEXT_PUBLIC_CONVEX_URL: "https://example.convex.cloud",
};

describe("parsePublicEnv", () => {
  it("parses a valid env and formats the dates", () => {
    const config = parsePublicEnv(valid);
    expect(config.betaDate).toEqual({ iso: "2026-10-31", short: "Oct 31", long: "October 31" });
    expect(config.admissionsCloseDate.short).toBe("Nov 30");
    expect(config.whatsappNumber).toBe("15555550100");
    expect(config.analytics).toEqual({ enabled: false });
  });

  it("fails listing every missing required var", () => {
    expect(() => parsePublicEnv({})).toThrow(ConfigError);
    try {
      parsePublicEnv({});
    } catch (e) {
      const message = (e as Error).message;
      for (const key of [
        "NEXT_PUBLIC_BETA_DATE",
        "NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE",
        "NEXT_PUBLIC_WHATSAPP_NUMBER",
        "NEXT_PUBLIC_CONVEX_URL",
      ]) {
        expect(message).toContain(key);
      }
    }
  });

  it("rejects malformed values", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_BETA_DATE: "31/10/2026" })).toThrow(
      /NEXT_PUBLIC_BETA_DATE/,
    );
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_WHATSAPP_NUMBER: "+15555550100" })).toThrow(
      /NEXT_PUBLIC_WHATSAPP_NUMBER/,
    );
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_ANALYTICS_ENABLED: "yes" })).toThrow(
      /NEXT_PUBLIC_ANALYTICS_ENABLED/,
    );
  });

  it("requires the analytics keys only when analytics is enabled", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_ANALYTICS_ENABLED: "true" })).toThrow(
      /NEXT_PUBLIC_POSTHOG_KEY[\s\S]*NEXT_PUBLIC_POSTHOG_HOST[\s\S]*NEXT_PUBLIC_LINKRUNNER_TOKEN/,
    );
    const config = parsePublicEnv({
      ...valid,
      NEXT_PUBLIC_ANALYTICS_ENABLED: "true",
      NEXT_PUBLIC_POSTHOG_KEY: "phc_test",
      NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
      NEXT_PUBLIC_LINKRUNNER_TOKEN: "lr_test",
    });
    expect(config.analytics.enabled).toBe(true);
  });
});

describe("parseIsoDate", () => {
  it("rejects impossible dates", () => {
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
  });
});
