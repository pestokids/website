/**
 * Shared helpers for the /apply e2e suite: fake test data, target pinning,
 * localStorage access and a third-party request block.
 *
 * The repo is public: only obviously fake data goes in here.
 */
import { test, type Browser } from '@e2e-dev/web';
import { expect, type App, type Screen } from 'e2e';

// ── Test data ────────────────────────────────────────────────────────────────

// "Test Kid" is a placeholder, so the names screen nudges each of these once
// ("Is that Test Kid A’s real name?"). Tests that type them use confirmName().
export const KID_A = 'Test Kid A';
export const KID_B = 'Test Kid B';

/**
 * A fresh fake address per submit. The server allows 5 submits an hour per
 * email, and the suite submits several times per run, so each one gets its
 * own plus-tag. Pass it to agent steps through `unique()` so the replay cache
 * still matches.
 */
export function testEmail(): string {
  return `test.parent+e2e-${Date.now().toString(36)}@example.com`;
}

// ── Targets ──────────────────────────────────────────────────────────────────

export type TargetName = 'phone-webkit' | 'phone-chromium' | 'fold' | 'desktop';

/**
 * e2e runs every test on every target and doesn't tell the test which one it
 * is on, so read it from the viewport width and the browser engine.
 */
export async function targetOf(browser: Browser): Promise<TargetName> {
  // evaluate needs a page; a blank one is enough before the app opens.
  await browser.goto('about:blank');
  const { width, ua } = await browser.evaluate(() => ({
    width: window.innerWidth,
    ua: navigator.userAgent,
  }));
  if (width >= 1024) return 'desktop';
  if (width >= 600) return 'fold';
  return /Chrome\//.test(ua) ? 'phone-chromium' : 'phone-webkit';
}

/** Skips the running test unless it's on one of `targets`. */
export async function runOnlyOn(browser: Browser, targets: TargetName[]): Promise<TargetName> {
  const target = await targetOf(browser);
  test.skip(!targets.includes(target), `runs on ${targets.join(', ')}`);
  return target;
}

// ── Opening the app ──────────────────────────────────────────────────────────

/**
 * Aborts every request that leaves the app, except the Convex backend. On
 * Previews analytics is off anyway; on Production (the smoke run) this keeps
 * PostHog and Linkrunner from ever seeing test traffic.
 */
async function blockThirdParty(app: App, browser: Browser) {
  // Replaces this helper's route if an earlier call in the test added one.
  await browser.unroute('**/*');
  const appHost = new URL(app.baseUrl ?? 'http://localhost:3000').host;
  await browser.route('**/*', async (route) => {
    const { host } = new URL(route.request.url);
    const allowed =
      host === appHost || host.endsWith('.convex.cloud') || host.endsWith('.convex.site');
    await (allowed ? route.fallback() : route.abort());
  });
}

/** Opens a path on the app with third-party requests blocked. */
export async function openApply(app: App, browser: Browser, path = '/apply') {
  await blockThirdParty(app, browser);
  await app.open(path);
}

// ── localStorage ─────────────────────────────────────────────────────────────

export const DRAFT_KEY = 'pesto_ff_draft_v1';
export const SUBMITTED_KEY = 'pesto_ff_submitted_v1';

export type StoredDraft = {
  step: string;
  kids: { name: string; age: string | null }[];
  goals: string[];
  afterSchool: string[];
  email: string;
  startedAt: number;
  sourceType?: string;
  source?: string;
  campaign?: string | null;
  attribution?: Record<string, string>;
};

export type StoredSubmitted = {
  applicationId: string;
  refCode: string;
  email: string;
  kidNames: string[];
  submittedAt?: number;
};

export async function readStored<T>(browser: Browser, key: string): Promise<T | null> {
  const raw = await browser.evaluate((k: string) => window.localStorage.getItem(k), key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export type SeedDraft = Pick<StoredDraft, 'step' | 'kids'> &
  Partial<Pick<StoredDraft, 'goals' | 'afterSchool' | 'email'>>;

/**
 * Starts a test part-way through the flow: writes a draft to localStorage and
 * opens its step, so each test begins near the screen it checks.
 */
export async function openWithDraft(app: App, browser: Browser, seed: SeedDraft) {
  await openApply(app, browser);
  const draft = { goals: [], afterSchool: [], email: '', ...seed };
  await browser.evaluate(
    ({ key, value }: { key: string; value: string }) => {
      const parsed = JSON.parse(value);
      window.localStorage.setItem(key, JSON.stringify({ ...parsed, startedAt: Date.now() }));
      return null;
    },
    { key: DRAFT_KEY, value: JSON.stringify(draft) },
  );
  await browser.goto(`/apply?step=${seed.step}`);
}

// ── Names screen ─────────────────────────────────────────────────────────────

/** The likely-fake-name nudge for `name` (its text, before the button). */
export function nameNudge(screen: Screen, name: string) {
  return screen.getByText(new RegExp(`^Is that ${name}’s real name\\?`));
}

/**
 * After Next or "+ Add another kid" with a placeholder name: checks the nudge
 * and answers "Yes, that’s right", which carries on with that button.
 */
export async function confirmName(screen: Screen, name: string) {
  await expect(nameNudge(screen, name)).toBeVisible();
  await screen.getByRole('button', 'Yes, that’s right').tap();
}

// ── Copy helpers ─────────────────────────────────────────────────────────────

/** Today as screen 9 shows it ("Oct 21"), in the browser's own time zone. */
export async function todayShort(browser: Browser): Promise<string> {
  return browser.evaluate(() =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date()),
  );
}
