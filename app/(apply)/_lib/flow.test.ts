import { describe, expect, it } from "vitest";
import * as content from "@/content/apply";
import {
  analyticsStep,
  canEnter,
  captureAttribution,
  clampStep,
  clearsOtherAfterSchool,
  createDraft,
  initialStep,
  nextStep,
  pathTo,
  prevStep,
  progressSegment,
  reducer,
  sanitizeDraft,
  validateName,
  type Action,
  type Draft,
} from "./flow";
import { familyOf, joinNames, possessive } from "./personalise";
import {
  DRAFT_KEY,
  loadDraft,
  loadSubmitted,
  saveDraft,
  saveSubmitted,
  SUBMITTED_KEY,
  type KeyValueStorage,
} from "./storage";

// Fake names only (public repo).
const A = "Test Kid A";
const B = "Test Kid B";

function run(draft: Draft, ...actions: Action[]): Draft {
  return actions.reduce(reducer, draft);
}

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const empty = createDraft(1_700_000_000_000);
const oneKid = run(empty, { type: "addKid", name: A }, { type: "setAge", kidIndex: 0, age: "5" });
const twoKids = run(
  empty,
  { type: "addKid", name: A },
  { type: "addKid", name: B },
  { type: "setAge", kidIndex: 0, age: "5" },
  { type: "setAge", kidIndex: 1, age: "8+" },
);

describe("kids", () => {
  it("caps at 2 kids", () => {
    const three = run(twoKids, { type: "addKid", name: "Test Kid C" });
    expect(three.kids.map((k) => k.name)).toEqual([A, B]);
  });

  it("rejects a duplicate name, case-insensitively", () => {
    const dup = run(empty, { type: "addKid", name: A }, { type: "addKid", name: A.toUpperCase() });
    expect(dup.kids).toHaveLength(1);
  });

  it("removing a kid goes back to a single-kid state", () => {
    const removed = run(twoKids, { type: "removeKid", index: 0 });
    expect(removed.kids).toEqual([{ name: B, age: "8+" }]);
    expect(nextStep(removed, "age-1")).toBe("goals");
    expect(canEnter(removed, "age-2")).toBe(false);
  });

  it("ignores an invalid name", () => {
    expect(run(empty, { type: "addKid", name: "R2-D2" }).kids).toEqual([]);
  });

  it("renames a kid and keeps their age", () => {
    const renamed = run(oneKid, { type: "renameKid", index: 0, name: "  test kid z " });
    expect(renamed.kids).toEqual([{ name: "Test kid z", age: "5" }]);
  });

  it("rejects a rename that is invalid or clashes with the other kid", () => {
    expect(run(oneKid, { type: "renameKid", index: 0, name: "R2-D2" })).toBe(oneKid);
    expect(run(twoKids, { type: "renameKid", index: 1, name: A.toLowerCase() })).toBe(twoKids);
    expect(run(oneKid, { type: "renameKid", index: 1, name: B })).toBe(oneKid);
  });
});

describe("validateName", () => {
  it("trims, collapses spaces and capitalises the first letter", () => {
    expect(validateName("  test   kid ")).toEqual({ ok: true, name: "Test kid" });
  });

  it("accepts letters in any script, hyphens and apostrophes", () => {
    for (const name of ["Anne-Marie", "D'Souza", "Zoë", "देव", "அனு", "José Luis"]) {
      expect(validateName(name)).toMatchObject({ ok: true });
    }
  });

  it("stores the iOS curly apostrophe as a straight one", () => {
    expect(validateName("d’souza")).toEqual({ ok: true, name: "D'souza" });
  });

  it("rejects digits, symbols and emoji", () => {
    for (const name of ["Kid1", "Kid!", "Kid 🙂", "kid@example"]) {
      expect(validateName(name)).toEqual({ ok: false, error: "invalid" });
    }
  });

  it("enforces 1–30 characters", () => {
    expect(validateName("   ")).toEqual({ ok: false, error: "empty" });
    expect(validateName("a".repeat(30))).toMatchObject({ ok: true });
    expect(validateName("a".repeat(31))).toEqual({ ok: false, error: "tooLong" });
  });

  it("rejects a name equal to an existing one", () => {
    expect(validateName("test kid a", [A])).toEqual({ ok: false, error: "duplicate" });
  });
});

