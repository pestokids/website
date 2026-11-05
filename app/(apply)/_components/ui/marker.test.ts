import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkedNames } from "./marker";

const render = (text: string, names: readonly string[]) =>
  renderToStaticMarkup(createElement("h1", null, createElement(MarkedNames, { text, names })));

/** The markup of one marked name (the sweep delay is the default). */
const marked = (name: string) => `<span class="day-marker" style="--marker-delay:0.35s">${name}</span>`;

// The longest names the flow accepts (NAME_MAX_LENGTH, 30 letters).
const long1 = "Abcdefghijklmnopqrstuvwxyzabcd";
const long2 = "Zyxwvutsrqponmlkjihgfedcbazyxw";

const NBSP = "\u00a0";
/** The phrase as MarkedNames renders it: nowrap pieces joined by no-break spaces. */
const phrase = (...pieces: string[]) =>
  `<span class="[overflow-wrap:anywhere]">${pieces.map((p) => `<span class="whitespace-nowrap">${p}</span>`).join(NBSP)}</span>`;

describe("MarkedNames", () => {
  it("keeps the names and the punctuation after them together, with no normal break opportunity", () => {
    const html = render("You’re in the running, Meera & Arjun!", ["Meera", "Arjun"]);
    expect(html).toBe(
      `<h1>You’re in the running, ${phrase(`${marked("Meera")}${NBSP}&amp;`, `${marked("Arjun")}!`)}</h1>`,
    );
    // Lays out like one nowrap span: the only spaces inside the phrase are no-break spaces.
    const inside = html.slice(html.indexOf("<span"), html.lastIndexOf("</span>"));
    expect(inside.replace(/<[^>]*>/g, "")).toBe(`Meera${NBSP}&amp;${NBSP}Arjun!`);
  });

  it("can only break after the ampersand, and only when the phrase overflows its line", () => {
    const html = render(`You’re in the running, ${long1} & ${long2}!`, [long1, long2]);
    expect(html).toBe(
      `<h1>You’re in the running, ${phrase(`${marked(long1)}${NBSP}&amp;`, `${marked(long2)}!`)}</h1>`,
    );
  });

  it("keeps each name whole: the marker never wraps", () => {
    const css = readFileSync(new URL("../../apply.css", import.meta.url), "utf8");
    const rule = css.match(/\.day-marker \{[^}]*\}/)?.[0] ?? "";
    expect(rule).toContain("white-space: nowrap;");
  });

  it("glues a single name to the punctuation after it and leaves the rest of the text alone", () => {
    expect(render("How old is Meera?", ["Meera"])).toBe(`<h1>How old is ${phrase(`${marked("Meera")}?`)}</h1>`);
    expect(render("After school, what keeps Meera’s brain busy?", ["Meera’s"])).toBe(
      `<h1>After school, what keeps ${phrase(marked("Meera’s"))} brain busy?</h1>`,
    );
  });

  it("returns the text as is when the names aren't in it", () => {
    expect(render("Where should we send your letter?", ["Meera"])).toBe(
      "<h1>Where should we send your letter?</h1>",
    );
  });
});
