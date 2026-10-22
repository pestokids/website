import { describe, expect, it } from "vitest";
import {
  classifyAttribution,
  readAttribution,
  sourceFromReferrerHost,
  type Attribution,
} from "./attribution";

const LANDING = "https://pestokids.com/apply";

function classify(query: string, referrer = "") {
  return classifyAttribution(readAttribution(`${LANDING}${query}`, referrer));
}

describe("readAttribution", () => {
  it("captures every param plus landing_url and referrer", () => {
    const url =
      `${LANDING}?utm_source=meta&utm_medium=paid_social&utm_campaign=c1&utm_content=ad1` +
      "&utm_term=t&utm_id=123&fbclid=FB&gclid=G&ttclid=T&via=desktop&other=ignored";
    expect(readAttribution(url, "https://l.instagram.com/")).toEqual({
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "c1",
      utm_content: "ad1",
      utm_term: "t",
      utm_id: "123",
      fbclid: "FB",
      gclid: "G",
      ttclid: "T",
      via: "desktop",
      landing_url: url,
      referrer: "https://l.instagram.com/",
    });
  });

  it("drops empty params and an empty referrer", () => {
    expect(readAttribution(`${LANDING}?utm_source=&fbclid=%20`, "")).toEqual({
      landing_url: `${LANDING}?utm_source=&fbclid=%20`,
    });
  });
});

describe("classifyAttribution · §11.1 table", () => {
  describe("row 1: paid", () => {
    it.each([
      ["fbclid", "meta"],
      ["gclid", "google"],
      ["ttclid", "tiktok"],
    ])("%s with no utm_source → paid/%s", (param, source) => {
      expect(classify(`?${param}=abc`)).toEqual({ sourceType: "paid", source, campaign: null });
    });

    it.each(["paid", "cpc", "paid_social", "ads", "PAID_SOCIAL"])(
      "utm_medium=%s → paid with utm_source",
      (medium) => {
        expect(classify(`?utm_source=meta&utm_medium=${medium}&utm_campaign=spring`)).toEqual({
          sourceType: "paid",
          source: "meta",
          campaign: "spring",
        });
      },
    );

    it("prefers utm_source over the click ID", () => {
      expect(classify("?utm_source=instagram&fbclid=abc").source).toBe("instagram");
    });

    it("a click ID wins over an organic utm_medium", () => {
      expect(classify("?utm_source=whatsapp&utm_medium=referral&fbclid=abc").sourceType).toBe(
        "paid",
      );
    });

    it("Meta ad link convention → paid/meta with campaign", () => {
      expect(
        classify(
          "?utm_source=meta&utm_medium=paid_social&utm_campaign=ff_launch&utm_content=ad_a&utm_id=120",
        ),
      ).toEqual({ sourceType: "paid", source: "meta", campaign: "ff_launch" });
    });

    it("paid medium with no utm_source or click ID falls back to the referrer, then unknown", () => {
      expect(classify("?utm_medium=cpc", "https://www.google.com/")).toMatchObject({
        sourceType: "paid",
        source: "google",
      });
      expect(classify("?utm_medium=cpc")).toMatchObject({ sourceType: "paid", source: "unknown" });
    });
  });

  describe("row 2: organic with utm_source", () => {
    it.each([
      ["whatsapp", "referral", "founder_outreach"],
      ["community", "referral", "test-group"],
      ["instagram_bio", "organic_social", "bio"],
      ["influencer", "referral", "test-creator"],
      ["email", "email", "newsletter"],
    ])("utm_source=%s → organic/%s", (source, medium, campaign) => {
      expect(
        classify(`?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`),
      ).toEqual({ sourceType: "organic", source, campaign });
    });

    it("lowercases the source and ignores the referrer", () => {
      expect(classify("?utm_source=WhatsApp", "https://www.facebook.com/")).toEqual({
        sourceType: "organic",
        source: "whatsapp",
        campaign: null,
      });
    });
  });

  describe("row 3: organic from an external referrer", () => {
    it.each([
      ["https://l.instagram.com/?u=x", "instagram"],
      ["https://www.instagram.com/", "instagram"],
      ["android-app://com.instagram.android/", "instagram"],
      ["https://m.facebook.com/", "facebook"],
      ["https://l.facebook.com/l.php", "facebook"],
      ["https://web.whatsapp.com/", "whatsapp"],
      ["https://wa.me/", "whatsapp"],
      ["https://www.google.com/", "google"],
      ["https://www.google.co.in/", "google"],
      ["https://www.linkedin.com/feed/", "linkedin"],
      ["https://lnkd.in/abc", "linkedin"],
      ["https://x.com/", "x"],
      ["https://twitter.com/", "x"],
      ["https://t.co/abc", "x"],
      ["https://www.example-blog.org/post", "example-blog.org"],
    ])("referrer %s → organic/%s", (referrer, source) => {
      expect(classify("", referrer)).toEqual({ sourceType: "organic", source, campaign: null });
    });

    it("ignores a same-site referrer", () => {
      expect(classify("", "https://pestokids.com/")).toEqual({
        sourceType: "direct",
        source: "direct",
        campaign: null,
      });
    });

    it("ignores a malformed referrer", () => {
      expect(classify("", "not a url").sourceType).toBe("direct");
    });
  });

  describe("row 4: direct", () => {
    it("nothing → direct/direct", () => {
      expect(classify("")).toEqual({ sourceType: "direct", source: "direct", campaign: null });
    });
  });

  it("via=desktop doesn't change the source", () => {
    expect(classify("?via=desktop")).toEqual(classify(""));
    expect(classify("?utm_source=whatsapp&via=desktop")).toEqual(classify("?utm_source=whatsapp"));
    expect(classify("?fbclid=abc&via=desktop")).toEqual(classify("?fbclid=abc"));
  });

  it("campaign is utm_campaign even without utm_source", () => {
    const a: Attribution = { utm_campaign: "bio" };
    expect(classifyAttribution(a)).toEqual({
      sourceType: "direct",
      source: "direct",
      campaign: "bio",
    });
  });
});

describe("sourceFromReferrerHost", () => {
  it("doesn't match lookalike hosts", () => {
    expect(sourceFromReferrerHost("notinstagram.com")).toBe("notinstagram.com");
    expect(sourceFromReferrerHost("google.example.com")).toBe("google.example.com");
  });
});
