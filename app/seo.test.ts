import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveRobots, resolveSitemap } from "next/dist/build/webpack/loaders/metadata/resolve-route-data";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { meta as landing } from "@/content/landing";
import { shareCard } from "./(marketing)/_components/share-card";
import HomePage, { metadata as homeMetadata } from "./(marketing)/page";
import { metadata as privacyMetadata } from "./(marketing)/privacy/page";
import { metadata as termsMetadata } from "./(marketing)/terms/page";
import { GET as llms } from "./llms.txt/route";
import robots from "./robots";
import sitemap from "./sitemap";

// The home page's events go through lib/analytics, which reads the env config.
vi.mock("@/lib/config", () => ({ config: { analytics: { enabled: false } } }));

describe("/robots.txt", () => {
  const text = resolveRobots(robots());

  it("allows everything, and points to the sitemap", () => {
    expect(text).toMatch(/^User-Agent: \*\nAllow: \/\n\n/);
    // /apply stays crawlable so search engines can read its noindex tag.
    expect(text).not.toContain("Disallow");
    expect(text).toMatch(/\nSitemap: https:\/\/pestokids\.com\/sitemap\.xml\n$/);
  });

  it("names each AI crawler, with the same rules", () => {
    const agents = [
      "GPTBot",
      "OAI-SearchBot",
      "ChatGPT-User",
      "ClaudeBot",
      "Claude-SearchBot",
      "PerplexityBot",
      "Google-Extended",
    ];
    const group = agents.map((agent) => `User-Agent: ${agent}\n`).join("");
    expect(text).toContain(`\n${group}Allow: /\n\n`);
  });
});

describe("/sitemap.xml", () => {
  const xml = resolveSitemap(sitemap());

  it("lists the indexed routes and nothing else", () => {
    expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, loc]) => loc)).toEqual([
      "https://pestokids.com/",
      "https://pestokids.com/privacy",
      "https://pestokids.com/terms",
    ]);
  });
});

const llmsResponse = llms();
const llmsText = await llmsResponse.clone().text();

describe("/llms.txt", () => {
  it("is plain text", () => {
    expect(llmsResponse.headers.get("Content-Type")).toBe("text/plain; charset=utf-8");
  });

  it("starts with both names and the one-line description", () => {
    expect(llmsText).toMatch(/^# Pesto \(Pesto Kids\)\n\n> /);
    expect(llmsText).toContain(`> ${landing.description}\n`);
  });

  it("says who it's for and where it stands", () => {
    expect(llmsText).toContain("Kids aged 3 to 8");
    expect(llmsText).toContain("parents");
    expect(llmsText).toContain("private beta");
    expect(llmsText).toContain("Founding Families");
  });

  it("links the key pages", () => {
    for (const url of [
      "https://pestokids.com/",
      "https://pestokids.com/apply",
      "https://pestokids.com/privacy",
      "https://pestokids.com/terms",
    ]) {
      expect(llmsText).toContain(`](${url})`);
    }
  });
});

describe("structured data on /", () => {
  const html = renderToStaticMarkup(createElement(HomePage));
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
  const data = JSON.parse(scripts[0]?.[1] ?? "{}");
  const byType = (type: string) => data["@graph"]?.find((node: { "@type": string }) => node["@type"] === type);

  it("renders one JSON-LD script", () => {
    expect(scripts).toHaveLength(1);
    expect(data["@context"]).toBe("https://schema.org");
  });

  it("describes the Organization under both names", () => {
    expect(byType("Organization")).toMatchObject({
      name: "Pesto",
      alternateName: "Pesto Kids",
      url: "https://pestokids.com/",
      logo: "https://pestokids.com/icon.png",
      email: "hello@pestokids.com",
      contactPoint: { "@type": "ContactPoint", email: "hello@pestokids.com" },
      sameAs: ["https://www.instagram.com/pesto.kids"],
      description: landing.description,
    });
  });

  it("names the WebSite the same way", () => {
    expect(byType("WebSite")).toMatchObject({
      name: "Pesto",
      alternateName: "Pesto Kids",
      url: "https://pestokids.com/",
    });
  });
});

describe("page metadata", () => {
  const pages = [
    { path: "/", metadata: homeMetadata },
    { path: "/privacy", metadata: privacyMetadata },
    { path: "/terms", metadata: termsMetadata },
  ];

  it("gives / the title and description from the copy file", () => {
    expect(homeMetadata).toMatchObject({ title: landing.title, description: landing.description });
  });

  it("gives /privacy and /terms their own titles and descriptions", () => {
    const titles = pages.map(({ metadata }) => metadata.title);
    const descriptions = pages.map(({ metadata }) => metadata.description);
    expect(new Set(titles).size).toBe(3);
    expect(new Set(descriptions).size).toBe(3);
    expect(privacyMetadata.title).toBe("Privacy policy · Pesto");
    expect(termsMetadata.title).toBe("Terms of use · Pesto");
  });

  it.each(pages)("gives $path a canonical URL and the share card, with its alt text", ({ path, metadata }) => {
    const image = { ...shareCard, alt: landing.shareAlt };
    expect(metadata).toMatchObject({
      alternates: { canonical: path },
      openGraph: { url: path, title: metadata.title, images: [image] },
      twitter: { card: "summary_large_image", images: [image] },
    });
  });
});

describe("share card", () => {
  it("is a 1200×630 JPEG, small enough for WhatsApp", async () => {
    const file = readFileSync(new URL(`../public${shareCard.url}`, import.meta.url));
    const { format, width, height } = await sharp(file).metadata();
    expect({ format, width, height }).toEqual({ format: "jpeg", width: shareCard.width, height: shareCard.height });
    expect({ width, height }).toEqual({ width: 1200, height: 630 });
    expect(file.length).toBeLessThan(300 * 1024);
  });
});
