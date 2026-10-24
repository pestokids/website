/**
 * Flags kid names that are probably not real (keyboard mashes, one letter
 * repeated, no vowels, placeholder words). Rules only: a flag is a hint for
 * a gentle nudge on the names screen and a field on the application, never a
 * reason to reject. Shared by the /apply flow and the Convex `submit`
 * mutation.
 *
 * Tuned to pass real names first: lib/name-check.test.ts lists real names
 * (many Indian and diaspora spellings) that must never be flagged. Check a
 * rule change against that list.
 *
 * Pure, env-free and imported with relative paths only, so the Convex bundler
 * can include it.
 */

export type NameCheck = "ok" | "suspicious";

/** The whole name, letters only, is one of these. */
const PLACEHOLDER_NAMES = new Set([
  "test",
  "testing",
  "tester",
  "kid",
  "kids",
  "kiddo",
  "child",
  "children",
  "abc",
  "na",
  "none",
  "name",
  "noname",
  "firstname",
  "unknown",
  "null",
  "undefined",
  "sample",
  "demo",
  "dummy",
  "fake",
  "anonymous",
]);

/** Any one word of the name is one of these ("Test Kid A", "Child One"). */
const PLACEHOLDER_WORDS = new Set([
  "test",
  "testing",
  "kid",
  "child",
  "dummy",
  "sample",
  "fake",
  "unknown",
  "null",
  "undefined",
]);

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "abcdefghijklmnopqrstuvwxyz"];
const MASH_RUN = 4;
/** Row runs that occur inside real names (Liberty, Gerty). */
const NAME_RUNS = new Set(["erty"]);

/** Every 4-key run along a keyboard row or the alphabet, both directions, plus "xyz". */
const MASH_RUNS: readonly string[] = (() => {
  const runs = new Set(["xyz"]);
  for (const row of KEYBOARD_ROWS) {
    for (const line of [row, [...row].reverse().join("")]) {
      for (let i = 0; i + MASH_RUN <= line.length; i++) runs.add(line.slice(i, i + MASH_RUN));
    }
  }
  for (const run of NAME_RUNS) runs.delete(run);
  return [...runs];
})();

// "y" counts: Lynn, Glynn, Rhythm.
const VOWELS = /[aeiouy]/;

/** Lowercase, accents stripped (Zoë → zoe), so the Latin rules see plain letters. */
function fold(name: string): string {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** One letter repeated ("aa", "mmmm"), or a 2–3 letter unit said 3+ times ("hahaha", "dhdhdh"). */
function isRepeatedUnit(letters: string): boolean {
  if (/^(.)\1+$/.test(letters)) return true;
  for (let unit = 2; unit <= 3; unit++) {
    if (letters.length < unit * 3 || letters.length % unit !== 0) continue;
    if (letters.slice(0, unit).repeat(letters.length / unit) === letters) return true;
  }
  return false;
}

/**
 * Checks one kid's name, as cleaned by `validateName` (trimmed, single
 * spaces). Never throws; an empty name is "ok" (validation handles it).
 */
export function checkName(name: string): NameCheck {
  const folded = fold(name.trim());
  const words = folded.split(/[\s-]+/).filter(Boolean);
  // Letters only: drops spaces, hyphens and apostrophes ("as df" is still a mash).
  const letters = folded.replace(/[^\p{L}]/gu, "");
  if (!letters) return "ok";

  if (PLACEHOLDER_NAMES.has(letters)) return "suspicious";
  if (words.some((w) => PLACEHOLDER_WORDS.has(w.replace(/'/g, "")))) return "suspicious";

  // The rest only make sense for names typed in the Latin alphabet. Other
  // scripts skip them: आरव has no Latin vowels, 明 is a whole name in one
  // character and 乐乐 is a common doubled name. So does Bjørn (ø).
  if (!/^[a-z]+$/.test(letters)) return "ok";
  if (letters.length === 1 || isRepeatedUnit(letters)) return "suspicious";
  if (MASH_RUNS.some((run) => letters.includes(run))) return "suspicious";
  if (letters.length > 3 && !VOWELS.test(letters)) return "suspicious";
  return "ok";
}

/** "suspicious" if any of the names is. */
export function checkNames(names: readonly string[]): NameCheck {
  return names.some((n) => checkName(n) === "suspicious") ? "suspicious" : "ok";
}
