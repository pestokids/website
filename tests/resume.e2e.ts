import { test } from '@e2e-dev/web';
import { expect, unique } from 'e2e';
import {
  DRAFT_KEY,
  KID_A,
  openApply,
  readStored,
  runOnlyOn,
  testEmail,
  type StoredDraft,
} from './support/apply';
import { expectReceived } from './support/received';

test('reload resumes mid-flow; after submit the form stays closed', async ({
  app,
  browser,
  screen,
  agent,
}) => {
  await runOnlyOn(browser, ['phone-chromium']);
  const email = testEmail();
  await openApply(app, browser);
  await screen.getByRole('button', 'Count us in').tap();

  await agent.act('add one kid named {name} and go to the next screen', { params: { name: KID_A } });
  await expect(screen.getByRole('heading', `How old is ${KID_A}?`)).toBeVisible();
  await screen.getByRole('button', /^6\s*years$/).tap();
  await screen.getByRole('button', `That’s ${KID_A}!`).tap();

  // Goals, half answered, then a reload: same step, same picks.
  await agent.act('drop {first} and {second} into the sentence', {
    params: { first: 'being kind', second: 'the world' },
  });
  await expect(screen.getByText('2 OF 3')).toBeVisible();
  await browser.reload();
  await expect(browser).toHaveURL(/\/apply\?step=goals$/);
  await expect(screen.getByRole('heading', `I want ${KID_A} to fall in love with…`)).toBeVisible();
  await expect(screen.getByRole('button', 'being kind')).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByRole('button', 'the world')).toHaveAttribute('aria-pressed', 'true');
  await expect(screen.getByText('2 OF 3')).toBeVisible();

  const draft = await readStored<StoredDraft>(browser, DRAFT_KEY);
  expect(draft).toMatchObject({ step: 'goals', kids: [{ name: KID_A, age: '6' }] });
  expect([...draft!.goals].sort()).toEqual(['being_kind', 'the_world']);

  // The browser back button walks the flow too.
  await browser.back();
  await expect(screen.getByRole('heading', `How old is ${KID_A}?`)).toBeVisible();
  await expect(screen.getByRole('button', /^6\s*years$/)).toHaveAttribute('aria-pressed', 'true');
  await screen.getByRole('button', `That’s ${KID_A}!`).tap();

  await screen.getByRole('button', 'That’s us').tap();
  await screen.getByRole('button', 'Continue').tap();
  await screen.getByRole('button', 'Grandparents').tap();
  await screen.getByRole('button', 'That’s their week').tap();
  await screen.getByRole('button', 'Continue').tap();
  await agent.act('type the email address {email}', { params: { email: unique(email) } });
  await expect(screen.getByLabel('Email')).toHaveValue(email);

  // Email is kept across a reload too.
  await browser.reload();
  await expect(browser).toHaveURL(/\/apply\?step=email$/);
  await expect(screen.getByLabel('Email')).toHaveValue(email);
  await screen.getByRole('button', 'Submit application').tap();
  await expectReceived(screen, browser, { names: KID_A, kidNames: [KID_A], email });

  const received = screen.getByRole('heading', `You’re in the running, ${KID_A}!`);

  // Back right after submitting doesn't reopen the form.
  await browser.back();
  await expect(received).toBeVisible();
  await expect(screen.getByLabel('Email')).toHaveCount(0);
  await expect(browser).toHaveURL(/\/apply\?step=received$/);

  // Revisiting the link shows screen 9 again, and back still doesn't reopen it.
  await openApply(app, browser, '/apply');
  await expect(received).toBeVisible();
  await expect(screen.getByRole('button', 'Count us in')).toHaveCount(0);
  await browser.back();
  await expect(received).toBeVisible();
  await expect(screen.getByRole('button', 'Back')).toHaveCount(0);
});
