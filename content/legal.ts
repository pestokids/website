/**
 * The privacy policy and terms of use (/privacy, /terms). The text itself is
 * in content/legal/*.md; this file holds the page around it (hero, short
 * version icons, section list, footer). Both pages fill `{{LAST_UPDATED}}`
 * from one date.
 */
import type { IconName } from "./apply";
import { brand } from "./landing";

/** Shown as "Updated …" on both pages. Change it whenever either text changes. */
export const LAST_UPDATED = "7 November 2026";

/** A short-version bullet's sticker: an md icon, or "delete" (a trash can drawn inline). */
export type ShortVersionIcon = {
  icon: IconName | "delete";
  tint: "peach" | "butter" | "lime" | "pale";
};

export const legalPages = {
  privacy: {
    file: "privacy.md",
    title: "Privacy policy · Pesto",
    description:
      "How Pesto handles your family's information on the website, the Founding Families waitlist and the Pesto app: what we collect, why, who helps us, and how to delete it.",
    /** The h1: the first word in cream, the rest in orange. */
    heading: { lead: "Privacy", accent: "policy" },
    subtitle: "Plain words first, the full version after.",
    /** Pesto's speech bubble in the hero. */
    bubble: "No ads. No tracking. Pinky promise.",
    /** The footer button. */
    email: "privacy@pestokids.com",
    /** One per short-version bullet, in order. */
    icons: [
      { icon: "phone", tint: "lime" },
      { icon: "bubble", tint: "butter" },
      { icon: "note", tint: "peach" },
      { icon: "heart", tint: "pale" },
      { icon: "book", tint: "butter" },
      { icon: "delete", tint: "peach" },
      { icon: "globe", tint: "lime" },
    ] satisfies ShortVersionIcon[],
  },
  terms: {
    file: "terms.md",
    title: "Terms of use · Pesto",
    description:
      "The rules for using pestokids.com, applying to Pesto Founding Families and using the Pesto app, explained in plain words.",
    heading: { lead: "Terms", accent: "of use" },
    subtitle: "Short, and explained in plain words.",
    bubble: "Rule one: be nice. Rule two: see rule one.",
    email: brand.email,
    icons: [
      { icon: "book", tint: "lime" },
      { icon: "phone", tint: "butter" },
      { icon: "heart", tint: "peach" },
      { icon: "puzzle", tint: "pale" },
      { icon: "bubble", tint: "butter" },
      { icon: "delete", tint: "peach" },
      { icon: "globe", tint: "lime" },
      { icon: "note", tint: "lime" },
    ] satisfies ShortVersionIcon[],
  },
} as const;

export type LegalPageName = keyof typeof legalPages;

/** Copy shared by both pages. */
export const legalChrome = {
  updated: `Updated ${LAST_UPDATED}`,
  /** The section list: a closed disclosure on phones, a sidebar on desktop. */
  jumpTo: "Jump to a section",
  onThisPage: "On this page",
  /** Label above each plain-words note. The markdown starts each note with it. */
  noteLabel: "What this means",
  questions: "Questions?",
  replies: "We read every email. A real person replies.",
  linksLabel: "Home, privacy, terms and contact",
  links: [
    { id: "home", label: "Home", href: "/" },
    { id: "privacy", label: "Privacy", href: "/privacy" },
    { id: "terms", label: "Terms", href: "/terms" },
    { id: "contact", label: "Contact", href: "/contact" },
  ],
};
