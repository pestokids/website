# pestokids.com

One Next.js (App Router) app for the Pesto website, deployed on Vercel, with Convex as the backend.

- `/apply`: the Founding Families application flow (steps via `?step=`)
- `/`: temporarily redirects (307) to `/apply` until the landing page ships
- `/apply/_kit`: internal preview of the shared UI components in every state (dev and Vercel Preview only; 404 in production). `/apply/_kit/footer` checks the sticky footer above the keyboard on a real phone.

## Setup

```bash
corepack enable pnpm
pnpm install
cp .env.example .env.local   # fill in the NEXT_PUBLIC_* values
pnpm convex dev              # starts Convex, writes NEXT_PUBLIC_CONVEX_URL to .env.local
pnpm dev
```

`next dev` / `next build` fail fast if a required env var is missing or malformed (`lib/config.ts`).

## Convex

`applications.submit` is the only public function; everything else is `internal*`, because anything public can be called by anyone. Read applications in the Convex dashboard.

- `applications.submit`: validates with the same rules as the flow (`lib/application.ts`), upserts by email (a repeat keeps its ref code and first-touch source), rate-limits per email and globally, and schedules the confirmation email.
- `email.sendConfirmation`: sends the confirmation through Resend and sets `emailStatus`. It only sends when `EMAIL_SEND_ENABLED=true`; otherwise the status is `skipped`. Network errors and Resend 429/5xx are retried twice (after ~1 and ~10 minutes) with the same idempotency key, then the status is `failed`.

Convex env vars (set per deployment with `npx convex env set KEY value`, or in the dashboard): `EMAIL_SEND_ENABLED`, `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_BETA_DATE`.

## Scripts

| Script | What |
|---|---|
| `pnpm dev` | Next.js dev server |
| `pnpm convex` | Convex dev deployment (watch mode) |
| `pnpm test` | Unit tests (Vitest; Convex functions run against `convex-test`) |
| `pnpm typecheck` | Route type generation + `tsc` |
| `pnpm lint` | ESLint |
| `pnpm build` | Production build |

## Layout

```
app/(marketing)/        reserved for the landing page
app/(apply)/            flow-only layout (theme colour, viewport, soft-wash background)
app/(apply)/apply/      /apply
app/(apply)/_components flow UI (shared controls in _components/ui)
app/(apply)/_lib        flow state, persistence, personalisation
content/apply.ts        all flow copy and option lists
lib/                    shared: config, attribution, fonts
styles/                 shared: design tokens, globals
convex/                 schema, functions and tests
```

The repo is public: never commit secrets, `.env*` files (except `.env.example`) or real personal data. Use fake data in tests.
