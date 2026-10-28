/**
 * The privacy policy and terms of use (/privacy, /terms). The text itself is
 * in content/legal/*.md. Both pages fill `{{LAST_UPDATED}}` from one date.
 */

/** Shown as "Last updated" on both pages. Change it whenever either text changes. */
export const LAST_UPDATED = "28 October 2026";

export const legalPages = {
  privacy: {
    file: "privacy.md",
    title: "Privacy policy · Pesto",
    description:
      "How Pesto handles your family's information on the website, the Founding Families waitlist and the Pesto app: what we collect, why, who helps us, and how to delete it.",
  },
  terms: {
    file: "terms.md",
    title: "Terms of use · Pesto",
    description:
      "The rules for using pestokids.com, applying to Pesto Founding Families and using the Pesto app, explained in plain words.",
  },
} as const;

export type LegalPageName = keyof typeof legalPages;
