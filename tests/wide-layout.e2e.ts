import { test, type Browser } from '@e2e-dev/web';
import { expect, type Locator } from 'e2e';
import { KID_A, openApply, openWithDraft, runOnlyOn } from './support/apply';

/**
 * Wide screens keep each step's phone layout in a centred 402px column:
 * content stays where it is on the phone (top-aligned), and the bottom button
 * sits 110px below its phone position. The phone reference is 402 wide with
 * 720px of visible height (the in-app browser on a 402×874 phone).
 */
const PHONE = { width: 402, height: 720 };
const COLUMN = 402;
const LIFT = 110;

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

/** Measures `content` and `button` on the fold, then again at the phone reference size. */
async function measure(browser: Browser, content: Locator, button: Locator) {
  const wide = { width: await browser.evaluate(() => window.innerWidth), content: await boxOf(content), button: await boxOf(button) };
  await browser.setViewport(PHONE);
  await browser.reload();
  await expect(button).toBeVisible();
  const phone = { content: await boxOf(content), button: await boxOf(button) };
  return { wide, phone };
}

function expectWideRule({ wide, phone }: Awaited<ReturnType<typeof measure>>) {
  const columnLeft = (wide.width - COLUMN) / 2;
  // Centred 402px column, with the phone's 20px margins inside it.
  expect(wide.button.x).toBeCloseTo(columnLeft + 20, 0);
  expect(wide.button.width).toBeCloseTo(COLUMN - 40, 0);
  // Top-aligned: content keeps its phone position.
  expect(Math.abs(wide.content.y - phone.content.y)).toBeLessThanOrEqual(1);
  // The button is 110px below where it sits on the phone.
  const wideBottom = wide.button.y + wide.button.height;
  const phoneBottom = phone.button.y + phone.button.height;
  expect(Math.abs(wideBottom - phoneBottom - LIFT)).toBeLessThanOrEqual(1);
}

test('wide layout: welcome', async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['fold']);
  await openApply(app, browser);
  const headline = screen.getByRole('heading', 'For kids who ask why?');
  const button = screen.getByRole('button', 'Count us in');
  await expect(button).toBeVisible();
  expectWideRule(await measure(browser, headline, button));
});

test('wide layout: goals', async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['fold']);
  await openWithDraft(app, browser, { step: 'goals', kids: [{ name: KID_A, age: '5' }] });
  const headline = screen.getByRole('heading', `I want ${KID_A} to fall in love with…`);
  const button = screen.getByRole('button', 'Pick at least one');
  await expect(button).toBeVisible();
  expectWideRule(await measure(browser, headline, button));
});
