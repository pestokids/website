import { test, type Browser } from '@e2e-dev/web';
import { expect, type Locator } from 'e2e';
import { KID_A, openApply, openWithDraft, runOnlyOn } from './support/apply';

/**
 * Wide screens show each step's phone layout in a centred 402px white card
 * over the Forest night backdrop. Inside the card, content keeps its phone
 * position under a 44px top gap, and the bottom button sits 110px below its
 * phone position, measured from the card's top (the card is at most 860px
 * tall, so on the fold that's 16px + the footer's padding off its bottom).
 * The phone reference is 402 wide with 720px of visible height (the in-app
 * browser on a 402×874 phone).
 */
const PHONE = { width: 402, height: 720 };
const COLUMN = 402;
const CARD_MAX_H = 860;
const CARD_TOP_GAP = 44;
const LIFT = 110;

type Box = { x: number; y: number; width: number; height: number };

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

/** Measures the card, `content` and `button` on the fold, then again at the phone reference size. */
async function measure(browser: Browser, content: Locator, button: Locator) {
  const wide = {
    viewport: await browser.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight })),
    card: await browser.evaluate(() => {
      const r = document.querySelector('.pz-card')!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }),
    content: await boxOf(content),
    button: await boxOf(button),
  };
  await browser.setViewport(PHONE);
  await browser.reload();
  await expect(button).toBeVisible();
  const phone = { content: await boxOf(content), button: await boxOf(button) };
  return { wide, phone };
}

function expectWideRule({ wide, phone }: Awaited<ReturnType<typeof measure>>) {
  const { viewport, card } = wide;
  // A centred 402px card, as tall as the phone design allows.
  expect(card.width).toBeCloseTo(COLUMN, 0);
  expect(card.x).toBeCloseTo((viewport.width - COLUMN) / 2, 0);
  expect(card.height).toBeCloseTo(Math.min(CARD_MAX_H, viewport.height - 64), 0);
  expect(card.y).toBeCloseTo((viewport.height - card.height) / 2, 0);
  // The phone's 20px margins inside it.
  expect(wide.button.x).toBeCloseTo(card.x + 20, 0);
  expect(wide.button.width).toBeCloseTo(COLUMN - 40, 0);
  // Top-aligned: content keeps its phone position, under the card's top gap.
  expect(Math.abs(wide.content.y - card.y - CARD_TOP_GAP - phone.content.y)).toBeLessThanOrEqual(1);
  // The button is 110px below where it sits on the phone, from the card's top.
  const wideBottom = wide.button.y + wide.button.height - card.y;
  const phoneBottom = phone.button.y + phone.button.height;
  expect(Math.abs(wideBottom - phoneBottom - LIFT)).toBeLessThanOrEqual(1);
}

test('wide layout: welcome', async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['fold']);
  await openApply(app, browser);
  const headline = screen.getByRole('heading', 'Interactive storybook for young kids');
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
