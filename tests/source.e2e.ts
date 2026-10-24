import { describe, test } from '@e2e-dev/web';
import { expect } from 'e2e';
import { DRAFT_KEY, openApply, readStored, runOnlyOn, type StoredDraft } from './support/apply';

// URLs following the shared-link convention, with made-up campaign values.
// The referrer-based cases are unit-tested in lib/attribution.test.ts.
const cases = [
  {
    title: 'a Meta ad link with fbclid is paid/meta',
    path: '/apply?utm_source=meta&utm_medium=paid_social&utm_campaign=e2e_campaign&utm_content=e2e_ad&utm_id=e2e-1&fbclid=e2e-fbclid',
    expected: { sourceType: 'paid', source: 'meta', campaign: 'e2e_campaign' },
    attribution: { utm_source: 'meta', utm_medium: 'paid_social', utm_id: 'e2e-1', fbclid: 'e2e-fbclid' },
  },
  {
    title: 'a WhatsApp convention link is organic/whatsapp',
    path: '/apply?utm_source=whatsapp&utm_medium=referral&utm_campaign=e2e_outreach&utm_id=wa-e2e',
    expected: { sourceType: 'organic', source: 'whatsapp', campaign: 'e2e_outreach' },
    attribution: { utm_source: 'whatsapp', utm_medium: 'referral', utm_id: 'wa-e2e' },
  },
  {
    title: 'a typed URL is direct',
    path: '/apply',
    expected: { sourceType: 'direct', source: 'direct', campaign: null },
    attribution: {},
  },
] as const;

describe('source', () => {
  for (const c of cases) {
    test(c.title, async ({ app, browser, screen }) => {
      await runOnlyOn(browser, ['phone-chromium']);
      await openApply(app, browser, c.path);
      await expect(screen.getByRole('heading', 'For kids who ask why?')).toBeVisible();

      const draft = await readStored<StoredDraft>(browser, DRAFT_KEY);
      expect(draft).toMatchObject(c.expected);
      expect(draft!.attribution).toMatchObject(c.attribution);
      expect(draft!.attribution!.landing_url).toContain(c.path);

      // UTMs live on the first history entry only; the next step's URL is clean.
      await screen.getByRole('button', 'Count us in').tap();
      await expect(browser).toHaveURL(/\/apply\?step=names$/);
      // First touch wins: moving on doesn't change the source.
      expect(await readStored<StoredDraft>(browser, DRAFT_KEY)).toMatchObject(c.expected);
    });
  }
});
