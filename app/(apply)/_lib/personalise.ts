import type { Family } from "@/content/apply";

/** "Meera" → "Meera’s". */
export function possessive(name: string): string {
  return `${name}’s`;
}

/**
 * ["Meera"] → "Meera"; ["Meera", "Arjun"] → "Meera & Arjun";
 * ["Meera", "Arjun", "Kabir"] → "Meera, Arjun & Kabir" (no Oxford comma).
 */
export function joinNames(kidNames: readonly string[]): string {
  if (kidNames.length < 2) return kidNames.join("");
  return `${kidNames.slice(0, -1).join(", ")} & ${kidNames[kidNames.length - 1]}`;
}

/** Builds the personalisation object every copy function in content/apply.ts takes. */
export function familyOf(kidNames: readonly string[]): Family {
  return {
    kidNames: [...kidNames],
    names: joinNames(kidNames),
    possessive: kidNames.length === 1 ? possessive(kidNames[0]) : "their",
    plural: kidNames.length > 1,
  };
}
