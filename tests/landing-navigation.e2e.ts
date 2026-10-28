import { describe, test, type Browser } from '@e2e-dev/web';
import { expect, type Screen } from 'e2e';
import { openApply, runOnlyOn, type TargetName } from './support/apply';

/*
 * Leaving the landing page by a link. Next keeps the landing page in the DOM,
 * hidden, so Back can restore it: nothing it styles may reach the next page.
 */

// A query, so hydration shows: it adds the query to the button's link.
const landingPath = '/?utm_source=e2e';
const applyPath = '/apply?utm_source=e2e';

const destinations = [
  { name: 'Privacy', path: '/privacy', heading: 'Privacy policy' },
  { name: 'Terms', path: '/terms', heading: 'Terms of use' },
  { name: 'Get in early', path: '/apply', heading: null },
] as const;

/** Opens / and waits for hydration, so its links navigate client-side. */
async function openLanding(browser: Browser, screen: Screen) {
  await expect(screen.getByRole('link', 'Get in early')).toHaveAttribute('href', applyPath);
  // Gone after a full page load: proves the next page came from a client-side navigation.
  await browser.evaluate(() => {
    (window as unknown as { softNav: boolean }).softNav = true;
    return null;
  });
}

/** Taps a link on /, through the menu on phones. */
async function tapLink(screen: Screen, target: TargetName, name: string) {
  if (name !== 'Get in early' && target !== 'desktop') {
    await screen.getByRole('button', 'Menu').tap();
  }
  await screen.getByRole('link', name).tap();
}

function readScroll(browser: Browser) {
  return browser.evaluate(() => ({
    softNav: (window as unknown as { softNav?: boolean }).softNav === true,
    overflowY: getComputedStyle(document.documentElement).overflowY,
    scrollY: Math.round(window.scrollY),
    tall: document.documentElement.scrollHeight > window.innerHeight,
  }));
}

/** Asserts the page scrolls by wheel (or keyboard, where the wheel isn't sent). */
async function expectScrolls(browser: Browser, target: TargetName) {
  const before = await readScroll(browser);
  expect(before).toMatchObject({ softNav: true, scrollY: 0, tall: true });
  expect(before.overflowY).not.toBe('hidden');

  if (target === 'phone-webkit') {
    // Playwright's mobile WebKit has no wheel.
    await browser.keyboard.press('PageDown');
  } else {
    await browser.mouse.move(200, 400);
    await browser.mouse.wheel(0, 500);
  }
  await expect.poll(async () => (await readScroll(browser)).scrollY).toBeGreaterThan(0);
}

/** Where the hero's pieces are laid out (offsets ignore the entrance animations). */
function readHero(browser: Browser) {
  return browser.evaluate(() => {
    const landing = document.querySelector<HTMLElement>('.landing')!.getBoundingClientRect();
    const box = (selector: string) => {
      const el = document.querySelector<HTMLElement>(`.landing ${selector}`)!;
      return [el.offsetLeft, el.offsetTop, el.offsetWidth, el.offsetHeight];
    };
    const root = document.documentElement;
    return {
      landing: [landing.x, landing.y, landing.width, landing.height],
      viewport: [window.innerWidth, window.innerHeight],
      headline: box('h1'),
      button: box('.cta'),
      stage: box('.stage'),
      scrollY: window.scrollY,
      // Nothing to scroll, so no scrollbar takes width.
      scrollHeight: root.scrollHeight <= window.innerHeight,
      scrollbar: window.innerWidth - root.clientWidth,
    };
  });
}

describe('leaving the landing page', () => {
  for (const destination of destinations) {
    test(`${destination.name} opens a page that scrolls`, async ({ app, browser, screen }) => {
      const target = await runOnlyOn(browser, ['phone-webkit', 'phone-chromium', 'desktop']);
      await openApply(app, browser, landingPath);
      await openLanding(browser, screen);
      await tapLink(screen, target, destination.name);

      if (destination.heading) {
        await expect(browser).toHaveURL(new RegExp(`${destination.path}$`));
        await expect(screen.getByRole('heading', destination.heading)).toBeVisible();
      } else {
        await expect(browser).toHaveURL(new RegExp(`${applyPath.replace('?', '\\?')}$`));
        // /apply fits a phone and a laptop, so make the window short enough to scroll.
        await expect(
          target === 'desktop'
            ? screen.getByRole('heading', 'Let’s continue on your phone.')
            : screen.getByRole('button', 'Count us in'),
        ).toBeVisible();
        await browser.setViewport({ width: target === 'desktop' ? 1440 : 402, height: 400 });
      }
      await expectScrolls(browser, target);
    });
  }

  test('Back from /privacy restores the hero in place', async ({ app, browser, screen }) => {
    const target = await runOnlyOn(browser, ['phone-webkit', 'phone-chromium', 'desktop']);
    await openApply(app, browser, landingPath);
    await openLanding(browser, screen);
    const hero = await readHero(browser);
    expect(hero).toMatchObject({ scrollY: 0, scrollHeight: true, scrollbar: 0 });
    expect(hero.landing).toEqual([0, 0, ...hero.viewport]);

    await tapLink(screen, target, 'Privacy');
    await expect(screen.getByRole('heading', 'Privacy policy')).toBeVisible();
    await expectScrolls(browser, target);

    await browser.back();
    await expect(browser).toHaveURL(new RegExp(`${landingPath.replace('?', '\\?')}$`));
    await expect(screen.getByRole('heading', 'For kids who ask why?')).toBeVisible();
    expect((await readScroll(browser)).softNav).toBe(true);
    expect(await readHero(browser)).toEqual(hero);
  });
});
