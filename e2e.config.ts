import { existsSync } from 'node:fs';
import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { github } from '@e2e-dev/github';
import { anthropic } from '@ai-sdk/anthropic';

// e2e loads no .env file itself. Locally ANTHROPIC_API_KEY and the dev server's
// NEXT_PUBLIC_* values live in .env.local; CI sets everything in the job env.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const previewUrl = process.env.PREVIEW_URL;

// `identity` keeps the replay cache valid when the Preview URL changes.
// Without PREVIEW_URL the runner starts (or reuses) the local dev server.
// `environment` joins the cache identity too, so local runs and Previews share
// one set of recordings. Production (the smoke run) only has live judgments.
const app = {
  url: previewUrl ?? 'http://localhost:3000',
  identity: 'pesto-apply',
  environment: previewUrl === 'https://pestokids.com' ? ('production' as const) : ('test' as const),
  ...(previewUrl
    ? {}
    : { command: { executable: 'pnpm', args: ['dev'], reuseExisting: true, log: '.e2e/logs/app.log' } }),
};

// Opens protected Vercel Previews. Only sent to the app's own site.
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const headers: Record<string, string> = bypass ? { 'x-vercel-protection-bypass': bypass } : {};

const options = { headers };
const phone = { width: 402, height: 874 };

export default {
  agents: {
    default: {
      // Reads ANTHROPIC_API_KEY. A fast model: agent steps are short, single-screen tasks.
      model: anthropic('claude-haiku-5-5'),
      context:
        'This is the Pesto Founding Families application, a phone-first form for parents. ' +
        'Use only the test data given in each step. Do exactly what the step asks, ' +
        'then stop: never continue to later screens unless the step says so.',
    },
  },
  targets: [
    { name: 'phone-webkit', engine: web({ ...options, browser: 'webkit', viewport: phone }), app },
    { name: 'phone-chromium', engine: web({ ...options, browser: 'chromium', viewport: phone }), app },
    { name: 'fold', engine: web({ ...options, viewport: { width: 984, height: 1092 } }), app },
    { name: 'desktop', engine: web({ ...options, viewport: { width: 1440, height: 900 } }), app },
  ],
  timeout: 180_000,
  reporters: ['list', github()],
} satisfies E2EConfig;
