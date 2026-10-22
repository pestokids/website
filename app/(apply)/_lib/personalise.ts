import type { Family } from "@/content/apply";

/** "Meera" → "Meera’s". */
export function possessive(name: string): string {
  return `${name}’s`;
}

/** ["Meera"] → "Meera"; ["Meera", "Arjun"] → "Meera & Arjun". */
export function joinNames(kidNames: readonly string[]): string {
  return kidNames.join(" & ");
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
