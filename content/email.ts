/**
 * Copy for the emails Convex sends: the confirmation after someone joins the
 * waitlist, and the alert the team gets for every application. Plain text on
 * purpose: it reads like a note from a person, and renders the same in every
 * mail app.
 *
 * Founding Families is closed, so nothing here promises a spot or a date.
 */
import {
  afterSchoolOptions,
  goalOptions,
  retiredAfterSchoolOptions,
  retiredGoalOptions,
  type Family,
} from "./apply";

export type ConfirmationEmailData = {
  family: Family;
  kids: { name: string; age: string }[];
  whatsappUrl: string;
  /** e.g. "October 31". Null until the beta day is set: the email then leaves it out. */
  betaDate: string | null;
  refCode: string;
};

const ageLabel = (age: string) => (age === "8+" ? "8 or older" : `age ${age}`);

export const confirmationEmail = {
  subject: "You’re on the Pesto waitlist",
  text: ({ family, kids, whatsappUrl, betaDate, refCode }: ConfirmationEmailData) =>
    [
      "Hi there,",
      "",
      `Thanks for joining the Pesto waitlist! We’ve got your details for ${family.names}:`,
      "",
      ...kids.map((kid) => `  • ${kid.name}, ${ageLabel(kid.age)}`),
      "",
      "Founding Families is now closed, so we can’t promise a spot or a date. " +
        "We’ll email you if a spot opens up.",
      ...(betaDate ? ["", `Beta day is ${betaDate}.`] : []),
      "",
      "In the meantime, say hi to Pesto on WhatsApp:",
      whatsappUrl,
      "",
      "Warmly,",
      "The Pesto team",
      "",
      `Your application code: ${refCode}`,
      "Didn’t apply? You can ignore this email.",
    ].join("\n"),
} as const;

export type ApplicationAlertData = {
  /** False when an existing applicant submitted again and changed their answers. */
  isNew: boolean;
  family: Family;
  email: string;
  kids: { name: string; age: string }[];
  /** True when a kid's name looked made up and the parent confirmed it anyway. */
  nameFlagged: boolean;
  goals: string[];
  afterSchool: string[];
  sourceType: string;
  source: string;
  campaign?: string;
  refCode: string;
  /** e.g. "Nov 27, 9:14 AM", in Pacific time. */
  submittedLabel: string;
};

const goalLabels = new Map<string, string>(
  [...goalOptions, ...retiredGoalOptions].map((o) => [o.slug, o.label]),
);
const afterSchoolLabels = new Map<string, string>(
  [...afterSchoolOptions, ...retiredAfterSchoolOptions].map((o) => [o.slug, o.label]),
);
const labelled = (slugs: string[], labels: Map<string, string>) =>
  slugs.length === 0 ? "(none)" : slugs.map((s) => labels.get(s) ?? s).join(", ");

/** One email per application, to the team. */
export const applicationAlertEmail = {
  subject: ({ isNew, family }: ApplicationAlertData) =>
    `${isNew ? "New" : "Updated"} waitlist application: ${family.names}`,
  text: (d: ApplicationAlertData) =>
    [
      d.isNew
        ? `New waitlist application, ${d.submittedLabel} (Pacific time).`
        : `${d.email} applied before and just submitted again, ${d.submittedLabel} (Pacific time). These are their new answers.`,
      "",
      `Parent email: ${d.email}`,
      "Kids:",
      ...d.kids.map((kid) => `  • ${kid.name}, ${ageLabel(kid.age)}`),
      ...(d.nameFlagged ? ["  (A name looked made up; the parent confirmed it.)"] : []),
      `Wants them to love: ${labelled(d.goals, goalLabels)}`,
      `After school: ${labelled(d.afterSchool, afterSchoolLabels)}`,
      "",
      `Source: ${d.sourceType} · ${d.source}${d.campaign ? ` · ${d.campaign}` : ""}`,
      `Application code: ${d.refCode}`,
    ].join("\n"),
} as const;
