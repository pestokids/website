/**
 * Date-only (YYYY-MM-DD) values from env, formatted for display.
 * Pure and env-free, so both the Next.js app and Convex functions can use it.
 */

export type DateConfig = {
  /** ISO date, YYYY-MM-DD. */
  iso: string;
  /** e.g. "Nov 30" */
  short: string;
  /** e.g. "November 30" */
  long: string;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value: string): DateConfig | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  // Reject rollovers like 2026-02-31.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  const fmt = (month: "short" | "long") =>
    new Intl.DateTimeFormat("en-US", { month, day: "numeric", timeZone: "UTC" }).format(date);
  return { iso: value, short: fmt("short"), long: fmt("long") };
}
