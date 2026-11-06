import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LAST_UPDATED } from "@/content/legal";
import PrivacyPage, { viewport } from "./privacy/page";
import TermsPage from "./terms/page";

// The header's events go through lib/analytics, which reads the env config.
vi.mock("@/lib/config", () => ({ config: { analytics: { enabled: false } } }));

const privacy = renderToStaticMarkup(createElement(PrivacyPage));
const terms = renderToStaticMarkup(createElement(TermsPage));

/** Visible text of an HTML fragment, with tags removed and entities decoded. */
const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&");

/** The HTML of the section whose h2 has this id, up to the next section. */
function section(html: string, id: string) {
  const start = html.lastIndexOf("<section", html.indexOf(`<h2 id="${id}"`));
  return html.slice(start, html.indexOf("</section>", start));
}

const pages = [
  { path: "/privacy", file: "privacy.md", html: privacy, h1: "Privacy policy", accent: "policy", email: "privacy@pestokids.com" },
  { path: "/terms", file: "terms.md", html: terms, h1: "Terms of use", accent: "of use", email: "hello@pestokids.com" },
];

describe.each(pages)("$path", ({ path, file, html, h1, accent, email }) => {
  it("has one h1, in the hero, with the second part highlighted", () => {
    const h1s = html.match(/<h1[ >].*?<\/h1>/g) ?? [];
    expect(h1s).toHaveLength(1);
    expect(text(h1s[0] ?? "")).toBe(h1);
    expect(h1s[0]).toContain(`<span class="legal-accent">${accent}</span>`);
  });

  it("shows the date in the hero chip, not in the body, and fills every placeholder", () => {
    expect(html).toContain(`<p class="legal-chip">Updated ${LAST_UPDATED}</p>`);
    expect(html).not.toContain("Last updated");
    expect(html).not.toContain("{{");
    expect(html).not.toContain("{#");
  });

  it("links every email address in the text", () => {
    const inMarkdown = readFileSync(`content/legal/${file}`, "utf8").match(/[a-z]+@pestokids\.com/g) ?? [];
    const article = html.slice(html.indexOf("<article"), html.indexOf("</article>"));
    const linked = [...article.matchAll(/<a href="mailto:([^"]+)">([^<]+)<\/a>/g)].filter(([, to, label]) => to === label);
    expect(inMarkdown.length).toBeGreaterThan(0);
    expect(linked.map(([, to]) => to)).toEqual(inMarkdown);
  });

  it("ends with the email button for this page", () => {
    expect(html).toContain(`<a class="legal-cta" href="mailto:${email}">${email}</a>`);
  });

  it("marks the current page in the header and the footer", () => {
    const current = html.match(/<a [^>]*aria-current="page"[^>]*>/g) ?? [];
    expect(current).toHaveLength(2);
    for (const link of current) expect(link).toContain(`href="${path}"`);
  });

  it("puts the “What this means” notes in Pesto's bubbles, with the label once", () => {
    expect(html).toMatch(
      /<div class="legal-note">.*?<p><span class="legal-note-label">What this means<span class="sr-only">:<\/span><\/span> <span class="legal-note-text">/,
    );
    expect(html).not.toContain("What this means:");
  });

  it("gives every numbered section a heading with its number as text, and lists it", () => {
    const headings = [...html.matchAll(/<h2 id="([a-z0-9-]+)">(.*?)<\/h2>/g)].filter(([, id]) => id !== "short-version");
    expect(headings.length).toBeGreaterThan(15);
    headings.forEach(([, id, inner], i) => {
      expect(text(inner)).toMatch(new RegExp(`^${i + 1}\\. \\S`));
      // In the phone list and in the desktop sidebar.
      const lists = html.match(/<ol class="legal-toc-list">.*?<\/ol>/g) ?? [];
      expect(lists).toHaveLength(2);
      for (const list of lists) expect(list).toContain(`href="#${id}"`);
    });
  });
});

