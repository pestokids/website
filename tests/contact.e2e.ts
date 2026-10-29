import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { openApply, runOnlyOn } from './support/apply';

// The support URL given to the App Store and Google Play.
describe('contact', () => {
  test('loads, with one heading and the email button', { tags: ['smoke'] }, async ({ app, browser, screen }) => {
    await runOnlyOn(browser, ['phone-webkit', 'phone-chromium', 'desktop']);
    await openApply(app, browser, '/contact');
    await expect(browser).toHaveTitle('Contact · Pesto');
    await expect(screen.getByRole('heading', 'Contact us')).toBeVisible();
    expect(await browser.evaluate(() => document.querySelectorAll('h1').length)).toBe(1);

    const button = screen.getByRole('link', 'Email us');
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute('href', 'mailto:hello@pestokids.com');
    await expect(screen.getByText('hello@pestokids.com')).toBeVisible();
    await expect(screen.getByText('We usually reply within a day or two.')).toBeVisible();

    for (const [name, href] of [
      ['Home', '/'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ]) {
      await expect(screen.getByRole('link', name)).toHaveAttribute('href', href);
    }
  });

  test('is ready for search', async ({ app, browser }) => {
    await runOnlyOn(browser, ['desktop']);
    await openApply(app, browser, '/contact');
    const head = await browser.evaluate(() => ({
      canonical: document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
      robots: document.head.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
      description: document.head.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
    }));
    expect(head).toMatchObject({ canonical: 'https://pestokids.com/contact', robots: null });
    expect(head.description).toContain('hello@pestokids.com');
  });
});
