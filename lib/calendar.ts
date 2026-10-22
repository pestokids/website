/**
 * "Add to calendar" links. A Google Calendar template URL works inside
 * in-app browsers, unlike .ics downloads.
 */

/** YYYY-MM-DD → YYYYMMDD, plus the day after (all-day events end exclusive). */
function allDayRange(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const compact = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
  return `${compact(new Date(Date.UTC(y, m - 1, d)))}/${compact(next)}`;
}

/** Google Calendar link for an all-day event on `isoDate` (YYYY-MM-DD). */
export function googleCalendarLink(title: string, isoDate: string): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: allDayRange(isoDate),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
