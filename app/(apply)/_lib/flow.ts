/**
 * Flow state for /apply: steps, the draft, the reducer and step guards.
 * Pure and framework-free so it can be unit-tested.
 */
import {
  afterSchoolOptions,
  ageOptions,
  EXCLUSIVE_AFTER_SCHOOL,
  goalOptions,
  MAX_GOALS,
  MAX_KIDS,
  type AfterSchoolSlug,
  type Age,
  type GoalSlug,
} from "@/content/apply";
import { hasExclusiveConflict, validateName } from "@/lib/application";
import {
  classifyAttribution,
  readAttribution,
  type Attribution,
  type Classification,
} from "@/lib/attribution";

export const STEPS = [
  "welcome",
  "names",
  "age-1",
  "age-2",
  "goals",
  "how",
  "after-school",
  "why",
  "email",
  "received",
] as const;
export type Step = (typeof STEPS)[number];

/** Steps the user can be on before submitting. */
export type FormStep = Exclude<Step, "received">;

export type Kid = { name: string; age: Age | null };

export type Draft = {
  step: FormStep;
  kids: Kid[];
  goals: GoalSlug[];
  afterSchool: AfterSchoolSlug[];
  email: string;
  /** ms since epoch, when the draft was created. */
  startedAt: number;
  /** Raw first touch. Absent until captured (the desktop screen never captures). */
  attribution?: Attribution;
} & Partial<Classification>;

export type Submitted = {
  applicationId: string;
  refCode: string;
  email: string;
  kidNames: string[];
  /** ms since epoch. Missing on records stored before it was added. */
  submittedAt?: number;
};

export function isStep(value: unknown): value is Step {
  return typeof value === "string" && (STEPS as readonly string[]).includes(value);
}

export function createDraft(now: number): Draft {
  return { step: "welcome", kids: [], goals: [], afterSchool: [], email: "", startedAt: now };
}

/**
 * Records first-touch attribution on the draft. A no-op if the draft already
 * has one. Kept separate from createDraft so the desktop screen can skip it.
 */
export function captureAttribution(draft: Draft, landingUrl: string, referrer: string): Draft {
  if (draft.attribution) return draft;
  const attribution = readAttribution(landingUrl, referrer);
  return reducer(draft, {
    type: "setAttribution",
    attribution,
    classification: classifyAttribution(attribution),
  });
}

// ── Names ────────────────────────────────────────────────────────────────────

// Shared with the Convex submit mutation, so client and server validate alike.
export { validateName, type NameResult } from "@/lib/application";

// ── Reducer ──────────────────────────────────────────────────────────────────

export type Action =
  | { type: "addKid"; name: string }
  | { type: "removeKid"; index: number }
  | { type: "renameKid"; index: number; name: string }
  | { type: "setAge"; kidIndex: number; age: Age }
  | { type: "toggleGoal"; slug: GoalSlug }
  | { type: "toggleAfterSchool"; slug: AfterSchoolSlug }
  | { type: "setEmail"; email: string }
  | { type: "setStep"; step: FormStep }
  | { type: "setAttribution"; attribution: Attribution; classification: Classification };

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

/**
 * "Mostly just school" is exclusive: picking it clears the others, and
 * picking anything else drops it.
 */
function toggleAfterSchool(list: readonly AfterSchoolSlug[], slug: AfterSchoolSlug) {
  if (list.includes(slug)) return list.filter((x) => x !== slug);
  if (slug === EXCLUSIVE_AFTER_SCHOOL) return [slug];
  return [...list.filter((x) => x !== EXCLUSIVE_AFTER_SCHOOL), slug];
}

/** Whether toggling `slug` clears other picks, so the screen can say so. */
export function clearsOtherAfterSchool(list: readonly AfterSchoolSlug[], slug: AfterSchoolSlug) {
  return slug === EXCLUSIVE_AFTER_SCHOOL && !list.includes(slug) && list.length > 0;
}