describe("goals", () => {
  it("caps at 3; a 4th pick is ignored", () => {
    const d = run(
      oneKid,
      { type: "toggleGoal", slug: "science" },
      { type: "toggleGoal", slug: "music" },
      { type: "toggleGoal", slug: "puzzles" },
      { type: "toggleGoal", slug: "the_world" },
    );
    expect(d.goals).toEqual(["science", "music", "puzzles"]);
  });

  it("unpicking frees a slot", () => {
    const d = run(
      oneKid,
      { type: "toggleGoal", slug: "science" },
      { type: "toggleGoal", slug: "music" },
      { type: "toggleGoal", slug: "puzzles" },
      { type: "toggleGoal", slug: "music" },
      { type: "toggleGoal", slug: "the_world" },
    );
    expect(d.goals).toEqual(["science", "puzzles", "the_world"]);
  });
});

describe("after school", () => {
  const others = content.afterSchoolOptions
    .map((o) => o.slug)
    .filter((slug) => slug !== "mostly_school");

  it("is multi-select with no cap among the non-exclusive options", () => {
    const d = run(oneKid, ...others.map((slug) => ({ type: "toggleAfterSchool", slug }) as const));
    expect(d.afterSchool).toEqual(others);
    expect(run(d, { type: "toggleAfterSchool", slug: "tutors" }).afterSchool).not.toContain(
      "tutors",
    );
  });

  it("'mostly just school' clears the others", () => {
    const d = run(
      oneKid,
      { type: "toggleAfterSchool", slug: "tutors" },
      { type: "toggleAfterSchool", slug: "grandparents" },
    );
    expect(clearsOtherAfterSchool(d.afterSchool, "mostly_school")).toBe(true);
    expect(run(d, { type: "toggleAfterSchool", slug: "mostly_school" }).afterSchool).toEqual([
      "mostly_school",
    ]);
  });

  it("any other option drops 'mostly just school', without a hint", () => {
    const d = run(oneKid, { type: "toggleAfterSchool", slug: "mostly_school" });
    expect(clearsOtherAfterSchool(d.afterSchool, "tutors")).toBe(false);
    expect(run(d, { type: "toggleAfterSchool", slug: "tutors" }).afterSchool).toEqual(["tutors"]);
  });

  it("only hints when 'mostly just school' actually clears something", () => {
    expect(clearsOtherAfterSchool([], "mostly_school")).toBe(false);
    // Unselecting it clears nothing.
    expect(clearsOtherAfterSchool(["mostly_school"], "mostly_school")).toBe(false);
    const d = run(
      oneKid,
      { type: "toggleAfterSchool", slug: "mostly_school" },
      { type: "toggleAfterSchool", slug: "mostly_school" },
    );
    expect(d.afterSchool).toEqual([]);
  });
});

describe("step order", () => {
  it("1 kid skips the second age screen", () => {
    expect(pathTo(oneKid, "email")).toEqual([
      "welcome",
      "names",
      "age-1",
      "goals",
      "how",
      "after-school",
      "why",
      "email",
    ]);
    expect(prevStep(oneKid, "goals")).toBe("age-1");
  });

  it("2 kids ask for each age", () => {
    expect(pathTo(twoKids, "goals")).toEqual(["welcome", "names", "age-1", "age-2", "goals"]);
    expect(prevStep(twoKids, "goals")).toBe("age-2");
  });

  it("welcome has no previous step and email has no next one", () => {
    expect(prevStep(oneKid, "welcome")).toBeNull();
    expect(nextStep(oneKid, "email")).toBeNull();
  });

  it("maps steps to the 7 progress segments (both age screens are 2)", () => {
    expect(
      (["welcome", "names", "age-1", "age-2", "goals", "how", "after-school", "why", "email", "received"] as const).map(
        progressSegment,
      ),
    ).toEqual([null, 1, 2, 2, 3, 4, 5, 6, 7, null]);
  });

  it("reports analytics step names", () => {
    expect(analyticsStep("age-2")).toEqual({ step: "age", kid_index: 1 });
    expect(analyticsStep("after-school")).toEqual({ step: "after_school" });
  });
});

