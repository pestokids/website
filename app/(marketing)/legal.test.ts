import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LAST_UPDATED } from "@/content/legal";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";

const pages = [
  { path: "/privacy", Page: PrivacyPage, h1: "Privacy policy", contact: "privacy@pestokids.com" },
  { path: "/terms", Page: TermsPage, h1: "Terms of use", contact: "hello@pestokids.com" },
];

describe.each(pages)("$path", ({ Page, h1, contact }) => {
  const html = renderToStaticMarkup(createElement(Page));

  it("renders its h1", () => {
    expect(html.match(/<h1>(.*?)<\/h1>/g)).toEqual([`<h1>${h1}</h1>`]);
  });

  it("links the contact email", () => {
    expect(html).toContain(`<a href="mailto:${contact}">${contact}</a>`);
  });

  it("fills in the last-updated date", () => {
    expect(html).toContain(`<strong>Last updated:</strong> ${LAST_UPDATED}`);
    expect(html).not.toContain("{{");
  });

  it("sets the “What this means” notes apart", () => {
    expect(html).toMatch(/<p class="legal-note"><em>What this means: /);
  });
});

it("wraps tables in their own scroll box", () => {
  const html = renderToStaticMarkup(createElement(PrivacyPage));
  const tables = html.match(/<table>/g) ?? [];
  const boxes = html.match(/<div class="legal-table"[^>]*><table>/g) ?? [];
  expect(tables).toHaveLength(3);
  expect(boxes).toHaveLength(3);
});

describe("deleting an app account", () => {
  const privacy = renderToStaticMarkup(createElement(PrivacyPage));
  const terms = renderToStaticMarkup(createElement(TermsPage));

  it("has its own heading at /privacy#delete-account, for Google Play", () => {
    expect(privacy).toContain('<h2 id="delete-account">8. Deleting your account</h2>');
    expect(privacy).not.toContain("{#");
  });

  it("says how, and that it takes 14 days", () => {
    const section = privacy.slice(privacy.indexOf('id="delete-account"'), privacy.indexOf("<h2>9."));
    expect(section).toContain("Parents&#39; corner");
    expect(section).toContain('<a href="mailto:privacy@pestokids.com">privacy@pestokids.com</a>');
    expect(section).toContain("within 14 days");
  });

  it("is linked from the short version and from the terms", () => {
    expect(privacy).toContain('<a href="#delete-account">');
    expect(terms).toContain('<a href="/privacy#delete-account">');
  });
});