export function reducer(draft: Draft, action: Action): Draft {
  switch (action.type) {
    case "addKid": {
      if (draft.kids.length >= MAX_KIDS) return draft;
      const result = validateName(
        action.name,
        draft.kids.map((k) => k.name),
      );
      if (!result.ok) return draft;
      return { ...draft, kids: [...draft.kids, { name: result.name, age: null }] };
    }
    case "removeKid":
      if (action.index < 0 || action.index >= draft.kids.length) return draft;
      return { ...draft, kids: draft.kids.filter((_, i) => i !== action.index) };
    case "renameKid": {
      // Keeps the kid's age: a rename is a fix, not a different kid.
      const kid = draft.kids[action.index];
      if (!kid) return draft;
      const others = draft.kids.filter((_, i) => i !== action.index).map((k) => k.name);
      const result = validateName(action.name, others);
      if (!result.ok || result.name === kid.name) return draft;
      const kids = draft.kids.map((k, i) => (i === action.index ? { ...k, name: result.name } : k));
      return { ...draft, kids };
    }
    case "setAge": {
      if (!draft.kids[action.kidIndex] || !ageOptions.includes(action.age)) return draft;
      const kids = draft.kids.map((k, i) => (i === action.kidIndex ? { ...k, age: action.age } : k));
      return { ...draft, kids };
    }
    case "toggleGoal": {
      const picked = draft.goals.includes(action.slug);
      if (!picked && draft.goals.length >= MAX_GOALS) return draft;
      return { ...draft, goals: toggle(draft.goals, action.slug) };
    }
    case "toggleAfterSchool":
      return { ...draft, afterSchool: toggleAfterSchool(draft.afterSchool, action.slug) };
    case "setEmail":
      return { ...draft, email: action.email };
    case "setStep":
      return draft.step === action.step ? draft : { ...draft, step: action.step };
    case "setAttribution":
      // First touch wins.
      if (draft.attribution) return draft;
      return { ...draft, attribution: action.attribution, ...action.classification };
  }
}

// ── Step order and guards ────────────────────────────────────────────────────

/** Whether the draft has what `step` needs. "received" is never enterable from a draft. */
export function canEnter(draft: Draft, step: Step): boolean {
  const { kids } = draft;
  const agesDone = kids.length > 0 && kids.every((k) => k.age !== null);
  switch (step) {
    case "welcome":
    case "names":
      return true;
    case "age-1":
      return kids.length >= 1;
    case "age-2":
      return kids.length === 2 && kids[0].age !== null;
    case "goals":
      return agesDone;
    case "how":
    case "after-school":
      return agesDone && draft.goals.length > 0;
    case "why":
    case "email":
      return agesDone && draft.goals.length > 0 && draft.afterSchool.length > 0;
    case "received":
      return false;
  }
}

export function nextStep(draft: Draft, step: FormStep): FormStep | null {
  switch (step) {
    case "welcome":
      return "names";
    case "names":
      return "age-1";
    case "age-1":
      return draft.kids.length === 2 ? "age-2" : "goals";
    case "age-2":
      return "goals";
    case "goals":
      return "how";
    case "how":
      return "after-school";
    case "after-school":
      return "why";
    case "why":
      return "email";
    case "email":
      return null;
  }
}

export function prevStep(draft: Draft, step: FormStep): FormStep | null {
  switch (step) {
    case "welcome":
      return null;
    case "names":
      return "welcome";
    case "age-1":
      return "names";
    case "age-2":
      return "age-1";
    case "goals":
      return draft.kids.length === 2 ? "age-2" : "age-1";
    case "how":
      return "goals";
    case "after-school":
      return "how";
    case "why":
      return "after-school";
    case "email":
      return "why";
  }
}

/**
 * The steps from welcome up to `step`, following the draft's path. If `step`
 * isn't on that path (e.g. age-2 with one kid), stops at the last step before it.
 */
export function pathTo(draft: Draft, step: FormStep): FormStep[] {
  const target = STEPS.indexOf(step);
  const path: FormStep[] = ["welcome"];
  while (path[path.length - 1] !== step) {
    const next = nextStep(draft, path[path.length - 1]);
    if (!next || STEPS.indexOf(next) > target) break;
    path.push(next);
  }
  return path;
}

/** The furthest enterable step on the path to `step` (for deep links and stale URLs). */
export function clampStep(draft: Draft, step: FormStep): FormStep {
  if (canEnter(draft, step)) return step;
  // Nothing filled in yet: start from welcome rather than mid-form, so the
  // "Count us in" tap (flow start) isn't skipped.
  if (draft.kids.length === 0) return "welcome";
  const path = pathTo(draft, step);
  for (let i = path.length - 1; i >= 0; i--) {
    if (canEnter(draft, path[i])) return path[i];
  }
  return "welcome";
}

/**
 * Where to land on first load.
 *  - Submitted → received.
 *  - A `?step=` in the URL → that step (clamped). Covers refreshes mid-flow.
 *  - Otherwise resume the draft's saved step (clamped).
 */
