import { describe, expect, it } from "vitest";
import * as landing from "./landing";
import { cta, header, logo, meta, tagline } from "./landing";

describe("landing copy", () => {
  it("has a title under 60 characters that names Pesto", () => {
    expect(meta.title.length).toBeLessThan(60);
    expect(meta.title).toContain("Pesto");
  });

  it("has a description under 155 characters that names Pesto and Pesto Kids", () => {
    expect(meta.description.length).toBeLessThan(155);
    expect(meta.description).toMatch(/^Pesto\b/);
    expect(meta.description).toContain("Pesto Kids");
  });

  it("has alt text for the share card that reads the wordmark and names Pesto", () => {
    expect(meta.shareAlt).toContain("“pesto”");
    expect(meta.shareAlt).toMatch(/\bPesto\b/);
  });

  it("reads the tagline as one sentence", () => {
    expect([...tagline.lines, tagline.highlight].join(" ")).toBe("For kids who ask why?");
  });

  it("sends the button to /apply", () => {
    expect(cta).toEqual({ label: "Get in early", href: "/apply" });
  });

  it("links the logo home", () => {
    expect(logo.href).toBe("/");
  });

  it("has the four header links, in order", () => {
    expect(header.links).toEqual([
      { id: "privacy", label: "Privacy", href: "/privacy" },
      { id: "terms", label: "Terms", href: "/terms" },
      { id: "contact", label: "Contact", href: "mailto:hello@pestokids.com", detail: "hello@pestokids.com" },
      {
        id: "instagram",
        label: "Instagram",
        href: "https://www.instagram.com/pesto.kids",
        detail: "@pesto.kids",
        external: true,
      },
    ]);
  });

  it("never names the legal company", () => {
    const text = JSON.stringify(landing);
    expect(text).not.toMatch(/\b(Ltd|Limited|LLP|LLC|Inc|Pvt|GmbH|Corp)\b/i);
  });
});
