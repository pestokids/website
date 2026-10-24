/**
 * Checks for screen 9 (Received), shared by every test that submits.
 */
import type { Browser } from '@e2e-dev/web';
import { expect, type Screen } from 'e2e';
import { DRAFT_KEY, readStored, SUBMITTED_KEY, todayShort, type StoredSubmitted } from './apply';

const REF_CODE = /^PF-[2-9A-HJ-NP-Z]{4}$/;

/** "2026-10-31" → "October 31", as the Beta day row shows it. */
function longDate(iso: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** "2026-10-31" → "20261031/20261101" (all-day events end exclusive). */
function allDayRange(iso: string): string {
  const start = new Date(`${iso}T00:00:00Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const compact = (d: Date) => d.toISOString().slice(0, 10).replaceAll('-', '');
  return `${compact(start)}/${compact(end)}`;
}

/**
 * Every personalised string on screen 9, the stored submitted record, and the
 * WhatsApp and calendar links. `names` is "Test Kid A", "Test Kid A & Test Kid B"
 * or "Test Kid A, Test Kid B & Test Kid C".
 */
export async function expectReceived(
  screen: Screen,
  browser: Browser,
  { names, kidNames, email }: { names: string; kidNames: string[]; email: string },
): Promise<StoredSubmitted> {
  await expect(screen.getByRole('heading', `You’re in the running, ${names}!`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(browser).toHaveURL(/\/apply\?step=received$/);

  // Stored for revisits; the draft is gone.
  const submitted = await readStored<StoredSubmitted>(browser, SUBMITTED_KEY);
  expect(submitted).toMatchObject({ email, kidNames });
  expect(submitted!.refCode).toMatch(REF_CODE);
  expect(await readStored(browser, DRAFT_KEY)).toBeNull();

  await expect(screen.getByText(`Application received · ${await todayShort(browser)}`)).toBeVisible();
  await expect(screen.getByRole('heading', 'What happens next')).toBeVisible();
  await expect(screen.getByText('1 of 4 done')).toBeVisible();
  await expect(screen.getByText('Application sent')).toBeVisible();
  await expect(screen.getByText('Just now')).toBeVisible();
  await expect(screen.getByText('Say hi to Pesto')).toBeVisible();
  await expect(
    screen.getByText(`He’ll send a 2-minute story for ${names} to try tonight.`),
  ).toBeVisible();
  await expect(screen.getByText(`Hi ${names}! Story time tonight?`)).toBeVisible();
  await expect(screen.getByText('Your Founding Family letter')).toBeVisible();
  await expect(screen.getByText('In your inbox within 48 hours')).toBeVisible();
  await expect(
    screen.getByText(`A copy of your application is on its way to ${email}`),
  ).toBeVisible();
  // No way back into the form from here.
  await expect(screen.getByRole('button', 'Back')).toHaveCount(0);

  // WhatsApp: wa.me/{number}?text=Hi Pesto! 👋 ({ref})
  const whatsapp = new URL((await screen.getByRole('link', 'Open WhatsApp').getAttribute('href'))!);
  expect(whatsapp.origin).toBe('https://wa.me');
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  expect(whatsapp.pathname).toMatch(number ? new RegExp(`^/${number}$`) : /^\/[1-9]\d{7,14}$/);
  expect(whatsapp.searchParams.get('text')).toBe(`Hi Pesto! 👋 (${submitted!.refCode})`);

  // Calendar: an all-day "Pesto beta day" Google Calendar template.
  const calendar = new URL((await screen.getByRole('link', '+ Calendar').getAttribute('href'))!);
  expect(calendar.origin + calendar.pathname).toBe('https://calendar.google.com/calendar/render');
  expect(calendar.searchParams.get('action')).toBe('TEMPLATE');
  expect(calendar.searchParams.get('text')).toBe('Pesto beta day');
  const dates = calendar.searchParams.get('dates')!;
  expect(dates).toMatch(/^\d{8}\/\d{8}$/);
  const betaIso = `${dates.slice(0, 4)}-${dates.slice(4, 6)}-${dates.slice(6, 8)}`;
  expect(dates).toBe(allDayRange(betaIso));
  const beta = process.env.NEXT_PUBLIC_BETA_DATE;
  if (beta) expect(betaIso).toBe(beta);
  await expect(screen.getByText('Beta day')).toBeVisible();
  await expect(screen.getByText(longDate(betaIso), { exact: true })).toBeVisible();

  return submitted!;
}