describe("tables", () => {
  const tables = privacy.match(/<table>[\s\S]*?<\/table>/g) ?? [];

  it("the privacy policy has 4", () => {
    expect(tables).toHaveLength(4);
  });

  it("labels every cell with its column, for the phone layout", () => {
    for (const table of tables) {
      const headers = [...table.matchAll(/<th scope="col">(.*?)<\/th>/g)].map(([, h]) => text(h));
      const rows = [...table.matchAll(/<tr>(<td.*?)<\/tr>/g)];
      expect(rows.length).toBeGreaterThan(0);
      for (const [, row] of rows) {
        const labels = [...row.matchAll(/<td data-label="([^"]*)">/g)].map(([, label]) => text(label));
        expect(labels).toEqual(headers);
      }
    }
  });
});

describe("links", () => {
  it("privacy: “Delete your account” in the short version", () => {
    const short = privacy.slice(privacy.indexOf('class="legal-short"'), privacy.indexOf("</section>", privacy.indexOf('class="legal-short"')));
    expect(short).toContain('<a href="#delete-account">Delete your account</a>');
  });

  it("terms: “Privacy Policy” in sections 1 and 17, and “Deleting your account” in section 7", () => {
    const [one, seven, seventeen] = [1, 7, 17].map((n) => {
      const id = terms.match(new RegExp(`<h2 id="([a-z0-9-]+)"><span class="legal-num">${n}<`))?.[1];
      return section(terms, id ?? "missing");
    });
    expect(one).toContain('<a href="/privacy">Privacy Policy</a>');
    expect(seventeen).toContain('<a href="/privacy">Privacy Policy</a>');
    expect(seven).toContain('<a href="/privacy#delete-account">Deleting your account</a>');
  });
});

describe("deleting an app account", () => {
  const heading = privacy.match(/<h2 id="delete-account">(.*?)<\/h2>/)?.[1] ?? "";
  const deleting = section(privacy, "delete-account");

  it("has its own heading at /privacy#delete-account, for Google Play", () => {
    expect(text(heading)).toBe("10. Deleting your account");
    expect(privacy.match(/id="delete-account"/g)).toHaveLength(1);
  });

  it("is the highlighted card", () => {
    expect(deleting).toMatch(/^<section class="legal-section is-delete" aria-labelledby="delete-account">/);
  });

  it("says how, in Parents Area or by email, and that it takes 14 days", () => {
    expect(deleting).toContain("Parents Area");
    expect(deleting).toContain('<a href="mailto:privacy@pestokids.com">privacy@pestokids.com</a>');
    expect(deleting).toContain("within 14 days");
  });

  it("no longer says “Parents' corner” on either page", () => {
    expect(text(privacy + terms)).not.toMatch(/Parents' corner/i);
  });
});

it("prints the markdown word for word: every line of text is on the page", () => {
  for (const [file, html] of [
    ["privacy.md", privacy],
    ["terms.md", terms],
  ] as const) {
    const page = text(html).replace(/\s+/g, " ");
    const source = readFileSync(`content/legal/${file}`, "utf8");
    for (const line of source.split("\n")) {
      // Each table cell, list item and paragraph, without markdown syntax.
      const plain = line
        .replace(/^#+ |^- |^\| | \|$/g, "")
        .replace(/\{#[a-z-]+\}/, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\*\*|\*/g, "")
        .replace(/^What this means: /, "");
      if (!plain.trim() || plain.startsWith("---") || plain.startsWith("Last updated") || /^# /.test(line)) continue;
      for (const cell of plain.split(" | ")) {
        // The note's first letter is capitalised by CSS only, so compare from the second.
        expect(page, `${file}: ${cell}`).toContain(cell.trim().slice(1));
      }
    }
  }
});

it("tints the browser bars with the night sky, like the landing page", () => {
  expect(viewport.themeColor).toBe("#13235f");
});
