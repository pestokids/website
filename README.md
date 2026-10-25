# pestokids.com

One Next.js (App Router) app for the Pesto website, deployed on Vercel, with Convex as the backend.

- `/apply`: the Founding Families application flow (steps via `?step=`)
- `/`: the landing page, a static felt night scene with one button to `/apply` (it carries the visit's UTMs, click IDs and `via`)
- `/apply/_kit`: internal preview of the shared UI components in every state (dev and Vercel Preview only; 404 in production). `/apply/_kit/footer` checks the sticky footer above the keyboard on a real phone.
- `/api/email-domain?domain=…`: DNS check (MX, else A/AAAA) the email screen runs before submit, so a domain that can't receive mail gets "Check the spelling?" instead of a lost application

## Setup

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local   # fill in the NEXT_PUBLIC_* values
pnpm convex dev              # starts Convex, writes NEXT_PUBLIC_CONVEX_URL to .env.local
pnpm dev
```

`next dev` / `next build` fail fast if a required env var is missing or malformed (`lib/config.ts`).

To start the flow over locally, open `/apply?reset=1`. It clears the saved draft and submitted record, and only works under `next dev`.

## Convex

`applications.submit` is the only public function; everything else is `internal*`, because anything public can be called by anyone. Read applications in the Convex dashboard.

- `applications.submit`: validates with the same rules as the flow (`lib/application.ts`), re-checks the kids' names for likely-fake ones (`lib/name-check.ts`, stored as `nameCheck`; never a rejection), upserts by email (a repeat keeps its ref code and first-touch source), rate-limits per email and globally, and schedules the confirmation email.
- `email.sendConfirmation`: sends the confirmation through Resend and sets `emailStatus`. It only sends when `EMAIL_SEND_ENABLED=true`; otherwise the status is `skipped`. Network errors and Resend 429/5xx are retried twice (after ~1 and ~10 minutes) with the same idempotency key, then the status is `failed`.

- `digest.sendDaily` (cron, `crons.ts`): at 9am Los Angeles time, emails yesterday's new-application counts (total, by `sourceType` and by `source`; no names or emails) to `DIGEST_EMAIL` through Resend. Does nothing when `DIGEST_EMAIL` is unset. Send one now with `npx convex run digest:sendDaily '{"force": true}'`.

Spam: the email step has an off-screen trap field. A submit with it filled gets a normal-looking response, but nothing is saved or sent. Throwaway-inbox domains (`lib/disposable-email.ts`) are rejected by the shared validation. On submit the flow checks, in order: spam trap (a filled one goes straight to the server's decoy), throwaway inbox, MX lookup, then Convex.

Convex env vars (set per deployment with `npx convex env set KEY value`, or in the dashboard): `EMAIL_SEND_ENABLED`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_BETA_DATE`, `DIGEST_EMAIL`.

Uncaught browser errors go to PostHog error tracking (`capture_exceptions`), only when analytics is on.

## Scripts

| Script | What |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm convex` | Convex dev deployment (watch mode) |
| `pnpm test` | Unit tests (Vitest; Convex functions run against `convex-test`) |
| `pnpm typecheck` | Route type generation + `tsc` |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |
| `pnpm test:e2e` | End-to-end tests (below) |

## End-to-end tests

`tests/*.e2e.ts`, run with [e2e](https://e2e.tester.army/docs) (Playwright plus agent steps). Each test runs on four targets: `phone-webkit` and `phone-chromium` (402×874), `fold` (984×1092) and `desktop` (1440×900). Tests skip the targets they aren't meant for.

```bash
# .env.local needs ANTHROPIC_API_KEY (agent steps) and E2E_TELEMETRY_DISABLED=1
pnpm exec e2e-web install chromium webkit
pnpm test:e2e                          # starts (or reuses) `pnpm dev`
pnpm test:e2e --target fold            # one target
pnpm test:e2e tests/email.e2e.ts       # one file; add :line for one test
PREVIEW_URL=https://… VERCEL_AUTOMATION_BYPASS_SECRET=… pnpm test:e2e   # a protected Preview
```

- Use only fake data: kids "Test Kid A/B", emails `test.parent+e2e-…@example.com`. Submits from Previews and local runs go to the Convex dev deployment, with analytics and emails off.
- Exact copy, URLs and localStorage are checked with locators; agent steps do navigation and fuzzy checks.
- `.e2e/cache/` is committed: passing `agent.act` steps replay from it with no model call. Review its changes like test data. Never commit `.e2e/results` or logs.
- CI (`.github/workflows/e2e.yml`) runs the suite on every pull request against its Vercel Preview and comments the results on the PR. `e2e-smoke.yml` runs the read-only `smoke` tests (welcome, desktop) against Production after each deploy to `main`.

## Lighthouse

`.github/workflows/lighthouse.yml` runs Lighthouse on every pull request's Vercel Preview: `/`, `/privacy`, `/terms` and `/apply`, mobile and desktop, 3 runs each. It comments the medians on the PR and fails it when a route is over budget. The routes are in `.github/lighthouse-routes.json` and the budgets at the top of `.github/scripts/lighthouse-report.mjs`.

To run it locally against a production build (`pnpm build && pnpm start`):

```bash
for preset in mobile desktop; do
  (mkdir -p /tmp/lh/$preset && cd /tmp/lh/$preset &&
    PRESET=$preset PREVIEW_URL=http://localhost:3000 npx @lhci/cli@0.15.1 collect --config="$OLDPWD/.github/lighthouserc.cjs")
done
node .github/scripts/lighthouse-report.mjs /tmp/lh /tmp/lh/report.md
```

`pnpm start` serves gzip and Vercel serves brotli, so local JavaScript and total sizes come out about 10% higher.

## Layout

```
app/(marketing)/        the landing page (/), /privacy and /terms
app/(apply)/            flow-only layout (theme colour, viewport, soft-wash background)
app/(apply)/apply/      /apply
app/(apply)/_components flow UI (shared controls in _components/ui)
app/(apply)/_lib        flow state, persistence, personalisation
content/apply.ts        all flow copy and option lists
content/landing.ts      all landing page copy
public/landing/         landing art: AVIF + WebP per layer and width, content-hashed and cached for a year (scripts/landing-art.mjs)
lib/                    shared: config, attribution, fonts
styles/                 shared: design tokens, globals
convex/                 schema, functions and tests
```

The repo is public: never commit secrets, `.env*` files (except `.env.example`) or real personal data. Use fake data in tests.
