import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { DRAFT_KEY, KID_A, KID_B, openWithDraft, readStored, runOnlyOn, type StoredDraft } from './support/apply';

const CLEARED = 'Got it, just school. We cleared the others.';

test('"Mostly just school" is exclusive', async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-chromium']);
  await openWithDraft(app, browser, {
    step: 'after-school',
    kids: [
      { name: KID_A, age: '4' },
      { name: KID_B, age: '7' },
    ],
    goals: ['music'],
  });
  await expect(
    screen.getByRole('heading', 'After school, what keeps their brains busy?'),
  ).toBeVisible();
  await expect(screen.getByText('Tap everything that fits.')).toBeVisible();
  await expect(screen.getByRole('button', 'Pick at least one')).toBeDisabled();

  const school = screen.getByRole('button', 'Mostly just school');
  const chip = (label: string) => screen.getByRole('button', label);

  await agent.act('pick {first} and {second}', {
    params: { first: 'YouTube & cartoons', second: 'Tutors' },
  });
  await expect(chip('YouTube & cartoons')).toHaveAttribute('aria-pressed', 'true');
  await expect(chip('Tutors')).toHaveAttribute('aria-pressed', 'true');

  // Picking it clears the others and says so, politely.
  await school.tap();
  await expect(school).toHaveAttribute('aria-pressed', 'true');
  await expect(chip('YouTube & cartoons')).toHaveAttribute('aria-pressed', 'false');
  await expect(chip('Tutors')).toHaveAttribute('aria-pressed', 'false');
  const hint = screen.getByText(CLEARED);
  await expect(hint).toBeVisible();
  expect(
    await browser.evaluate(
      (text: string) =>
        [...document.querySelectorAll('[aria-live="polite"]')].some((el) => el.textContent === text),
      CLEARED,
    ),
  ).toBe(true);
  expect((await readStored<StoredDraft>(browser, DRAFT_KEY))!.afterSchool).toEqual(['mostly_school']);

  // The hint fades after about 3s.
  await expect(hint).toBeHidden({ timeout: 6_000 });

  // Picking another option drops it, silently.
  await chip('Bal Vihar').tap();
  await expect(chip('Bal Vihar')).toHaveAttribute('aria-pressed', 'true');
  await expect(school).toHaveAttribute('aria-pressed', 'false');
  await expect(screen.getByText(CLEARED)).toHaveCount(0);
  expect((await readStored<StoredDraft>(browser, DRAFT_KEY))!.afterSchool).toEqual(['bal_vihar']);

  // Tapping it with nothing else picked shows no hint.
  await chip('Bal Vihar').tap();
  await school.tap();
  await expect(school).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByText(CLEARED)).toHaveCount(0);
  await expect(screen.getByRole('button', 'That’s their week')).toBeEnabled();
});