describe("guards and deep links", () => {
  it("clamps a deep link to the furthest step the draft allows", () => {
    expect(clampStep(empty, "email")).toBe("welcome");
    expect(clampStep(empty, "names")).toBe("names");
    expect(clampStep(oneKid, "why")).toBe("goals");
    expect(clampStep(run(oneKid, { type: "toggleGoal", slug: "music" }), "email")).toBe(
      "after-school",
    );
  });

  it("a stale age-2 entry after removing the second kid lands on age-1", () => {
    const filled = run(
      twoKids,
      { type: "toggleGoal", slug: "music" },
      { type: "toggleAfterSchool", slug: "tutors" },
      { type: "removeKid", index: 1 },
    );
    expect(clampStep(filled, "age-2")).toBe("age-1");
    expect(pathTo(filled, "age-2")).toEqual(["welcome", "names", "age-1"]);
  });

  it("can't reach the second age screen before the first kid's age", () => {
    const noAges = run(empty, { type: "addKid", name: A }, { type: "addKid", name: B });
    expect(clampStep(noAges, "age-2")).toBe("age-1");
  });
});

describe("resume from draft", () => {
  const filled = run(
    twoKids,
    { type: "toggleGoal", slug: "music" },
    { type: "toggleAfterSchool", slug: "tutors" },
    { type: "setStep", step: "why" },
  );

  it("round-trips through storage and resumes at the saved step", () => {
    const storage = memoryStorage();
    saveDraft(filled, storage);
    const loaded = loadDraft(storage);
    expect(loaded).toEqual(filled);
    expect(initialStep(loaded, null, null)).toBe("why");
  });

  it("a ?step= in the URL (refresh) wins over the saved step", () => {
    expect(initialStep(filled, "goals", null)).toBe("goals");
  });

  it("a ?step= the draft can't reach is clamped", () => {
    expect(initialStep(oneKid, "email", null)).toBe("goals");
    expect(initialStep(null, "email", null)).toBe("welcome");
  });

  it("no draft starts at welcome", () => {
    expect(initialStep(null, null, null)).toBe("welcome");
  });

  it("submitted always shows received, whatever the URL", () => {
    const submitted = { applicationId: "x", refCode: "PF-TEST", email: "e", kidNames: [A] };
    expect(initialStep(filled, "names", submitted)).toBe("received");
    expect(initialStep(null, null, submitted)).toBe("received");
  });

  it("a saved step past what the data allows is clamped on load", () => {
    const storage = memoryStorage();
    storage.setItem(DRAFT_KEY, JSON.stringify({ ...oneKid, step: "email" }));
    expect(loadDraft(storage)?.step).toBe("goals");
  });

  it("sanitises a tampered draft", () => {
    const storage = memoryStorage();
    storage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        step: "nope",
        kids: [
          { name: A, age: "5" },
          { name: "<script>", age: "5" },
          { name: B, age: "12" },
          { name: "Test Kid C", age: "3" },
        ],
        goals: ["music", "music", "hacking", "science", "puzzles", "the_world"],
        afterSchool: ["tutors", 3],
        email: 42,
        startedAt: 1,
      }),
    );
    expect(loadDraft(storage)).toEqual({
      step: "welcome",
      kids: [
        { name: A, age: "5" },
        { name: B, age: null },
      ],
      goals: ["music", "science", "puzzles"],
      afterSchool: ["tutors"],
      email: "",
      startedAt: 1,
    });
  });

  it("resumed progress with 'mostly just school' and others keeps the others", () => {
    const storage = memoryStorage();
    storage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...oneKid, afterSchool: ["tutors", "mostly_school", "grandparents"] }),
    );
    expect(loadDraft(storage)?.afterSchool).toEqual(["tutors", "grandparents"]);

    storage.setItem(DRAFT_KEY, JSON.stringify({ ...oneKid, afterSchool: ["mostly_school"] }));
    expect(loadDraft(storage)?.afterSchool).toEqual(["mostly_school"]);
  });

  it("returns null for corrupt JSON or a non-draft", () => {
    const storage = memoryStorage();
    storage.setItem(DRAFT_KEY, "{not json");
    expect(loadDraft(storage)).toBeNull();
    storage.setItem(DRAFT_KEY, JSON.stringify([1, 2]));
    expect(loadDraft(storage)).toBeNull();
    expect(sanitizeDraft({ kids: [] })).toBeNull();
  });

  it("survives storage that throws", () => {
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadDraft(throwing)).toBeNull();
    expect(() => saveDraft(filled, throwing)).not.toThrow();
  });

  it("saving the submitted record clears the draft", () => {
    const storage = memoryStorage();
    saveDraft(filled, storage);
    const submitted = {
      applicationId: "app_1",
      refCode: "PF-TEST",
      email: "test.parent@example.com",
      kidNames: [A, B],
    };
    saveSubmitted(submitted, storage);
    expect(storage.data.has(DRAFT_KEY)).toBe(false);
    expect(storage.data.has(SUBMITTED_KEY)).toBe(true);
    expect(loadSubmitted(storage)).toEqual(submitted);
  });

  it("keeps the submit time, and drops a bad one", () => {
    const storage = memoryStorage();
    const base = { applicationId: "app_1", refCode: "PF-TEST", email: "x@example.com", kidNames: [A] };
    saveSubmitted({ ...base, submittedAt: 1_790_000_000_000 }, storage);
    expect(loadSubmitted(storage)?.submittedAt).toBe(1_790_000_000_000);
    storage.setItem(SUBMITTED_KEY, JSON.stringify({ ...base, submittedAt: "yesterday" }));
    expect(loadSubmitted(storage)).toEqual(base);
  });
});

