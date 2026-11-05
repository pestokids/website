import { describe, expect, it } from "vitest";
import {
  ageOptions,
  afterSchoolOptions,
  goalOptions,
  pesto,
  pestoAfterSchoolLine,
  pestoAgeLine,
  pestoCheckInLine,
  pestoGoalLine,
  pestoNthLine,
  retiredAfterSchoolOptions,
  retiredGoalOptions,
  welcome,
  type CheckInScreen,
} from "./apply";

describe("Pesto's lines", () => {
  it("has a line for every age", () => {
    for (const age of ageOptions) expect(pestoAgeLine(age)).toMatch(new RegExp(`^${age.replace("+", "\\+")}!`));
    expect(pestoAgeLine("5")).toBe("5! A great age for stories.");
  });

  it("reacts to every offered goal with its own line", () => {
    const lines = goalOptions.map((o) => pestoGoalLine(o.slug, 1));
    expect(new Set(lines).size).toBe(goalOptions.length);
    expect(lines).not.toContain(pesto.goals.fallback);
    expect(pestoGoalLine("animals", 2)).toBe("Animals! Birds are my favourite. Obviously.");
  });

  it("says “That’s three!” on the third goal, whichever it is", () => {
    expect(pestoGoalLine("space", 3)).toBe("That’s three! Perfect.");
    expect(pestoGoalLine("the_world", 3)).toBe("That’s three! Perfect.");
  });

  it("falls back to a general line for retired goals", () => {
    for (const o of retiredGoalOptions) expect(pestoGoalLine(o.slug, 1)).toBe(pesto.goals.fallback);
  });

  it("reacts to every offered after-school option with its own line", () => {
    const lines = afterSchoolOptions.map((o) => pestoAfterSchoolLine(o.slug));
    expect(new Set(lines).size).toBe(afterSchoolOptions.length);
    expect(lines).not.toContain(pesto.afterSchool.fallback);
    expect(pestoAfterSchoolLine("grandparents")).toBe("Grandparents! The best storytellers.");
    for (const o of retiredAfterSchoolOptions) {
      expect(pestoAfterSchoolLine(o.slug)).toBe(pesto.afterSchool.fallback);
    }
  });

  it("has a check-in line for every screen", () => {
    const screens: CheckInScreen[] = [
      "welcome",
      "names",
      "age",
      "goals",
      "how",
      "after-school",
      "why",
      "email",
    ];
    for (const screen of screens) expect(pestoCheckInLine(screen)).toBeTruthy();
    expect(pestoCheckInLine("age")).toBe("Take your time!");
  });

  it("goes round a list of lines, one per tap", () => {
    const { taps } = pesto.welcome;
    expect(pestoNthLine(taps, 0)).toBe(taps[0]);
    expect(pestoNthLine(taps, taps.length)).toBe(taps[0]);
    expect(pestoNthLine(taps, taps.length + 2)).toBe(taps[2]);
  });

  it("personalises the received cheers for 1 and 2 kids", () => {
    const one = { kidNames: ["Test Kid A"], names: "Test Kid A", possessive: "Test Kid A’s", plural: false };
    const two = {
      kidNames: ["Test Kid A", "Test Kid B"],
      names: "Test Kid A & Test Kid B",
      possessive: "their",
      plural: true,
    };
    expect(pesto.received.cheers(one)[2]).toBe("Test Kid A is in!");
    expect(pesto.received.cheers(two)[2]).toBe("Test Kid A & Test Kid B are in!");
  });

  it("types out names and typos as said", () => {
    expect(pesto.names.heard("Test Kid A")).toBe("Test Kid A! What a lovely name.");
    expect(pesto.email.typo("gmial.com", "gmail.com")).toBe("Hmm, gmial.com? Did you mean gmail.com?");
  });
});

describe("welcome copy", () => {
  it("shows 25 spots in the sub line and the facts, and the close date from config", () => {
    expect(welcome.sub).toBe("Stories your kids talk back to. Only 25 Founding Family spots left.");
    expect(welcome.facts("Nov 8")).toEqual([
      { value: "3 min", label: "to apply" },
      { value: "25", label: "spots left", hot: true },
      { value: "Nov 8", label: "closes" },
    ]);
    expect(welcome.tagline.lines.join(" ")).toBe("Interactive storybook for young kids");
  });
});
