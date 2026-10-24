import { describe, expect, it } from "vitest";
import {
  ATTRIBUTION_VALUE_MAX_LENGTH,
  cleanAttribution,
  DISPOSABLE_EMAIL_REASON,
  isValidEmail,
  normaliseEmail,
  validateApplication,
  type ApplicationInput,
} from "./application";

// Obviously fake data only: the repo is public.
const valid: ApplicationInput = {
  kids: [
    { name: "test kid a", age: "5" },
    { name: "Test Kid B", age: "8+" },
  ],
  goals: ["science", "music"],
  afterSchool: ["bedtime_stories"],
  email: "  Test.Parent@Example.com ",
  attribution: { utm_source: "whatsapp", utm_campaign: "test_campaign" },
};

const withInput = (patch: Partial<ApplicationInput>) => validateApplication({ ...valid, ...patch });

describe("validateApplication", () => {
  it("accepts a valid application and normalises it", () => {
    expect(validateApplication(valid)).toEqual({
      ok: true,
      value: {
        kids: [
          { name: "Test kid a", age: "5" },
          { name: "Test Kid B", age: "8+" },
        ],
        // "Test Kid" is a placeholder: flagged, but still accepted.
        nameCheck: "suspicious",
        goals: ["science", "music"],
        afterSchool: ["bedtime_stories"],
        email: "test.parent@example.com",
        attribution: { utm_source: "whatsapp", utm_campaign: "test_campaign" },
      },
    });
  });

  it("rejects a throwaway inbox with its own reason", () => {
    expect(withInput({ email: "Test.Parent@Mailinator.com" })).toEqual({
      ok: false,
      field: "email",
      reason: DISPOSABLE_EMAIL_REASON,
    });
  });

  it("applies the names-step rules to every kid", () => {
    expect(withInput({ kids: [{ name: "d’test", age: "3" }] })).toMatchObject({
      ok: true,
      value: { kids: [{ name: "D'test", age: "3" }] },
    });
    for (const name of ["", "Test1", "a".repeat(31), "<script>"]) {
      expect(withInput({ kids: [{ name, age: "3" }] })).toMatchObject({ ok: false, field: "kids" });
    }
  });

  it("re-checks the names on the server and never rejects for it", () => {
    expect(withInput({ kids: [{ name: "Aarav", age: "4" }] })).toMatchObject({
      ok: true,
      value: { nameCheck: "ok" },
    });
    const kids = [
      { name: "Aarav", age: "4" },
      { name: "asdf", age: "6" },
    ];
    expect(withInput({ kids })).toMatchObject({ ok: true, value: { nameCheck: "suspicious" } });
  });

  it("rejects the same name twice, ignoring case", () => {
    const kids = [
      { name: "Test Kid", age: "4" },
      { name: "test kid", age: "6" },
    ];
    expect(withInput({ kids })).toEqual({ ok: false, field: "kids", reason: "name duplicate" });
  });

  it("needs 1–2 kids with a known age", () => {
    expect(withInput({ kids: [] })).toMatchObject({ ok: false, field: "kids" });
    const three = ["Test A", "Test B", "Test C"].map((name) => ({ name, age: "4" }));
    expect(withInput({ kids: three })).toMatchObject({ ok: false, field: "kids" });
    for (const age of ["2", "8", "9", "", "five"]) {
      expect(withInput({ kids: [{ name: "Test Kid", age }] })).toMatchObject({
        ok: false,
        field: "kids",
        reason: "unknown age",
      });
    }
  });

  it("needs 1–3 known, unique goals", () => {
    expect(withInput({ goals: [] })).toMatchObject({ ok: false, field: "goals" });
    expect(withInput({ goals: ["science", "music", "puzzles"] })).toMatchObject({ ok: true });
    expect(withInput({ goals: ["science", "music", "puzzles", "the_world"] })).toMatchObject({
      ok: false,
      field: "goals",
    });
    expect(withInput({ goals: ["science", "science"] })).toMatchObject({ ok: false, field: "goals" });
    expect(withInput({ goals: ["astrology"] })).toMatchObject({ ok: false, field: "goals" });
  });

  it("needs at least one known, unique after-school option", () => {
    expect(withInput({ afterSchool: [] })).toMatchObject({ ok: false, field: "afterSchool" });
    expect(withInput({ afterSchool: ["tutors", "tutors"] })).toMatchObject({
      ok: false,
      field: "afterSchool",
    });
    expect(withInput({ afterSchool: ["chess"] })).toMatchObject({ ok: false, field: "afterSchool" });
    expect(withInput({ afterSchool: ["mostly_school"] })).toMatchObject({ ok: true });
  });

  it("rejects 'mostly just school' combined with other options", () => {
    for (const afterSchool of [["mostly_school", "tutors"], ["tutors", "mostly_school"]]) {
      expect(withInput({ afterSchool })).toEqual({
        ok: false,
        field: "afterSchool",
        reason: "mostly_school can't be combined with other options",
      });
    }
  });

  it("rejects a malformed email", () => {
    expect(withInput({ email: "test.parent" })).toEqual({
      ok: false,
      field: "email",
      reason: "invalid email",
    });
  });

  it("keeps a sane PostHog distinct ID and drops an absurd one", () => {
    expect(withInput({ posthogDistinctId: " test-distinct-id " })).toMatchObject({
      ok: true,
      value: { posthogDistinctId: "test-distinct-id" },
    });
    const result = withInput({ posthogDistinctId: "x".repeat(201) });
    expect(result.ok && "posthogDistinctId" in result.value).toBe(false);
  });
});

describe("email", () => {
  it("normalises by trimming and lowercasing", () => {
    expect(normaliseEmail("  Test.Parent+Pesto@Example.COM ")).toBe("test.parent+pesto@example.com");
  });

  it.each([
    "test.parent@example.com",
    "test.parent+e2e@example.com",
    "test_parent@mail.example.co.uk",
    "t@example.io",
  ])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "test.parent",
    "test.parent@",
    "@example.com",
    "test parent@example.com",
    "test@@example.com",
    "test.parent@example",
    "test.parent@example.c",
    "test.parent@-example.com",
    "test.parent@example..com",
    `${"a".repeat(65)}@example.com`,
    `test@${"a".repeat(250)}.com`,
  ])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe("cleanAttribution", () => {
  it("drops empty and unknown keys, trims and caps values", () => {
    const raw = {
      utm_source: " meta ",
      utm_medium: "",
      landing_url: `https://example.com/apply?x=${"a".repeat(3000)}`,
      evil: "x",
    } as never;
    const cleaned = cleanAttribution(raw);
    expect(Object.keys(cleaned).sort()).toEqual(["landing_url", "utm_source"]);
    expect(cleaned.utm_source).toBe("meta");
    expect(cleaned.landing_url).toHaveLength(ATTRIBUTION_VALUE_MAX_LENGTH);
  });
});