export function initialStep(
  draft: Draft | null,
  urlStep: string | null,
  submitted: Submitted | null,
): Step {
  if (submitted) return "received";
  const d = draft ?? createDraft(0);
  const wanted = isStep(urlStep) && urlStep !== "received" ? urlStep : d.step;
  return clampStep(d, wanted);
}

/** Progress segment (1–7) for the header, or null on screens without one. */
export function progressSegment(step: Step): number | null {
  switch (step) {
    case "names":
      return 1;
    case "age-1":
    case "age-2":
      return 2;
    case "goals":
      return 3;
    case "how":
      return 4;
    case "after-school":
      return 5;
    case "why":
      return 6;
    case "email":
      return 7;
    default:
      return null;
  }
}

/** Step name and kid index as reported to analytics. */
export function analyticsStep(step: Step): { step: string; kid_index?: number } {
  if (step === "age-1") return { step: "age", kid_index: 0 };
  if (step === "age-2") return { step: "age", kid_index: 1 };
  return { step: step.replace("-", "_") };
}

// ── Draft sanitising (localStorage is untrusted) ─────────────────────────────

const goalSlugs = new Set<string>(goalOptions.map((o) => o.slug));
const afterSchoolSlugs = new Set<string>(afterSchoolOptions.map((o) => o.slug));
const ageSet = new Set<string>(ageOptions);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((e): e is [string, string] => typeof e[1] === "string"),
  );
}

/**
 * Rebuilds a Draft from parsed JSON, dropping anything invalid (unknown slugs,
 * bad names, over-cap lists). Returns null if it isn't a draft at all.
 */
export function sanitizeDraft(value: unknown): Draft | null {
  if (!isRecord(value) || typeof value.startedAt !== "number") return null;

  const kids: Kid[] = [];
  if (Array.isArray(value.kids)) {
    for (const k of value.kids) {
      if (kids.length >= MAX_KIDS || !isRecord(k) || typeof k.name !== "string") continue;
      const result = validateName(
        k.name,
        kids.map((x) => x.name),
      );
      if (!result.ok) continue;
      const age = typeof k.age === "string" && ageSet.has(k.age) ? (k.age as Age) : null;
      kids.push({ name: result.name, age });
    }
  }

  const uniq = <T extends string>(list: unknown, allowed: Set<string>): T[] =>
    Array.isArray(list)
      ? [...new Set(list.filter((x): x is T => typeof x === "string" && allowed.has(x)))]
      : [];

  let afterSchool = uniq<AfterSchoolSlug>(value.afterSchool, afterSchoolSlugs);
  // Saved before "Mostly just school" was exclusive: keep the specific picks.
  if (hasExclusiveConflict(afterSchool)) {
    afterSchool = afterSchool.filter((x) => x !== EXCLUSIVE_AFTER_SCHOOL);
  }

  const draft: Draft = {
    step: isStep(value.step) && value.step !== "received" ? value.step : "welcome",
    kids,
    goals: uniq<GoalSlug>(value.goals, goalSlugs).slice(0, MAX_GOALS),
    afterSchool,
    email: typeof value.email === "string" ? value.email : "",
    startedAt: value.startedAt,
  };

  if (isRecord(value.attribution)) {
    draft.attribution = stringRecord(value.attribution);
    if (
      value.sourceType === "paid" ||
      value.sourceType === "organic" ||
      value.sourceType === "direct"
    ) {
      draft.sourceType = value.sourceType;
    }
    if (typeof value.source === "string") draft.source = value.source;
    if (typeof value.campaign === "string" || value.campaign === null) {
      draft.campaign = value.campaign;
    }
  }

  draft.step = clampStep(draft, draft.step);
  return draft;
}

export function sanitizeSubmitted(value: unknown): Submitted | null {
  if (!isRecord(value)) return null;
  const { applicationId, refCode, email, kidNames, submittedAt } = value;
  if (typeof applicationId !== "string" || typeof refCode !== "string") return null;
  if (typeof email !== "string" || !Array.isArray(kidNames)) return null;
  const names = kidNames.filter((n): n is string => typeof n === "string").slice(0, MAX_KIDS);
  if (names.length === 0) return null;
  const submitted: Submitted = { applicationId, refCode, email, kidNames: names };
  if (typeof submittedAt === "number" && Number.isFinite(submittedAt)) {
    submitted.submittedAt = submittedAt;
  }
  return submitted;
}