describe("attribution capture", () => {
  it("first touch wins", () => {
    const first = captureAttribution(
      empty,
      "https://pestokids.com/apply?utm_source=whatsapp&utm_campaign=founder_outreach",
      "",
    );
    expect(first).toMatchObject({
      sourceType: "organic",
      source: "whatsapp",
      campaign: "founder_outreach",
      attribution: { utm_source: "whatsapp", utm_campaign: "founder_outreach" },
    });
    const second = captureAttribution(first, "https://pestokids.com/apply?fbclid=abc", "");
    expect(second).toBe(first);
  });

  it("survives a storage round trip", () => {
    const storage = memoryStorage();
    const d = captureAttribution(empty, "https://pestokids.com/apply?via=desktop", "");
    saveDraft(d, storage);
    expect(loadDraft(storage)).toEqual(d);
  });
});

describe("personalisation · 1 vs 2 kids", () => {
  const one = familyOf([A]);
  const two = familyOf([A, B]);

  it("joins names and builds possessives", () => {
    expect(joinNames([A])).toBe(A);
    expect(joinNames([A, B])).toBe(`${A} & ${B}`);
    expect(possessive(A)).toBe(`${A}’s`);
    expect(one).toEqual({ kidNames: [A], names: A, possessive: `${A}’s`, plural: false });
    expect(two).toMatchObject({ names: `${A} & ${B}`, possessive: "their", plural: true });
  });

  it("screen 3: age questions and the second-kid eyebrow", () => {
    expect(content.ages.question(A)).toBe(`How old is ${A}?`);
    expect(content.ages.questionSecond(B)).toBe(`And how old is ${B}?`);
    expect(content.ages.eyebrowSecond(A, "5")).toBe("PESTO ASKS · TEST KID A IS 5 ✓");
    expect(content.ages.confirm(B)).toBe(`That’s ${B}!`);
  });

  it("screen 4: goals sentence", () => {
    expect(content.goals.sentence(one)).toEqual([`I want ${A}`, "to fall in love with…"]);
    expect(content.goals.sentence(two)).toEqual([`I want ${A} & ${B}`, "to fall in love with…"]);
  });

  it("screen 5: how Pesto works", () => {
    expect(content.how.sub(one)).toBe(
      `Pesto is fun first. To ${A} it’s just playtime. The learning sneaks in along the way.`,
    );
    expect(content.how.sub(two)).toContain(`To ${A} & ${B} it’s just playtime.`);
  });

  it("screen 6: after school headline", () => {
    expect(content.afterSchool.headline(one)).toBe(
      `After school, what keeps ${A}’s brain busy?`,
    );
    expect(content.afterSchool.headline(two)).toBe("After school, what keeps their brains busy?");
  });

  it("screen 9: received", () => {
    expect(content.received.title(one)).toBe(`You’re in the running, ${A}!`);
    expect(content.received.title(two)).toBe(`You’re in the running, ${A} & ${B}!`);
    expect(content.received.sayHi.sub(two)).toBe(
      `He’ll send a 2-minute story for ${A} & ${B} to try tonight.`,
    );
    expect(content.received.sayHi.chatMessage(one)).toBe(`Hi ${A}! Story time tonight?`);
  });

  it("WhatsApp prefill includes the ref code", () => {
    expect(content.whatsappPrefillFor("PF-TEST")).toBe("Hi Pesto! 👋 (PF-TEST)");
  });
});
