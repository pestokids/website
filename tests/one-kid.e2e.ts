import { test } from '@e2e-dev/web';
import { expect, unique } from 'e2e';
import { KID_A, openWithDraft, runOnlyOn, testEmail } from './support/apply';
import { expectReceived } from './support/received';

test('one kid: singular copy and possessives', async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-webkit']);
  const email = testEmail();
  // Names and age are covered by the two-kid path; start at Goals.
  await openWithDraft(app, browser, { step: 'goals', kids: [{ name: KID_A, age: '4' }] });

  // 4 Goals
  await expect(screen.getByRole('heading', `I want ${KID_A} to fall in love with…`)).toBeVisible();
  await expect(screen.getByText('tap a word below')).toBeVisible();
  await expect(screen.getByRole('button', 'Pick at least one')).toBeDisabled();
  await agent.act('drop {goal} into the sentence', { params: { goal: 'our stories' } });
  await expect(screen.getByRole('button', 'our stories')).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByText('one more?')).toBeVisible();
  await screen.getByRole('button', 'That’s us').tap();

  // 5 How Pesto works
  await expect(
    screen.getByText(
      `Pesto is fun first. To ${KID_A} it’s just playtime. The learning sneaks in along the way.`,
    ),
  ).toBeVisible();
  await screen.getByRole('button', 'Continue').tap();

  // 6 After school (one kid: possessive)
  await expect(
    screen.getByRole('heading', `After school, what keeps ${KID_A}’s brain busy?`),
  ).toBeVisible();
  await agent.act('pick {option}', { params: { option: 'Bal Vihar' } });
  await expect(screen.getByRole('button', 'Bal Vihar')).toHaveAttribute('aria-pressed', 'true');
  await screen.getByRole('button', 'That’s their week').tap();

  // 7 Why it works → 8 Email
  await screen.getByRole('button', 'Continue').tap();
  await agent.act('type the email address {email}', { params: { email: unique(email) } });
  await expect(screen.getByLabel('Email')).toHaveValue(email);
  await screen.getByRole('button', 'Submit application').tap();

  // 9 Received
  await expectReceived(screen, browser, { names: KID_A, kidNames: [KID_A], email });
});
