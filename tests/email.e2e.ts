import { test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { KID_A, openWithDraft, readStored, runOnlyOn, SUBMITTED_KEY, type SeedDraft } from './support/apply';

const atEmail: SeedDraft = {
  step: 'email',
  kids: [{ name: KID_A, age: '5' }],
  goals: ['science'],
  afterSchool: ['tutors'],
};

test('email: ghost suggestion, typo fix and a long address', async ({ app, browser, screen, agent }) => {
  await runOnlyOn(browser, ['phone-webkit']);
  await openWithDraft(app, browser, atEmail);

  const field = screen.getByLabel('Email');
  const submit = screen.getByRole('button', 'Submit application');
  // Tapping the headline blurs the field (WebKit doesn't Tab off a field to buttons).
  const blur = () =>
    screen.getByRole('heading', 'Where should we send your Founding Family letter?').tap();
  await expect(field).toBeFocused();
  await expect(screen.getByText('Enter your email to submit')).toBeVisible();
  await expect(submit).toBeDisabled();

  // Local part only: the ghost completes to @gmail.com, the gmail chip is the
  // suggestion, and submit stays disabled until it's accepted.
  await field.fill('test.parent');
  const ghost = browser.locator('[aria-hidden="true"]').filter({ hasText: '@gmail.com' });
  await expect(ghost).toBeVisible();
  await expect(screen.getByText('Finish your email to submit')).toBeVisible();
  await expect(submit).toBeDisabled();
  expect(await screen.getByRole('button', '@gmail.com').getAttribute('class')).toContain(
    'border-lime-deep',
  );

  await field.press('Tab');
  await expect(field).toHaveValue('test.parent@gmail.com');
  await expect(ghost).toHaveCount(0);
  await expect(submit).toBeEnabled();
  await expect(screen.getByText('Submit your application')).toBeVisible();
  await expect(screen.getByText('Only used for your application. Never shared.')).toBeVisible();

  // Another domain chip completes with that domain.
  await field.fill('test.parent');
  await screen.getByRole('button', '@icloud.com').tap();
  await expect(field).toHaveValue('test.parent@icloud.com');
  await expect(submit).toBeEnabled();

  // A likely typo: orange "Did you mean" with a fix chip that replaces the value.
  await field.fill('test.parent@gmial.com');
  await blur();
  await expect(screen.getByText(/^Hmm, that doesn’t look right\. Did you mean/)).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(screen.getByText('Fix your email to submit')).toBeVisible();
  await expect(submit).toBeDisabled();
  await screen.getByRole('button', 'test.parent@gmail.com →').tap();
  await expect(field).toHaveValue('test.parent@gmail.com');
  await expect(field).not.toHaveAttribute('aria-invalid');
  await expect(submit).toBeEnabled();

  // A long address stays on one line at 18px, inside the screen, with no zoom.
  const long = 'test.parent+a-really-long-address-for-e2e-layout@example.com';
  await field.fill(long);
  await blur();
  await expect(field).toHaveValue(long);
  await expect(submit).toBeEnabled();
  const layout = await browser.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>('input[type="email"]')!;
    const box = input.getBoundingClientRect();
    return {
      fontSize: getComputedStyle(input).fontSize,
      frameHeight: input.parentElement!.getBoundingClientRect().height,
      right: box.right,
      width: window.innerWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(layout.fontSize).toBe('18px');
  expect(layout.frameHeight).toBe(56);
  expect(layout.right).toBeLessThanOrEqual(layout.width - 20);
  expect(layout.pageScrollWidth).toBeLessThanOrEqual(layout.width);
  await agent.assert(
    'The email field is a single line, it shows the start of a long address, and nothing spills outside it',
    { vision: true },
  );
});

test('email: a domain that can’t receive mail asks for the spelling', async ({ app, browser, screen }) => {
  await runOnlyOn(browser, ['phone-webkit']);
  await openWithDraft(app, browser, atEmail);

  const field = screen.getByLabel('Email');
  const submit = screen.getByRole('button', 'Submit application');
  // `.invalid` is reserved (RFC 2606): it never has mail servers.
  await field.fill('test.parent@nomail.invalid');
  await expect(submit).toBeEnabled();
  await submit.tap();

  await expect(screen.getByText('We can’t send to that address. Check the spelling?')).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await expect(screen.getByText('Fix your email to submit')).toBeVisible();
  await expect(submit).toBeDisabled();
  expect(await readStored(browser, SUBMITTED_KEY)).toBeNull();

  // Fixing the address clears it.
  await field.fill('test.parent@example.com');
  await expect(field).not.toHaveAttribute('aria-invalid');
  await expect(submit).toBeEnabled();
});
