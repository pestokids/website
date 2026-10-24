/**
 * The privacy policy and terms of use (/privacy, /terms). The text itself is
 * in content/legal/*.md. Both pages fill `{{LAST_UPDATED}}` from one date.
 */

/** Shown as "Last updated" on both pages. Change it whenever either text changes. */
export const LAST_UPDATED = "24 October 2026";

export const legalPages = {
  privacy: {
    file: "privacy.md",
    title: "Privacy policy · Pesto",
    description:
      "How Pesto handles the information you share when you apply to Founding Families: what we collect, why, who helps us, and how to have it deleted.",
  },
  terms: {
    file: "terms.md",
    title: "Terms of use · Pesto",
    description:
      "The rules for using pestokids.com and applying to Pesto Founding Families, explained in plain words.",
  },
} as const;

export type LegalPageName = keyof typeof legalPages;
