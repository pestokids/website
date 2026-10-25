import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { DRAFT_KEY, openApply, readStored, runOnlyOn, type StoredDraft } from './support/apply';

// A shared-link visit with made-up values, plus a param /apply must not get.
const visit = {
  utm_source: 'e2e',
  utm_medium: 'referral',
  utm_campaign: 'e2e_landing',
  gclid: 'e2e-gclid',
  via: 'inv-e2e',
};
const visitPath = `/?${new URLSearchParams({ ...visit, step: 'email' })}`;
const applyPath = `/apply?${new URLSearchParams(visit)}`;

const links = [
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
  { name: /^Contact/, href: 'mailto:hello@pestokids.com' },
  { name: /^Instagram/, href: 'https://www.instagram.com/pesto.kids' },
] as const;

describe('home', () => {
  test('loads', { tags: ['smoke'] }, async ({ app, browser, screen }) => {
    await openApply(app, browser, '/');
    await expect(browser).toHaveTitle(/Pesto/);
    await expect(screen.getByRole('heading', 'For kids who ask why?')).toBeVisible();
    await expect(screen.getByRole('link', 'Get in early')).toBeVisible();
    await expect(screen.getByRole('link', 'pesto')).toHaveAttribute('href', '/');
  });

  test('is ready for search and link previews', { tags: ['smoke'] }, async ({ app, browser }) => {
    await runOnlyOn(browser, ['desktop']);
    await openApply(app, browser, '/');
    const head = await browser.evaluate(() => {
      const content = (selector: string) => document.head.querySelector(selector)?.getAttribute('content') ?? null;
      return {
        h1s: document.querySelectorAll('h1').length,
        canonical: document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
        image: content('meta[property="og:image"]'),
        width: content('meta[property="og:image:width"]'),
        height: content('meta[property="og:image:height"]'),
        alt: content('meta[property="og:image:alt"]'),
        card: content('meta[name="twitter:card"]'),
      };
    });
    expect(head).toMatchObject({
      h1s: 1,
      canonical: 'https://pestokids.com/',
      width: '1200',
      height: '630',
      card: 'summary_large_image',
    });
    expect(head.image).toMatch(/^https:\/\/pestokids\.com\/share\/card-\w+\.jpg$/);
    expect(head.alt).toMatch(/For kids who ask why\?/);

    // The tag points at production; fetch the same path from the app under test.
    const served = await browser.evaluate(async (image: string) => {
      const response = await fetch(new URL(image).pathname);
      return { status: response.status, type: response.headers.get('content-type') };
    }, head.image!);
    expect(served).toEqual({ status: 200, type: 'image/jpeg' });
  });

  test('the button goes to /apply with the UTMs kept', async ({ app, browser, screen }) => {
    const target = await runOnlyOn(browser, ['phone-webkit', 'phone-chromium', 'desktop']);
    await openApply(app, browser, visitPath);
    const button = screen.getByRole('link', 'Get in early');
    // The prerendered link is plain /apply; hydration adds the visit's params.
    await expect(button).toHaveAttribute('href', applyPath);
    await button.tap();
    await expect(browser).toHaveURL(new RegExp(`${applyPath.replace(/[?]/g, '\\?')}$`));

    if (target === 'desktop') return; // Computers get the "continue on your phone" screen.
    await expect(screen.getByRole('button', 'Count us in')).toBeVisible();
    const draft = await readStored<StoredDraft>(browser, DRAFT_KEY);
    expect(draft!.attribution).toMatchObject(visit);
    expect(draft!.attribution).not.toHaveProperty('step');
  });

  test('the phone menu opens and closes', async ({ app, browser, screen }) => {
    const target = await runOnlyOn(browser, ['phone-webkit', 'phone-chromium']);
    await openApply(app, browser, '/');
    const menu = screen.getByRole('button', 'Menu');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(screen.getByRole('link', 'Privacy')).toBeHidden();

    // Tap open: all four links, with the address and handle under them.
    await menu.tap();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    for (const link of links) {
      await expect(screen.getByRole('link', link.name)).toHaveAttribute('href', link.href);
      await expect(screen.getByRole('link', link.name)).toBeVisible();
    }
    await expect(screen.getByText('hello@pestokids.com')).toBeVisible();
    await expect(screen.getByText('@pesto.kids')).toBeVisible();
    const instagram = screen.getByRole('link', /^Instagram/);
    await expect(instagram).toHaveAttribute('target', '_blank');
    await expect(instagram).toHaveAttribute('rel', 'me noopener');

    // Escape closes it.
    await browser.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(screen.getByRole('link', 'Privacy')).toBeHidden();

    // A tap outside closes it.
    await menu.tap();
    await expect(screen.getByRole('link', 'Privacy')).toBeVisible();
    await screen.tapAt({ x: 40, y: 400 });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(screen.getByRole('link', 'Privacy')).toBeHidden();

    // Keyboard: Enter opens it and Tab moves into the links.
    await menu.focus();
    await browser.keyboard.press('Enter');
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    // Safari's Tab skips links unless Option is held (its default setting).
    await browser.keyboard.press(target === 'phone-webkit' ? 'Alt+Tab' : 'Tab');
    expect(await browser.evaluate(() => document.activeElement?.textContent ?? '')).toBe('Privacy');
    await browser.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(await browser.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')).toBe('Menu');
  });

  test('wide screens show the four links inline', async ({ app, browser, screen }) => {
    await runOnlyOn(browser, ['fold', 'desktop']);
    await openApply(app, browser, '/');
    await expect(screen.getByRole('button', 'Menu')).toBeHidden();
    for (const link of links) {
      await expect(screen.getByRole('link', link.name)).toHaveAttribute('href', link.href);
      await expect(screen.getByRole('link', link.name)).toBeVisible();
    }
    await expect(screen.getByText('hello@pestokids.com')).toBeHidden();
    await expect(screen.getByRole('link', /^Instagram/)).toHaveAttribute('rel', 'me noopener');
  });

  test('reduced motion shows the still scene', async ({ app, browser, screen }) => {
    await runOnlyOn(browser, ['phone-chromium', 'desktop']);
    await browser.emulateMedia({ reducedMotion: 'reduce' });
    await openApply(app, browser, '/');
    await expect(screen.getByRole('heading', 'For kids who ask why?')).toBeVisible();
    const still = await browser.evaluate(() => {
      const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
      return {
        pesto: style('.pesto img').animationName,
        flowers: style('.front img').animationName,
        headline: style('h1').opacity,
        layer: style('.layer.front').transform,
      };
    });
    expect(still).toEqual({ pesto: 'none', flowers: 'none', headline: '1', layer: 'none' });
  });
});
