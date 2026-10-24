import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import QRCode from 'qrcode';
import { DRAFT_KEY, openApply, readStored, runOnlyOn } from './support/apply';

// An ad visit opened on a computer, plus a param that isn't attribution.
const visit = {
  utm_source: 'meta',
  utm_medium: 'paid_social',
  utm_campaign: 'e2e_campaign',
  utm_id: 'e2e-1',
  fbclid: 'e2e-fbclid',
};
const visitPath = `/apply?${new URLSearchParams({ ...visit, other: 'dropped' })}`;

/** Dark modules of a QR code as "row,col", from the app's SVG path ("M{col} {row}h{run}v1h-{run}z"). */
function modulesFromPath(d: string): string[] {
  const dark: string[] = [];
  for (const [, col, row, run] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(run); i++) dark.push(`${row},${Number(col) + i}`);
  }
  return dark.sort();
}

/** Dark modules of the QR code that encodes `value`, as the app generates it. */
function modulesFor(value: string): string[] {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: 'M' });
  const dark: string[] = [];
  for (let row = 0; row < modules.size; row++) {
    for (let col = 0; col < modules.size; col++) if (modules.get(row, col)) dark.push(`${row},${col}`);
  }
  return dark.sort();
}

test('desktop: continue on your phone', { tags: ['smoke'] }, async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['desktop']);
  // Capture what Copy link writes, without touching the real clipboard.
  await browser.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as unknown as { __copied: string }).__copied = text;
        },
      },
    });
  });
  await openApply(app, browser, visitPath);

  await expect(screen.getByRole('heading', 'Let’s continue on your phone.')).toBeVisible();
  await expect(screen.getByText('FOUNDING FAMILIES')).toBeVisible();
  await expect(screen.getByText('pestokids.com/apply')).toBeVisible();
  await expect(screen.getByText('Point your phone camera here')).toBeVisible();
  await expect(screen.getByText(/^3 minutes · 100 families · Admissions close /)).toBeVisible();
  // The flow isn't mounted: no welcome screen and no draft.
  await expect(screen.getByRole('button', 'Count us in')).toHaveCount(0);
  expect(await readStored(browser, DRAFT_KEY)).toBeNull();

  // Copy link: the current page with its attribution params plus via=desktop.
  await screen.getByRole('button', 'Copy link').tap();
  await expect(screen.getByRole('button', 'Copied!')).toBeVisible();
  const copied = await browser.evaluate(() => (window as unknown as { __copied?: string }).__copied ?? null);
  expect(copied).not.toBeNull();
  const handoff = new URL(copied!);
  expect(handoff.origin + handoff.pathname).toBe(new URL('/apply', app.baseUrl).toString());
  expect(Object.fromEntries(handoff.searchParams)).toEqual({ ...visit, via: 'desktop' });
  // "Copied!" reverts after about 2s.
  await expect(screen.getByRole('button', 'Copy link')).toBeVisible({ timeout: 5_000 });

  // The QR code encodes that same link.
  const d = await browser.locator('svg[aria-label="QR code for this page"] path').getAttribute('d');
  expect(modulesFromPath(d!)).toEqual(modulesFor(copied!));

  await agent.assert(
    'A card shows the headline "Let’s continue on your phone." on the left and a large QR code on the right',
    { vision: true },
  );
});

test('fold: the 984px-wide screen gets the flow', { tags: ['smoke'] }, async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['fold']);
  await openApply(app, browser, visitPath);
  await expect(screen.getByRole('heading', 'For kids who ask why?')).toBeVisible();
  await expect(screen.getByRole('button', 'Count us in')).toBeVisible();
  await expect(screen.getByRole('heading', 'Let’s continue on your phone.')).toHaveCount(0);
});
