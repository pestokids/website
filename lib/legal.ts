import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Marked, type Token, type Tokens } from "marked";
import { LAST_UPDATED, legalChrome, legalPages, type LegalPageName } from "@/content/legal";

/**
 * A legal page's markdown, split into the parts the page lays out:
 *
 *   # Title                      dropped: the hero has the h1
 *   **Last updated:** …          dropped: the hero has the date
 *   intro paragraphs             → intro
 *   ## The short version         → short (heading, one entry per bullet, and what follows the list)
 *   ## 1. Title {#optional-id}   → sections, each with its plain-words note split out
 */
export type LegalDocument = {
  intro: string;
  short: { title: string; items: string[]; after: string } | null;
  sections: LegalSection[];
};

export type LegalSection = {
  /** The h2's id: `{#id}` from the markdown, or made from the title. */
  id: string;
  number: string;
  /** Plain text. */
  title: string;
  /** The "What this means" note, as inline HTML without its label, or null. */
  note: string | null;
  /** The rest of the section, as HTML. */
  html: string;
};

/** Google Play's account deletion link points here: /privacy#delete-account. */
export const DELETE_ACCOUNT_ID = "delete-account";

/** The account deletion section: orange in the section list on both pages. */
export function isAccountDeletion(section: LegalSection) {
  return section.id === DELETE_ACCOUNT_ID || section.title === "Deleting your account";
}

/** `## 10. Deleting your account {#delete-account}` → number, title and id. */
const NUMBERED = /^(\d+)\.\s+(.*?)(?:\s*\{#([a-z0-9-]+)\})?$/;
const NOTE_PREFIX = new RegExp(`^${legalChrome.noteLabel}:\\s*`);

function escapeAttribute(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const marked = new Marked({
  gfm: true,
  renderer: {
    // Tables stay tables on wide screens. On phones each row becomes a card,
    // and each cell shows its column's name from `data-label`.
    table(token: Tokens.Table) {
      const head = token.header
        .map((cell) => `<th scope="col">${this.parser.parseInline(cell.tokens)}</th>`)
        .join("");
      const rows = token.rows
        .map((row) => {
          const cells = row
            .map((cell, i) => {
              const label = escapeAttribute(token.header[i]?.text ?? "");
              return `<td data-label="${label}">${this.parser.parseInline(cell.tokens)}</td>`;
            })
            .join("");
          return `<tr>${cells}</tr>`;
        })
        .join("\n");
      const table = `<table>\n<thead><tr>${head}</tr></thead>\n<tbody>\n${rows}\n</tbody></table>`;
      return `<div class="legal-table">${table}</div>\n`;
    },
  },
});

const html = (tokens: Token[]) => marked.parser(tokens);

/** A "What this means" note: a paragraph that is one italic run starting with the label. */
function noteOf(token: Token | undefined): string | null {
  if (token?.type !== "paragraph") return null;
  const [only] = (token as Tokens.Paragraph).tokens;
  if ((token as Tokens.Paragraph).tokens.length !== 1 || only.type !== "em") return null;
  const em = only as Tokens.Em;
  if (!NOTE_PREFIX.test(em.text)) return null;
  return marked.parseInline(em.text.replace(NOTE_PREFIX, ""), { async: false });
}

/** Splits the markdown into its parts, with the "Last updated" date filled in. */
export function parseLegal(source: string): LegalDocument {
  const tokens = marked.lexer(source.replaceAll("{{LAST_UPDATED}}", LAST_UPDATED));

  // Group the tokens under their h2.
  const intro: Token[] = [];
  const groups: { heading: Tokens.Heading; body: Token[] }[] = [];
  for (const token of tokens) {
    if (token.type === "space") continue;
    if (token.type === "heading" && (token as Tokens.Heading).depth === 1) continue;
    if (token.type === "paragraph" && token.raw.startsWith("**Last updated:**")) continue;
    if (token.type === "heading" && (token as Tokens.Heading).depth === 2) {
      groups.push({ heading: token as Tokens.Heading, body: [] });
    } else if (groups.length) {
      groups.at(-1)!.body.push(token);
    } else {
      intro.push(token);
    }
  }

  let short: LegalDocument["short"] = null;
  const sections: LegalSection[] = [];
  for (const { heading, body } of groups) {
    const numbered = heading.text.match(NUMBERED);
    if (!numbered) {
      // The short version: one entry per bullet, then whatever follows the list.
      const listAt = body.findIndex((token) => token.type === "list");
      const list = body[listAt] as Tokens.List | undefined;
      short = {
        title: heading.text,
        items: list?.items.map((item) => marked.parseInline(item.text, { async: false })) ?? [],
        after: html(body.slice(listAt + 1)),
      };
      continue;
    }
    const [, number, title, id] = numbered;
    const note = noteOf(body[0]);
    sections.push({
      id: id ?? slugify(title),
      number,
      title,
      note,
      html: html(note === null ? body : body.slice(1)),
    });
  }

  return { intro: html(intro), short, sections };
}

/**
 * A legal page's parts, read from disk synchronously so the page is
 * prerendered into static HTML.
 */
export function readLegal(name: LegalPageName): LegalDocument {
  return parseLegal(readFileSync(join(process.cwd(), "content/legal", legalPages[name].file), "utf8"));
}
