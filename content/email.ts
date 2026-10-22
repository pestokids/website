/**
 * Copy for the confirmation email sent after an application is submitted.
 * Plain text on purpose: it reads like a note from a person, and renders the
 * same in every mail app.
 */
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
