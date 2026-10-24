/**
 * Validation for a Founding Families application, shared by the /apply flow
 * and the Convex `applications.submit` mutation so both apply the same rules.
 *
 * Pure, env-free and imported with relative paths only, so the Convex bundler
 * can include it.
 */
import {
  afterSchoolOptions,
  ageOptions,
  EXCLUSIVE_AFTER_SCHOOL,
  goalOptions,
  MAX_GOALS,
  MAX_KIDS,
  NAME_MAX_LENGTH,
  type AfterSchoolSlug,
  type Age,
  type GoalSlug,
} from "../content/apply";
import { ATTRIBUTION_PARAMS, type Attribution } from "./attribution";
import { isDisposableEmail } from "./disposable-email";
import { checkNames, type NameCheck } from "./name-check";

// ── Names ────────────────────────────────────────────────────────────────────

export type NameResult =
  | { ok: true; name: string }
  | { ok: false; error: "empty" | "invalid" | "tooLong" | "duplicate" };

// Letters in any script (plus combining marks, for scripts like Devanagari),
// spaces, hyphens and apostrophes.
const NAME_PATTERN = /^[\p{L}\p{M}' -]+$/u;

/**
 * Trims, normalises curly apostrophes to straight ones, capitalises the first
 * letter and validates. `others` are names already added (case-insensitive
 * duplicates are rejected).
 */
export function validateName(raw: string, others: readonly string[] = []): NameResult {
  const trimmed = raw.replace(/[‘’]/g, "'").trim().replace(/\s+/g, " ");
  if (!trimmed) return { ok: false, error: "empty" };
  if ([...trimmed].length > NAME_MAX_LENGTH) return { ok: false, error: "tooLong" };
  if (!NAME_PATTERN.test(trimmed)) return { ok: false, error: "invalid" };
  const name = trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
  const lower = name.toLocaleLowerCase();
  if (others.some((o) => o.toLocaleLowerCase() === lower)) return { ok: false, error: "duplicate" };
  return { ok: true, name };
}

// ── Email ────────────────────────────────────────────────────────────────────

export const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;

// local@label.label.tld: no spaces or extra @ in the local part, hostname
// labels of letters/digits/hyphens, and a TLD of 2+ letters.
const EMAIL_PATTERN = /^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Trimmed and lowercased: the form emails are stored and matched in. */
export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Format check on a normalised email. Typo suggestions are a client-side nicety, not a rule. */
export function isValidEmail(email: string): boolean {
  if (email.length > EMAIL_MAX_LENGTH) return false;
  if (email.indexOf("@") > EMAIL_LOCAL_MAX_LENGTH) return false;
  return EMAIL_PATTERN.test(email);
}

// ── Whole application ────────────────────────────────────────────────────────

/** What the client sends. Kept loose (plain strings) because it's untrusted. */
export type ApplicationInput = {
  kids: { name: string; age: string }[];
  goals: string[];
  afterSchool: string[];
  email: string;
  attribution: Attribution;
  posthogDistinctId?: string;
};

export type ValidApplication = {
  kids: { name: string; age: Age }[];
  /** Whether any kid's name looks fake (lib/name-check.ts). Informational, never a rejection. */
  nameCheck: NameCheck;
  goals: GoalSlug[];
  afterSchool: AfterSchoolSlug[];
  email: string;
  attribution: Attribution;
  posthogDistinctId?: string;
};

export type ApplicationField = "kids" | "goals" | "afterSchool" | "email";

/** The `reason` for a throwaway-inbox email, so the flow can say so kindly. */
export const DISPOSABLE_EMAIL_REASON = "disposable email";

export type ApplicationResult =
  | { ok: true; value: ValidApplication }
  | { ok: false; field: ApplicationField; reason: string };

/** Attribution values are raw URLs and IDs; anything longer is junk, so it's cut. */
export const ATTRIBUTION_VALUE_MAX_LENGTH = 2048;
export const POSTHOG_ID_MAX_LENGTH = 200;

const ATTRIBUTION_KEYS = [...ATTRIBUTION_PARAMS, "landing_url", "referrer"] as const;
const ageSet = new Set<string>(ageOptions);
const goalSlugs = new Set<string>(goalOptions.map((o) => o.slug));
const afterSchoolSlugs = new Set<string>(afterSchoolOptions.map((o) => o.slug));

function isSlugList<T extends string>(list: string[], allowed: Set<string>): list is T[] {
  return list.every((x) => allowed.has(x)) && new Set(list).size === list.length;
}

/** True if the exclusive "Mostly just school" is picked together with anything else. */
export function hasExclusiveConflict(afterSchool: readonly string[]): boolean {
  return afterSchool.length > 1 && afterSchool.includes(EXCLUSIVE_AFTER_SCHOOL);
}

/** Keeps known keys with non-empty values, trimmed and length-capped. */
export function cleanAttribution(raw: Attribution): Attribution {
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = raw[key]?.trim();
    if (value) out[key] = value.slice(0, ATTRIBUTION_VALUE_MAX_LENGTH);
  }
  return out;
}

/**
 * Validates and normalises a submitted application: names cleaned as in the
 * names step, email normalised, slugs checked against content/apply.ts.
 * Returns the first problem found. Also re-runs the name check, so the
 * stored `nameCheck` never depends on the client.
 */
export function validateApplication(input: ApplicationInput): ApplicationResult {
  const fail = (field: ApplicationField, reason: string): ApplicationResult => ({
    ok: false,
    field,
    reason,
  });

  if (input.kids.length < 1 || input.kids.length > MAX_KIDS) {
    return fail("kids", `expected 1–${MAX_KIDS} kids`);
  }
  const kids: ValidApplication["kids"] = [];
  for (const kid of input.kids) {
    const name = validateName(
      kid.name,
      kids.map((k) => k.name),
    );
    if (!name.ok) return fail("kids", `name ${name.error}`);
    if (!ageSet.has(kid.age)) return fail("kids", "unknown age");
    kids.push({ name: name.name, age: kid.age as Age });
  }

  const { goals, afterSchool } = input;
  if (goals.length < 1 || goals.length > MAX_GOALS) {
    return fail("goals", `expected 1–${MAX_GOALS} goals`);
  }
  if (!isSlugList<GoalSlug>(goals, goalSlugs)) return fail("goals", "unknown or repeated goal");

  if (afterSchool.length < 1) return fail("afterSchool", "expected at least one option");
  if (!isSlugList<AfterSchoolSlug>(afterSchool, afterSchoolSlugs)) {
    return fail("afterSchool", "unknown or repeated option");
  }
  if (hasExclusiveConflict(afterSchool)) {
    return fail("afterSchool", `${EXCLUSIVE_AFTER_SCHOOL} can't be combined with other options`);
  }

  const email = normaliseEmail(input.email);
  if (!isValidEmail(email)) return fail("email", "invalid email");
  if (isDisposableEmail(email)) return fail("email", DISPOSABLE_EMAIL_REASON);

  const value: ValidApplication = {
    kids,
    nameCheck: checkNames(kids.map((k) => k.name)),
    goals: [...goals],
    afterSchool: [...afterSchool],
    email,
    attribution: cleanAttribution(input.attribution),
  };
  // An over-long ID can't be a real PostHog ID; drop it rather than fail the application.
  const distinctId = input.posthogDistinctId?.trim();
  if (distinctId && distinctId.length <= POSTHOG_ID_MAX_LENGTH) {
    value.posthogDistinctId = distinctId;
  }
  return { ok: true, value };
}
