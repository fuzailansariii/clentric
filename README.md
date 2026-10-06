# Clentric

Workspace for freelancers: clients, proposals clients accept online, projects with milestones, invoices with PDF, and a dashboard that shows what needs attention.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth + Postgres) · Drizzle ORM · Vitest · Playwright

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment (`.env`)

| Variable | Used for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client (browser and server) |
| `DATABASE_URL` | Postgres via the transaction pooler (app queries) |
| `DIRECT_URL` | Direct connection for Drizzle Kit migrations |
| `RESEND_API_KEY` | Resend: invoice, reminder, proposal and contact-form emails |
| `APP_URL` | Base URL for links in emails (`http://localhost:3000` in dev; defaults to `https://clentric.app`) |
| `EMAIL_FROM`, `SUPPORT_EMAIL` | Optional. Sender address (default `noreply@clentric.app`) and where contact-form messages go (default the support email in `lib/legal-config.ts`) |
| `DODO_PAYMENTS_API_KEY`, `DODO_PAYMENTS_ENVIRONMENT` | Billing API key and `test_mode` / `live_mode` (live is refused while `APP_URL` is localhost) |
| `DODO_PRODUCT_PRO_MONTHLY`, `DODO_PRODUCT_PRO_YEARLY` | Product ids for Pro monthly ($16) and yearly ($168) |
| `DODO_PAYMENTS_WEBHOOK_SECRET` | Signing secret of the webhook pointing at `/api/webhooks/dodo` |
| `BILLING_ENFORCED` | `true` turns paid plans on. Anything else = beta: everyone gets Pro, upgrade buttons hidden |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring. Unset = Sentry off (local dev). `NEXT_PUBLIC_SENTRY_ENVIRONMENT` optional (e.g. `production`) |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Host build only: uploads source maps so errors show real file names |
| `SUPABASE_SERVICE_ROLE_KEY` | **End-to-end tests only.** Never use it in app code or a `NEXT_PUBLIC_` variable |

`.env*` files are gitignored.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve it |
| `npm test` | Type-check, lint and unit tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) against the dev server |
| `E2E_PROD=1 E2E_BASE_URL=http://localhost:3100 npm run test:e2e` | End-to-end tests against a fresh production build on port 3100 |
| `npx playwright show-report` | Open the last end-to-end report (screenshots and traces on failure) |
| `npm run grant add friend@x.com 2027-01-01 beta tester` | Free Pro for an email, works before sign-up (date and note optional). `npm run grant revoke <email>`, `npm run grant list` |
| `npm run invite add friend@x.com [note]` | Beta invite: only invited emails can create an account. `npm run invite remove <email>`, `npm run invite list` |
| `npm run db:check` | Read-only security check of the database in `.env` (RLS, grants, sign-up trigger, invite hook, purge job) |

## Tests

- **Unit tests** live next to the code as `*.test.ts` (for example `lib/format-date.test.ts`).
- **End-to-end tests** live in `e2e/`. They sign in a dedicated test account (`e2e@clentric.test`, override with `E2E_EMAIL`) through the Supabase admin API, so no email is sent. All of that account's data is deleted before and after every run. Without `SUPABASE_SERVICE_ROLE_KEY` the signed-in tests are skipped and the signed-out tests still run.
- First time only: `npx playwright install chromium`.

## Database migrations

Migrations live in `supabase/migrations` and are managed by Drizzle Kit:

```bash
npx drizzle-kit generate --name <change>   # from schema changes in src/db/schema
npx drizzle-kit migrate                    # apply pending migrations
```

Apply migrations only with `drizzle-kit migrate`, so its records stay in sync. On a new Supabase project, `migrate` alone builds the full database (RLS, triggers, invite hook, purge job); run `npm run db:check` afterwards. Never run `drizzle-kit push`: it doesn't know about RLS policies.

The beta invite hook also has to be switched on in Supabase: **Auth → Hooks → Before User Created → Postgres → `public.hook_beta_invite_only`**.

## Project docs

- `CLAUDE.md` / `AGENTS.md` — coding rules for this project.
- `docs/production-readiness-report.md` — current state, open issues and the path to launch.
- `docs/beta-launch-checklist.md` — step-by-step production setup for the beta.
