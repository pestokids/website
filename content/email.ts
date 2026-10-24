/**
 * Copy for the emails Convex sends: the confirmation after an application is
 * submitted, and the team's daily digest. Plain text on purpose: it reads
 * like a note from a person, and renders the same in every mail app.
 */
import { parseIsoDate } from "../lib/dates";
import type { Family } from "./apply";

export type ConfirmationEmailData = {
  family: Family;
  kids: { name: string; age: string }[];
  whatsappUrl: string;
  /** e.g. "October 31" */
  betaDate: string;
  refCode: string;
};

const ageLabel = (age: string) => (age === "8+" ? "8 or older" : `age ${age}`);

export const confirmationEmail = {
  subject: "Your Founding Family application",
  text: ({ family, kids, whatsappUrl, betaDate, refCode }: ConfirmationEmailData) =>
    [
      "Hi there,",
      "",
      `Thank you for applying to Pesto Founding Families! We’ve got your application for ${family.names}:`,
      "",
      ...kids.map((kid) => `  • ${kid.name}, ${ageLabel(kid.age)}`),
      "",
      "Say hi to Pesto on WhatsApp. He’ll send a 2-minute story for " +
        `${family.names} to try tonight:`,
      whatsappUrl,
      "",
      `Beta day is ${betaDate}. Your Founding Family letter will be in your inbox within 48 hours.`,
      "",
      "Warmly,",
      "The Pesto team",
      "",
      `Your application code: ${refCode}`,
      "Didn’t apply? You can ignore this email.",
    ].join("\n"),
} as const;

export type DigestCounts = {
  total: number;
  bySourceType: { paid: number; organic: number; direct: number };
  /** Most first. */
  bySource: { source: string; count: number }[];
};

export type DigestEmailData = DigestCounts & {
  /** The Los Angeles day counted, YYYY-MM-DD. */
  date: string;
};

/** Sources come from UTMs, so anything can turn up; long ones are cut. */
const SOURCE_LABEL_MAX = 40;

const applications = (n: number) => `${n} new application${n === 1 ? "" : "s"}`;
const dayLabel = (date: string) => parseIsoDate(date)?.short ?? date;

function table(rows: [string, number][]): string[] {
  if (rows.length === 0) return ["  (none)"];
  const labels = rows.map(([label]) =>
    label.length > SOURCE_LABEL_MAX ? `${label.slice(0, SOURCE_LABEL_MAX - 1)}…` : label,
  );
  const width = Math.max(...labels.map((l) => l.length));
  return rows.map(([, count], i) => `  ${labels[i].padEnd(width)}  ${count}`);
}

/** Counts only: no kids' names or parent emails. */
export const digestEmail = {
  subject: ({ date, total }: DigestEmailData) =>
    `Founding Families: ${applications(total)} on ${dayLabel(date)}`,
  text: ({ date, total, bySourceType, bySource }: DigestEmailData) =>
    [
      `${applications(total)} on ${dayLabel(date)} (Pacific time).`,
      "",
      "By source type",
      ...table([
        ["paid", bySourceType.paid],
        ["organic", bySourceType.organic],
        ["direct", bySourceType.direct],
      ]),
      "",
      "By source",
      ...table(bySource.map(({ source, count }) => [source, count])),
      "",
      "Repeat submits from an existing email aren’t counted again.",
    ].join("\n"),
} as const;
