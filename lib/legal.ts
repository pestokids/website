import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Marked, Renderer, type Tokens } from "marked";
import { LAST_UPDATED, legalPages, type LegalPageName } from "@/content/legal";

/** An italic paragraph that starts like this is a plain-words summary, not binding text. */
const NOTE_PREFIX = "What this means";

const marked = new Marked({
  gfm: true,
  renderer: {
    paragraph(token) {
      const [only] = token.tokens;
      const isNote = token.tokens.length === 1 && only.type === "em" && only.text.startsWith(NOTE_PREFIX);
      if (!isNote) return false;
      return `<p class="legal-note">${this.parser.parseInline(token.tokens)}</p>\n`;
    },
    // Wide tables scroll inside their own box, never the page. Focusable so
    // keyboard users can scroll it too.
    table(token: Tokens.Table) {
      const label = token.header.map((cell) => cell.text).join(", ");
      const table = Renderer.prototype.table.call(this, token);
      return `<div class="legal-table" role="region" aria-label="${label}" tabindex="0">${table}</div>\n`;
    },
  },
});

/**
 * The page's markdown as HTML, with the "Last updated" date filled in. Read
 * from disk synchronously, so the page is prerendered into static HTML.
 */
export function renderLegal(name: LegalPageName): string {
  const source = readFileSync(join(process.cwd(), "content/legal", legalPages[name].file), "utf8");
  return marked.parse(source.replaceAll("{{LAST_UPDATED}}", LAST_UPDATED), { async: false });
}
