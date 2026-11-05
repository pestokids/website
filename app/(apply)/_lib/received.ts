import { received } from "@/content/apply";
import type { DateConfig } from "@/lib/dates";

const HOUR = 60 * 60 * 1000;
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/**
 * Dates on screen 9, in the visitor's time zone:
 *  - `receivedOn`: the submit date, e.g. "Oct 21"
 *  - `sentWhen`: "Just now" within an hour of submitting, then the submit date
 * Records stored before the submit time was kept count as just submitted.
 */
export function receivedDates(
  submittedAt: number | undefined,
  now: Date,
): { receivedOn: string; sentWhen: string } {
  const at = submittedAt ?? now.getTime();
  const receivedOn = shortDate.format(new Date(at));
  const sentWhen = now.getTime() - at < HOUR ? received.sent.sub : receivedOn;
  return { receivedOn, sentWhen };
}

/**
 * The "What happens next" steps: application sent, say hi, the letter, and
 * the beta day once it's set (NEXT_PUBLIC_BETA_DATE is optional). Returns
 * the count for "1 of N done" and whether the Beta day row shows.
 */
export function nextSteps(betaDate: DateConfig | null): { total: number; betaDay: boolean } {
  return betaDate ? { total: 4, betaDay: true } : { total: 3, betaDay: false };
}
