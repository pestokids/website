import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { DRAFT_KEY, nameNudge, openApply, readStored, runOnlyOn, type StoredDraft } from './support/apply';

test('a likely-fake name gets one gentle nudge and never blocks', async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['phone-chromium']);
  await openApply(app, browser);
  await screen.getByRole('button', 'Count us in').tap();

  const field = screen.getByLabel('First kid’s name');
  const next = screen.getByRole('button', 'Next ›');

  // A keyboard mash: the first Next shows the nudge instead of moving on.
  await field.fill('asdf');
  await next.tap();
  await expect(nameNudge(screen, 'Asdf')).toBeVisible();
  await expect(screen.getByRole('button', 'Yes, that’s right')).toBeVisible();
  await expect(field).not.toHaveAttribute('aria-invalid');
  await expect(next).toBeEnabled();

  // Editing the name clears it; the new name is checked afresh.
  await field.fill('asdfg');
  await expect(nameNudge(screen, 'Asdf')).toHaveCount(0);
  await field.fill('asdf');
  await expect(nameNudge(screen, 'Asdf')).toHaveCount(0);

  // Once is enough: Next again carries on, with the name kept as typed.
  await next.tap();
  await expect(screen.getByRole('heading', 'How old is Asdf?')).toBeVisible();
  const draft = await readStored<StoredDraft>(browser, DRAFT_KEY);
  expect(draft!.kids).toEqual([{ name: 'Asdf', age: null }]);

  // Coming back with it saved: no second nudge.
  await screen.getByRole('button', 'Back').tap();
  await expect(field).toHaveValue('Asdf');
  await next.tap();
  await expect(screen.getByRole('heading', 'How old is Asdf?')).toBeVisible();
});

test('a real name goes straight through', async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['phone-chromium']);
  await openApply(app, browser);
  await screen.getByRole('button', 'Count us in').tap();

  // The screen's own placeholder name: nothing personal.
  await screen.getByLabel('First kid’s name').fill('Meera');
  await screen.getByRole('button', 'Next ›').tap();
  await expect(screen.getByRole('heading', 'How old is Meera?')).toBeVisible();
});
