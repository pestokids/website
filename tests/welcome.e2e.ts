import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { openApply, runOnlyOn } from './support/apply';

// Read-only: it never taps "Count us in", so it's safe to run against Production.
test('welcome screen', { tags: ['smoke'] }, async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-webkit', 'phone-chromium', 'fold']);
  await openApply(app, browser);

  await expect(screen.getByRole('heading', 'For kids who ask why?', { level: 1 })).toBeVisible();
  await expect(screen.getByRole('button', 'Count us in')).toBeEnabled();

  const closes = process.env.NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE;
  const closesShort = closes
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${closes}T00:00:00Z`),
      )
    : null;
  await expect(
    screen.getByText(/^3 minutes · 100 families · Admissions close /),
  ).toHaveText(
    closesShort
      ? `3 minutes · 100 families · Admissions close ${closesShort}`
      : /^3 minutes · 100 families · Admissions close [A-Z][a-z]{2} \d{1,2}$/,
  );

  // Screen 1 has no header: no back button and no progress bar.
  await expect(screen.getByRole('button', 'Back')).toHaveCount(0);
  await expect(screen.getByRole('progressbar')).toHaveCount(0);

  await agent.assert(
    'Under the headline there is a row of four tilted icon stickers, and a green mascot sticker sits above the headline',
    { vision: true },
  );
});
