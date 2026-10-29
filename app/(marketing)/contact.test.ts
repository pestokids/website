import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContactPage from "./contact/page";

const html = renderToStaticMarkup(createElement(ContactPage));

describe("/contact", () => {
  it("has one h1", () => {
    expect(html.match(/<h1[ >].*?<\/h1>/g)).toEqual(["<h1>Contact us</h1>"]);
  });

  it("opens an email from the button, with the address shown as text", () => {
    expect(html).toMatch(/<a class="cta" href="mailto:hello@pestokids\.com">Email us<svg/);
    expect(html).toContain('<p class="address">hello@pestokids.com</p>');
    expect(html).toContain('<p class="reply">We usually reply within a day or two.</p>');
  });

  it("links home, privacy and terms", () => {
    const nav = html.match(/<nav class="links"[^>]*>(.*?)<\/nav>/)?.[1] ?? "";
    expect([...nav.matchAll(/<a href="([^"]*)">([^<]*)<\/a>/g)].map(([, href, label]) => [label, href])).toEqual([
      ["Home", "/"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ]);
  });

  it("hides the decorative stars from screen readers", () => {
    expect(html).toContain('<div class="sky" aria-hidden="true">');
  });
});
