import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import HomePage, { viewport } from "./page";

// The page's events go through lib/analytics, which reads the env config.
vi.mock("@/lib/config", () => ({ config: { analytics: { enabled: false } } }));

const html = renderToStaticMarkup(createElement(HomePage));

describe("/", () => {
  it("has one h1 with the tagline, “why?” highlighted", () => {
    expect(html.match(/<h1[ >]/g)).toHaveLength(1);
    expect(html).toContain(
      '<h1><span>For kids </span><span>who ask </span><span class="why">why?</span></h1>',
    );
  });

  it("links the button to /apply (the query is added in the browser)", () => {
    expect(html).toMatch(/<a class="cta" href="\/apply">Get in early<svg/);
  });

  it("has the four header links", () => {
    expect(html).toContain('<a href="/privacy">Privacy</a>');
    expect(html).toContain('<a href="/terms">Terms</a>');
    expect(html).toContain(
      '<a href="mailto:hello@pestokids.com">Contact<span class="detail">hello@pestokids.com</span></a>',
    );
    expect(html).toContain(
      '<a href="https://www.instagram.com/pesto.kids" target="_blank" rel="me noopener">Instagram<span class="detail">@pesto.kids</span></a>',
    );
  });

  it("has a closed menu button that controls the links", () => {
    expect(html).toMatch(
      /<button class="menu-btn" type="button" aria-expanded="false" aria-controls="landing-links" aria-label="Menu">/,
    );
    expect(html).toContain('<nav class="links" id="landing-links"');
  });

  it("hides the decorative scene from screen readers", () => {
    expect(html).toContain('<div class="stage" aria-hidden="true">');
  });

  it("serves each layer from both art sets, tall first, AVIF before WebP", () => {
    for (const layer of ["sky", "stars", "back", "pesto", "front"]) {
      const picture = html.match(new RegExp(`<div class="layer ${layer}"><picture>(.*?)</picture>`))?.[1];
      expect(picture, layer).toBeDefined();
      const sources = [...picture!.matchAll(/<source ([^>]*)\/?>/g)].map(([, attrs]) => attrs);
      expect(sources[0]).toContain('media="(max-aspect-ratio: 17/20)"');
      expect(sources[0]).toContain('type="image/avif"');
      expect(sources[0]).toContain(`/landing/tall/${layer}-960.avif 960w`);
      expect(sources[1]).toContain('media="(max-aspect-ratio: 17/20)"');
      expect(sources[1]).toContain('type="image/webp"');
      expect(sources[2]).not.toContain("media=");
      expect(sources[2]).toContain(`/landing/wide/${layer}-2400.avif 2400w`);
      expect(picture).toMatch(new RegExp(`<img src="/landing/wide/${layer}-2400.webp"[^>]* alt=""`));
    }
  });

  it("inlines a tiny placeholder for each art set", () => {
    const style = html.match(/<div class="placeholder" style="([^"]*)"/)?.[1] ?? "";
    expect(style).toMatch(/--placeholder-wide:url\(data:image\/webp;base64,/);
    expect(style).toMatch(/--placeholder-tall:url\(data:image\/webp;base64,/);
    expect(style.length).toBeLessThan(1024);
  });

  it("sets the night theme colour", () => {
    expect(viewport.themeColor).toBe("#13235f");
  });
});
