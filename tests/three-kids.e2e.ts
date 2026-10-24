import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { confirmName, KID_A, KID_B, KID_C, openApply, runOnlyOn, testEmail } from './support/apply';
import { expectReceived } from './support/received';

const names = `${KID_A}, ${KID_B} & ${KID_C}`;

test('three kids apply and reach the received screen', async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['phone-webkit']);
  const email = testEmail();
  await openApply(app, browser);

  // 1 Welcome → 2 Kids' names: A, B (state C), then C (state C3)
  await screen.getByRole('button', 'Count us in').tap();
  await screen.getByLabel('First kid’s name').fill(KID_A);
  await screen.getByRole('button', '+ Add another kid').tap();
  await confirmName(screen, KID_A);
  await screen.getByLabel('Second kid’s name').fill(KID_B);
  await screen.getByRole('button', '+ Add another kid').tap();
  await confirmName(screen, KID_B);
  await expect(screen.getByLabel('Third kid’s name')).toBeVisible();
  await expect(screen.getByRole('button', '+ Add another kid')).toHaveCount(0);
  await screen.getByLabel('Third kid’s name').fill(KID_C);
  await screen.getByRole('button', 'Next ›').tap();
  await confirmName(screen, KID_C);

  // 3 Ages, once per kid, all on progress segment 2
  await expect(screen.getByRole('heading', `How old is ${KID_A}?`)).toBeVisible();
  await expect(screen.getByText('PESTO ASKS')).toBeVisible();
  await expect(screen.getByRole('progressbar', 'Step 2 of 7')).toBeVisible();
  await screen.getByRole('button', /^5\s*years$/).tap();
  await screen.getByRole('button', `That’s ${KID_A}!`).tap();

  await expect(screen.getByRole('heading', `And how old is ${KID_B}?`)).toBeVisible();
  await expect(screen.getByText('PESTO ASKS · TEST KID A IS 5 ✓')).toBeVisible();
  await expect(screen.getByRole('progressbar', 'Step 2 of 7')).toBeVisible();
  await screen.getByRole('button', /^8\+\s*years$/).tap();
  await screen.getByRole('button', `That’s ${KID_B}!`).tap();

  await expect(screen.getByRole('heading', `And how old is ${KID_C}?`)).toBeVisible();
  await expect(screen.getByText('PESTO ASKS · TEST KID B IS 8+ ✓')).toBeVisible();
  await expect(screen.getByRole('progressbar', 'Step 2 of 7')).toBeVisible();
  await screen.getByRole('button', /^3\s*years$/).tap();
  await screen.getByRole('button', `That’s ${KID_C}!`).tap();

  // 4 Goals
  await expect(
    screen.getByRole('heading', `I want ${names} to fall in love with…`),
  ).toBeVisible();
  await expect(screen.getByRole('progressbar', 'Step 3 of 7')).toBeVisible();
  await screen.getByRole('button', 'science').tap();
  await screen.getByRole('button', 'That’s us').tap();

  // 5 How Pesto works
  await expect(
    screen.getByText(
      `Pesto is fun first. To ${names} it’s just playtime. The learning sneaks in along the way.`,
    ),
  ).toBeVisible();
  await screen.getByRole('button', 'Continue').tap();

  // 6 After school (plural: "their")
  await expect(
    screen.getByRole('heading', 'After school, what keeps their brains busy?'),
  ).toBeVisible();
  await screen.getByRole('button', 'Tutors').tap();
  await screen.getByRole('button', 'That’s their week').tap();

  // 7 Why it works
  await expect(screen.getByRole('heading', 'Kids learn most when they play along.')).toBeVisible();
  await screen.getByRole('button', 'Continue').tap();

  // 8 Email
  await screen.getByLabel('Email').fill(email);
  await expect(screen.getByText('Submit your application')).toBeVisible();
  await screen.getByRole('button', 'Submit application').tap();

  // 9 Received
  await expectReceived(screen, browser, { names, kidNames: [KID_A, KID_B, KID_C], email });
});
