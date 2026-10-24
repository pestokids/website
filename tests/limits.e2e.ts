import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { DRAFT_KEY, KID_A, KID_B, openApply, openWithDraft, readStored, runOnlyOn, type StoredDraft } from './support/apply';

test('kids stop at two', async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-chromium']);
  await openApply(app, browser);
  await screen.getByRole('button', 'Count us in').tap();

  await agent.act('type {name} as the first kid’s name and add another kid', {
    params: { name: KID_A },
  });
  // State C: kid 1 is a chip, the field is for kid 2, and "Add another kid" is gone.
  await expect(screen.getByLabel('Second kid’s name')).toBeVisible();
  await expect(screen.getByText(KID_A)).toBeVisible();
  await expect(screen.getByRole('button', '+ Add another kid')).toHaveCount(0);

  await screen.getByLabel('Second kid’s name').fill(KID_B);
  await screen.getByRole('button', 'Next ›').tap();
  await expect(screen.getByRole('heading', `How old is ${KID_A}?`)).toBeVisible();

  // Back on the names screen with two kids saved: the review list (state D),
  // still with no way to add a third.
  await screen.getByRole('button', 'Back').tap();
  await expect(screen.getByRole('heading', 'Your kids')).toBeVisible();
  await expect(screen.getByRole('button', `Remove ${KID_A}`)).toBeVisible();
  await expect(screen.getByRole('button', `Remove ${KID_B}`)).toBeVisible();
  await expect(screen.getByText('Founding Families is for up to 2 kids per family.')).toBeVisible();
  await expect(screen.getByRole('button', '+ Add another kid')).toHaveCount(0);
  await expect(screen.getByRole('textbox')).toHaveCount(0);

  const draft = await readStored<StoredDraft>(browser, DRAFT_KEY);
  expect(draft!.kids.map((k) => k.name)).toEqual([KID_A, KID_B]);
});

test('goals stop at three', async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-chromium']);
  await openWithDraft(app, browser, { step: 'goals', kids: [{ name: KID_A, age: '6' }] });

  await agent.act('drop {a}, {b} and {c} into the sentence', {
    params: { a: 'science', b: 'puzzles', c: 'new words' },
  });
  await expect(screen.getByText('3 OF 3')).toBeVisible();
  for (const goal of ['science', 'puzzles', 'new words']) {
    await expect(screen.getByRole('button', goal)).toHaveAttribute('aria-pressed', 'true');
  }
  // The other five are disabled, and the empty slot is gone.
  for (const goal of ['our stories', 'being kind', 'music', 'the world', 'making things']) {
    await expect(screen.getByRole('button', goal)).toBeDisabled();
  }
  await expect(screen.getByText('one more?')).toHaveCount(0);

  // Taking one out frees the rest again.
  await screen.getByRole('button', 'puzzles').tap();
  await expect(screen.getByText('2 OF 3')).toBeVisible();
  await expect(screen.getByRole('button', 'music')).toBeEnabled();

  const draft = await readStored<StoredDraft>(browser, DRAFT_KEY);
  expect([...draft!.goals].sort()).toEqual(['new_words', 'science']);
});
