import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { openApply, runOnlyOn } from './support/apply';

/*
 * /privacy and /terms never scroll sideways, on any kind of screen: folded
 * phones' outer screens, phones upright and sideways, small tablets and open
 * foldables, tablets both ways, laptops and very wide monitors.
 */

const SIZES = [
  { width: 280, height: 653 }, // folded phone, outer screen
  { width: 344, height: 882 }, // folded phone, outer screen
  { width: 320, height: 568 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 844, height: 390 }, // phone sideways
  { width: 932, height: 430 }, // phone sideways
  { width: 600, height: 960 }, // small tablet
  { width: 673, height: 841 }, // open foldable
  { width: 720, height: 1000 },
  { width: 768, height: 1024 }, // tablet portrait
  { width: 820, height: 1180 },
  { width: 1024, height: 768 }, // tablet landscape
  { width: 1180, height: 820 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

describe('legal pages at every width', () => {
  for (const path of ['/privacy', '/terms']) {
    test(`${path} never scrolls sideways`, async ({ app, browser }) => {
      // Chromium and WebKit; the sizes come from the list, not the target.
      await runOnlyOn(browser, ['desktop', 'phone-webkit']);
      await openApply(app, browser, path);

      for (const size of SIZES) {
        await browser.setViewport(size);
        const measured = await browser.evaluate(
          () =>
            new Promise<{ width: number; scrollWidth: number }>((resolve) =>
              // Two frames, so the new width's layout is done.
              requestAnimationFrame(() =>
                requestAnimationFrame(() =>
                  resolve({
                    width: document.documentElement.clientWidth,
                    scrollWidth: document.documentElement.scrollWidth,
                  }),
                ),
              ),
            ),
        );
        // How far the page reaches past the window. The size is in the result, so a failure names it.
        expect({ ...size, overflow: measured.scrollWidth - measured.width }).toEqual({ ...size, overflow: 0 });
      }
    });
  }
});
