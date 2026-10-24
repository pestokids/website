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

  // The top strip repeats "3 minutes ✦ 100 families ✦ Admissions close …" to
  // fill the width. Screen readers get it once: every other copy and every
  // star is aria-hidden. Collect the text a screen reader can reach (not
  // aria-hidden, and not inside the page's inline scripts).
  const spoken = await browser.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const hidden = node.parentElement?.closest('[aria-hidden="true"], script, style, noscript, template');
      if (!hidden) parts.push(node.textContent ?? '');
    }
    return parts.join('');
  });
  expect(spoken.split('3 minutes').length - 1).toBe(1);
  expect(spoken).not.toContain('✦');
  expect(spoken).toMatch(
    closesShort
      ? `3 minutes, 100 families, Admissions close ${closesShort}`
      : /3 minutes, 100 families, Admissions close [A-Z][a-z]{2} \d{1,2}/,
  );

  // The consent line under the button links the legal pages, each in a new tab.
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
    'Under the headline there is a row of four tilted icon stickers, and a green mascot sticker sits above the headline',
    { vision: true },
  );
});
