import { test } from '@e2e-dev/web';
import { expect, unique } from 'e2e';
import { KID_A, KID_B, openApply, runOnlyOn, testEmail } from './support/apply';
import { expectReceived } from './support/received';

const names = `${KID_A} & ${KID_B}`;

test('two kids apply and reach the received screen', async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-webkit', 'phone-chromium']);
  const email = testEmail();
  await openApply(app, browser);

  // 1 Welcome → 2 Kids' names
  await screen.getByRole('button', 'Count us in').tap();
  await expect(screen.getByRole('heading', 'Who’s joining the adventure?')).toBeVisible();
  await expect(screen.getByRole('progressbar', 'Step 1 of 7')).toBeVisible();

  await agent.act('add two kids named {first} and {second}, then go to the next screen', {
    params: { first: KID_A, second: KID_B },
  });

  // 3 Ages, once per kid
  await expect(screen.getByRole('heading', `How old is ${KID_A}?`)).toBeVisible();
  await expect(screen.getByText('PESTO ASKS')).toBeVisible();
  await expect(screen.getByRole('button', 'Pick an age')).toBeDisabled();
  await agent.act('select the {age} years tile, without confirming', { params: { age: '5' } });
  await expect(screen.getByRole('button', /^5\s*years$/)).toHaveAttribute('aria-pressed', 'true');
  await screen.getByRole('button', `That’s ${KID_A}!`).tap();

  await expect(screen.getByRole('heading', `And how old is ${KID_B}?`)).toBeVisible();
  await expect(screen.getByText('PESTO ASKS · TEST KID A IS 5 ✓')).toBeVisible();
  await expect(screen.getByRole('progressbar', 'Step 2 of 7')).toBeVisible();
  await agent.act('select the {age} years tile, without confirming', { params: { age: '8+' } });
  await expect(screen.getByRole('button', /^8\+\s*years$/)).toHaveAttribute('aria-pressed', 'true');
  await screen.getByRole('button', `That’s ${KID_B}!`).tap();

  // 4 Goals
  await expect(
    screen.getByRole('heading', `I want ${names} to fall in love with…`),
  ).toBeVisible();
  await agent.act('drop {first} and {second} into the sentence', {
    params: { first: 'science', second: 'music' },
  });
  await expect(screen.getByRole('button', 'science')).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByRole('button', 'music')).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByText('2 OF 3')).toBeVisible();
  await screen.getByRole('button', 'That’s us').tap();

  // 5 How Pesto works
  await expect(
    screen.getByText(
      `Pesto is fun first. To ${names} it’s just playtime. The learning sneaks in along the way.`,
    ),
  ).toBeVisible();
  await screen.getByRole('button', 'Continue').tap();

  // 6 After school (two kids: "their")
  await expect(
    screen.getByRole('heading', 'After school, what keeps their brains busy?'),
  ).toBeVisible();
  await agent.act('pick {first} and {second}', {
    params: { first: 'Bedtime stories', second: 'Grandparents' },
  });
  await expect(screen.getByRole('button', 'Bedtime stories')).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByRole('button', 'Grandparents')).toHaveAttribute('aria-pressed', 'true');
  await screen.getByRole('button', 'That’s their week').tap();

  // 7 Why it works
  await expect(screen.getByRole('heading', 'Kids learn most when they play along.')).toBeVisible();
  await screen.getByRole('button', 'Continue').tap();

  // 8 Email
  await expect(
    screen.getByRole('heading', 'Where should we send your Founding Family letter?'),
  ).toBeVisible();
  await agent.act('type the email address {email}', { params: { email: unique(email) } });
  await expect(screen.getByLabel('Email')).toHaveValue(email);
  await expect(screen.getByText('Submit your application')).toBeVisible();
  await screen.getByRole('button', 'Submit application').tap();

  // 9 Received
  await expectReceived(screen, browser, { names, kidNames: [KID_A, KID_B], email });
  await agent.assert(
    'The screen confirms the application was received and offers a green "Open WhatsApp" button',
    { vision: true },
  );
});
