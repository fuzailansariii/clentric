# Clentric — Project Documentation

> **Clentric** is a freelance business workspace: one place to manage clients, projects, invoices, and proposals.
> Tagline (auth UI): *"One workspace for clients, projects, invoices, and proposals."*

This document describes what the project is, how it is built, and exactly what is done vs. stubbed vs. missing, based on a full read of the codebase on branch `feature/invoice`.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Data Model](#data-model)
5. [Route Map](#route-map)
6. [Feature Status](#feature-status)
7. [Conventions & Patterns](#conventions--patterns)
8. [Environment & Setup](#environment--setup)
9. [Folder Structure](#folder-structure)

---

## Overview

Clentric targets freelancers and small agencies who need:

- A **client CRM** (contacts, status, notes)
- **Project tracking** (budget, deadline, status, milestones)
- **Invoicing** — creation, line items, tax, status workflow (schema + most of the flow built; list page not wired)
- **Proposals** — planned, schema only
- **Billing/subscriptions** for the SaaS itself — planned, schema only
- Optional **team collaboration** and **client portal** — planned, schema only

The database schema is ambitious and models most of a full SaaS product. The application layer covers clients and projects fully, invoicing partially (creation works end-to-end, but the invoice list/detail/edit pages are not built), and everything else is schema-only.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 16.2.9** (App Router, React Server Components). This version renamed `middleware.ts` → `proxy.ts` — verified against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. |
| UI | **React 19.2**, **Tailwind CSS 4**, **shadcn/ui** on **Radix (`radix-ui`)**, **Lucide** + **react-icons** |
| Forms | **react-hook-form** + **Zod 4** (`@hookform/resolvers`) |
| Auth | **Supabase Auth** (email OTP, Google/GitHub OAuth) via `@supabase/ssr` |
| Database | **PostgreSQL** (Supabase-hosted) |
| ORM | **Drizzle ORM** (`drizzle-orm/postgres-js`) + `postgres.js` direct connection via `DATABASE_URL` |
| Theming | **next-themes** (root layout is currently pinned to `defaultTheme="light"`, `enableSystem={false}`) |
| Toasts | **Sonner**, wrapped by `lib/run-action-with-toast.ts` |
| Misc UI libs | `libphonenumber-js` + `react-phone-number-input` (phone field), `world-countries` + `flag-icons` (country combobox), `date-fns` + `react-day-picker` (calendar), `cmdk` (combobox), `motion` |
| Tooling | ESLint 9 (`eslint-config-next`), Prettier + `prettier-plugin-tailwindcss`, `drizzle-kit`, `tsx` |

**Deployment target:** Vercel (default Next.js setup; no CI/CD configured — no `.github/` workflows exist).

---

## Architecture

### Route groups

```
/                     → Public "Coming Soon" landing (components/comings-soon.tsx)
/login, /register     → Auth (email OTP + Google/GitHub OAuth)
/auth/callback         → OAuth code-exchange route handler
/dashboard/*           → Protected app shell (sidebar layout)
/clients, /projects,
/invoices, /proposals  → Protected feature routes (also under proxy protection,
                          outside the (dashboard) URL segment but sharing its layout group)
```

### Auth & route protection (two layers)

1. **`proxy.ts`** (project root) — the Next.js 16 request-interception file, functionally equivalent to the old `middleware.ts`. Confirmed this is the correct, current convention for this Next.js version, not a misnamed file.
   - Protects paths starting with `/dashboard`, `/clients`, `/projects`, `/invoices`, `/proposals` — redirects unauthenticated visitors to `/login?redirectTo=...`.
   - Redirects an authenticated user away from `/login` and `/register` to `/dashboard`.
   - `/notifications` and `/settings` are **not** in `PROTECTED_PREFIXES`, but this is moot today because neither route exists at all (see [Feature Status](#feature-status)).

2. **`app/(dashboard)/layout.tsx`** — second guard: fetches the Supabase user server-side and `redirect("/login")`s if missing, then loads `profile` + `subscription` (via `app/(dashboard)/queries.ts::getDashboardData`) for the sidebar footer.

3. **Server actions** — every mutation is a `"use server"` function that calls `requireUser()` (`lib/current-user.ts`) first and scopes all Drizzle reads/writes by `eq(table.userId, user.id)`.

### Data access pattern

Each feature under `app/(dashboard)/<feature>/` is self-contained:

```
page.tsx / [id]/page.tsx   → Server Component: calls queries.ts, renders client UI
queries.ts                 → read-only, server-only (`import "server-only"`)
actions.ts                 → "use server" mutations, Zod-validated, userId-scoped
schema.ts                  → Zod schemas (form input + DB id validation)
*-columns.tsx               → DataTable column defs for that feature
*-row-actions.tsx           → per-row dropdown actions (view/edit/delete/etc.)
*-status-config.ts          → status → label/badge-variant maps
```

Shared UI building blocks: `PageHeader`, `DashboardContainer`, `FormSection`, `DataTable` (desktop table + mobile card fallback), `DeleteDialog` / `ConfirmDialog`, `runActionWithToast` (wraps a server-action promise in a Sonner `toast.promise` and reports success/error).

### Database

- **15 tables** in `src/db/schema/` (barrel-exported from `schema.ts`): `users`, `clients`, `projects`, `milestones`, `invoices`, `invoice_items`, `invoice_counters`, `proposals`, `proposal_items`, `subscriptions`, `team_members`, `notifications`, `activity_logs`, `client_portal_tokens`, `webhook_events`.
- **Migrations** in `supabase/migrations/`: initial schema (`0000_...`), triggers + RLS policies (`0001_triggers_and_rls.sql`), and a documented fix for the signup trigger (`0002_fix_handle_new_user_trigger.sql` — the file's own header explains that the original trigger in `0001` silently never ran because it shared a SQL Editor transaction with a conflicting RLS policy statement, and `0002` is the actual live version).
- **RLS** is enabled and policy-scoped by `auth.uid()` on every user-owned table (directly, or via `exists (...)` through a parent for child tables like `invoice_items`, `milestones`, `proposal_items`, `client_portal_tokens`).
- **Important nuance**: the app's Drizzle client connects with the raw `DATABASE_URL` (a `postgres.js` connection, not the Supabase JS client), which **bypasses RLS**. RLS here is a real, working defense-in-depth layer if the DB is ever queried another way (Supabase Studio, a future service using the anon/JS client, a leaked connection string used carelessly) — but for the Next.js app itself, the actual enforcement is 100% the `userId` filters in `queries.ts`/`actions.ts`. This is architecturally fine as long as every query remembers the filter (see `REPO_ASSESSMENT.md` for the one place that's worth double-checking).
- **Invoice numbering**: `invoice_counters` is a one-row-per-user counter table; `lib/get-next-invoice-number.ts` does an atomic `insert ... on conflict do update ... lastNumber + 1` inside the same transaction as invoice creation, so numbers are per-user, gapless-on-success, and race-safe.

---

## Data Model

| Table | Purpose | App-layer status |
|---|---|---|
| `users` | Profile row mirroring `auth.users`, auto-created by the `handle_new_user` trigger. Has `plan`, `onboardingCompleted`, `timezone` columns. | Read for sidebar footer only; no edit UI. |
| `clients` | CRM contact | Full CRUD |
| `projects` | Linked to a client; budget, deadline, status | Full CRUD |
| `milestones` | Linked to a project; title, status, due date | Read-only (progress % on project list); no create/edit/complete UI (`MilestonesPanel` is commented out) |
| `invoices` | Linked to client + optional project; numbering, tax, status (`draft`/`sent`/`paid`/`overdue` display status is derived, not stored — `overdue` is computed from `sent` + past due date) | Create (Quick/Detailed form), update, status transitions (send, mark paid, revert, delete) all implemented server-side; **no list, view, or edit page wired up client-side** |
| `invoice_items` | Line items for an invoice, wholesale-replaced on update | Implemented |
| `invoice_counters` | Per-user last invoice number | Implemented, internal only |
| `proposals` / `proposal_items` | Same shape as invoices, for sales proposals | Schema only — `/proposals` renders a literal `<div>Proposals</div>` |
| `subscriptions` | SaaS billing plan/status, Stripe IDs | Schema + read (dashboard layout shows `plan` in sidebar footer, defaulting to `"free"`); no Stripe integration |
| `team_members` | Owner/admin/member roles, invite by email | Schema only |
| `notifications` | In-app notification feed | Schema only; sidebar links to `/notifications`, which doesn't exist |
| `activity_logs` | Audit trail (action, entity, metadata) | Schema only; nothing writes to it |
| `client_portal_tokens` | Token-based external client access to invoices/proposals | Schema only |
| `webhook_events` | Inbound Stripe (or other) webhook log, dedup'd by `event_id` | Schema only |

---

## Route Map

| Route | Status |
|---|---|
| `/` | Public "Coming Soon" landing |
| `/login`, `/register` | Working — email OTP + Google/GitHub OAuth |
| `/auth/callback` | OAuth code exchange route handler |
| `/dashboard` | Renders, but shows a **hardcoded** `"Fuzail Ansari"` welcome name instead of the loaded profile, and no real stats |
| `/clients`, `/clients/new`, `/clients/[id]` | Full CRUD, search/filter/paginate, inline edit, soft delete, tabs for that client's projects and invoices |
| `/projects`, `/projects/new`, `/projects/[id]` | Full CRUD, search/filter/paginate, inline edit, soft delete; Milestones tab present but empty (panel commented out) |
| `/invoices` | **Stub** — literally `<div>Invoices</div>`, despite `invoices-columns.tsx`, `invoice-filters-bar.tsx`, `invoice-stats.ts`, `filter-invoices.ts` all existing and being used elsewhere (see below) |
| `/invoices/new` | Working — Quick/Detailed mode toggle, client/project comboboxes, line items, tax, live preview, creates the invoice and redirects to `/invoices/[id]` |
| `/invoices/[id]`, `/invoices/[id]/edit` | **Do not exist.** `InvoiceRowActions` ("View" / "Edit" dropdown items) and the post-create redirect both link here — these will 404 today. |
| `/proposals` | **Stub** — `<div>Proposals</div>` |
| `/notifications`, `/settings` | Linked from the sidebar (`EXTRA_ITEMS` in `components/sidebar/sidebar.tsx`), **no route exists** — always 404 |

> Note on where the invoice list UI actually lives: the fully-built invoice table (`invoiceColumns`, `InvoiceFiltersBar`, `computeInvoiceStats`, `filterInvoices`) is used today only inside **`InvoicesPanel`**, rendered on a client's detail page (`app/(dashboard)/clients/[id]/invoices-panel.tsx`) to show that one client's invoices. The same component set was clearly intended to also power the standalone `/invoices` page but hasn't been wired there yet.

---

## Feature Status

| Feature | DB | Server actions/queries | UI |
|---|:--:|:--:|:--:|
| Auth (OTP + OAuth) | ✅ | ✅ | ✅ |
| User profile | ✅ | Partial (read only) | ❌ no edit page |
| Clients CRUD | ✅ | ✅ | ✅ |
| Projects CRUD | ✅ | ✅ | ✅ |
| Milestones | ✅ | Read query only | ❌ panel commented out |
| Invoices — create/edit/status | ✅ | ✅ (fully implemented, userId-scoped) | 🟡 create works; list/view/edit pages missing |
| Proposals | ✅ | ❌ | ❌ stub |
| Subscriptions / Stripe | ✅ | Read only | ❌ |
| Team members | ✅ | ❌ | ❌ |
| Notifications | ✅ | ❌ | ❌ (link 404s) |
| Client portal | ✅ | ❌ | ❌ |
| Activity logs | ✅ | ❌ (nothing writes to it) | ❌ |
| Dashboard analytics | ❌ | ❌ | ❌ hardcoded name only |
| Settings / billing page | ❌ | ❌ | ❌ (link 404s) |

---

## Conventions & Patterns

- **`ActionResult<T>`** (`lib/action-result.ts`) is the universal server-action return shape: `{ success: true, data?: T } | { success: false, error: string }`. Every action in the codebase follows it.
- **`AppError`** (`lib/errors.ts`) is a typed error with a `code`, thrown inside actions/queries and caught to produce a friendly `error` string; `logError(context, error)` centralizes `console.error` logging (there is no external log aggregation).
- **Soft deletes**: `clients`, `projects`, and `invoices` use a `deletedAt` timestamp and every read/write filters `isNull(...deletedAt)` (or, for invoices, sets `deletedAt` rather than hard-deleting).
- **Zod at every boundary**: form input, URL search params (`clientSearchParamsSchema`, with `.catch(...)` fallbacks so a malformed query string degrades gracefully instead of crashing), and raw IDs (`clientIdSchema = z.uuid()`, etc.) are all parsed before touching the DB.
- **Transactions** are used where multi-step consistency matters: `createProjectAction` verifies + locks the parent client (`.for("update")`) before inserting; `createInvoiceAction`/`updateInvoiceAction` verify client/project ownership, allocate the invoice number, and write the invoice + line items all inside one `db.transaction`.
- **`normalize()`** (`lib/normalizeOptionalFields.ts`) converts `""` → `null` on optional form fields before writing to Postgres.
- **Money handling**: all currency columns are `decimal` (not `float`); amounts are rounded with `Math.round(value * 100) / 100` before being sent to the DB as fixed-2-decimal strings.
- **`runActionWithToast`** standardizes the client-side UX for calling a server action: shows a loading toast, resolves to success/error toast, and exposes `onSuccess`/`onError` callbacks. One inconsistency: `InvoiceRowActions`'s quick actions (send/remind/mark-paid) bypass this and just `console.error` on failure instead of toasting.

---

## Environment & Setup

### Required environment variables (see local `.env`, which is gitignored via the `.env*` pattern)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string — pointed at Supabase's transaction-mode pooler per the `.env` comment |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Present in `.env` but not yet wired into code

| Variable | Purpose |
|---|---|
| `RESEND_API` | Presumably for `sendReminderAction`'s email send — that action currently has `// TODO: send the actual email here` and never touches this key |
| `DIRECT_URL` (commented out) | Direct (non-pooled) connection, for `drizzle-kit` migrations |

### Not present anywhere yet

- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (schema anticipates Stripe; no integration exists)
- `SUPABASE_SERVICE_ROLE_KEY` (would be needed for any deliberate RLS-bypassing admin operation, e.g. webhook processing)

### Local development

```bash
npm install
# create .env with DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

There is no `.env.example` in the repo, so a new developer has to reverse-engineer the required variables from `lib/supabase/config.ts` and `src/db/index.ts`.

### Database migrations

```bash
npx drizzle-kit generate   # after editing src/db/schema/*
npx drizzle-kit migrate    # apply
```

Hand-written SQL for RLS/triggers also lives in `supabase/migrations/` alongside the Drizzle-generated files.

### Scripts

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `lint` | `eslint` |

There is no `typecheck`, `test`, or `format` script defined in `package.json`, even though Prettier and TypeScript are both configured.

---

## Folder Structure

```
clentric/
├── app/
│   ├── layout.tsx                 # Root: fonts, ThemeProvider (light-only, no system theme)
│   ├── page.tsx                   # Public landing → <ComingSoon />
│   ├── (auth)/
│   │   ├── action.ts              # logoutAction
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── auth/callback/route.ts
│   └── (dashboard)/
│       ├── layout.tsx             # Sidebar shell + auth guard
│       ├── queries.ts             # getDashboardData (profile + subscription)
│       ├── dashboard/page.tsx     # Stub — hardcoded welcome name
│       ├── clients/               # Full CRUD (list, new, [id] detail w/ projects+invoices tabs)
│       ├── projects/              # Full CRUD (list, new, [id] detail w/ milestones tab, empty)
│       ├── invoices/              # actions/queries/schema/columns/stats all built; list page not wired,
│       │                          #   no [id] detail/edit route
│       └── proposals/page.tsx     # Stub
├── components/
│   ├── ui/                        # shadcn primitives (button, dialog, select, calendar, ...)
│   ├── dashboard/                 # PageHeader, FormSection, DashboardContainer, WelcomeHeader
│   ├── data-table/                # Reusable table (desktop table + mobile card fallback)
│   ├── preview/                   # Invoice live-preview panel + actions
│   └── sidebar/                   # Nav shell (NAV_ITEMS, EXTRA_ITEMS incl. dead links)
├── lib/                           # Supabase clients, formatting, errors, action-result, validations
├── hooks/                         # use-pagination, use-debounced-value, use-hydrated
├── src/db/
│   ├── index.ts                   # Drizzle client (direct postgres.js connection, bypasses Supabase RLS)
│   └── schema/                    # 15 table definitions, barrel-exported via schema.ts
├── supabase/migrations/           # SQL: initial schema, RLS + triggers, trigger fix
├── proxy.ts                       # Next.js 16 request-interception file (replaces middleware.ts)
├── drizzle.config.ts
├── AGENTS.md / CLAUDE.md          # Repo instructions: this Next.js version has breaking changes vs. training data
└── docs/PROJECT.md                # This file (gitignored — not committed)
```

---

*Compiled from a full read of the `feature/invoice` branch on 2026-09-11. Treat this as a snapshot — re-verify against the code before relying on any specific claim for a decision.*
