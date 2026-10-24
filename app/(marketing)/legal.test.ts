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
  expect(tables).toHaveLength(2);
  expect(boxes).toHaveLength(2);
});
