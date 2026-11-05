import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { openApply, runOnlyOn } from './support/apply';

// Read-only: it never taps "Count us in", so it's safe to run against Production.
test('welcome screen', { tags: ['smoke'] }, async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-webkit', 'phone-chromium', 'fold']);
  await openApply(app, browser);

  await expect(
    screen.getByRole('heading', 'Interactive storybook for young kids', { level: 1 }),
  ).toBeVisible();
  await expect(
    screen.getByText('Stories your kids talk back to. Only 25 Founding Family spots left.'),
  ).toBeVisible();
  await expect(screen.getByRole('button', 'Count us in')).toBeEnabled();

  const closes = process.env.NEXT_PUBLIC_ADMISSIONS_CLOSE_DATE;
  const closesShort = closes
    ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${closes}T00:00:00Z`),
      )
    : null;

  // The facts: 3 min to apply, 25 spots left, and the close date (from config).
  const facts = (await browser.evaluate(() =>
    [...document.querySelectorAll('dl > div')].map(
      (fact) => `${fact.querySelector('dd')?.textContent} ${fact.querySelector('dt')?.textContent}`,
    ),
  )) as string[];
  expect(facts.slice(0, 2)).toEqual(['3 min to apply', '25 spots left']);
  expect(facts[2]).toMatch(
    closesShort ? `${closesShort} closes` : /^[A-Z][a-z]{2} \d{1,2} closes$/,
  );

  // The consent line right above the button links the legal pages, each in a new tab.
  await expect(
    screen.getByText('By continuing, you agree to our Terms and Privacy Policy.'),
  ).toBeVisible();
  for (const [name, href] of [
    ['Terms', '/terms'],
    ['Privacy Policy', '/privacy'],
  ]) {
    const link = screen.getByRole('link', name);
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('target', '_blank');
  }

  // Screen 1 has no header: no back button and no progress bar.
  await expect(screen.getByRole('button', 'Back')).toHaveCount(0);
  await expect(screen.getByRole('progressbar')).toHaveCount(0);

  await agent.assert(
    'A round green parrot mascot sits above the headline, with four small icon tiles around him, and three fact tiles sit under the headline',
    { vision: true },
  );
});
