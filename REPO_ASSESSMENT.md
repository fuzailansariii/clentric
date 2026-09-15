# Clentric — What's Good, What's Bad, and What to Fix Before Going Live

**Scope**: full read of every route, server action, query, schema, and migration on branch `feature/invoice`, as of 2026-09-11.
**Verdict up front: not ready to go live.** Two nav items lead to dead pages, the "Invoices" nav item itself leads to a placeholder, and there is no test or CI safety net at all. None of that is a big lift, but it does mean "no changes" is not achievable today — see the [Must-fix checklist](#must-fix-before-going-live) for the shortest path to a defensible launch.

---

## What's Good

### Architecture & patterns
- **Consistent server-action contract.** Every mutation returns `ActionResult<T>` (`lib/action-result.ts`); every read/write path re-validates its input with Zod and re-checks `requireUser()` — there's no action anywhere that trusts client-supplied IDs without a matching `eq(table.userId, user.id)` filter. This was spot-checked across `clients`, `projects`, and every invoice action (`createInvoiceAction`, `updateInvoiceAction`, `updateInvoiceStatusAction`, `sendInvoiceAction`, `sendReminderAction`, `markInvoicePaidAction`, `deleteInvoiceAction`) — all seven scope their `.where()` by the authenticated user.
- **Money handled correctly.** All currency/quantity columns are Postgres `decimal`, not `float`; totals are computed server-side (never trusted from the client) and rounded with `Math.round(v * 100) / 100` before being written as fixed-2-decimal strings.
- **Real transactions where it matters.** `createProjectAction` locks the parent client row (`for("update")`) before insert; invoice create/update wrap number allocation + invoice row + line items in one `db.transaction`, so a partial invoice (header without line items, or a burned invoice number with no invoice) can't happen.
- **Soft deletes** on `clients`, `projects`, `invoices`, consistently filtered with `isNull(...deletedAt)`.
- **RLS as real defense-in-depth**, not decoration — every user-owned table (and child tables via `exists(...)` through the parent) has a working `auth.uid()`-scoped policy in `supabase/migrations/0001_triggers_and_rls.sql`, independent of the app-layer `userId` filters.
- **Feature colocation** — `schema.ts` / `queries.ts` / `actions.ts` / UI live together per domain, which makes each feature easy to audit in isolation (this review was able to read `invoices/` top-to-bottom and be confident about its data-integrity story).
- **Honest engineering trail.** `supabase/migrations/0002_fix_handle_new_user_trigger.sql` has a header explaining that the original trigger in `0001` silently never applied (it shared a transaction with a conflicting policy statement in the Supabase SQL editor) and pointing at the migration that actually fixed it — that's the right way to document a production incident instead of quietly papering over it.

### UX polish (on the features that are built)
- Responsive `DataTable` (real `<table>` on desktop, card list on mobile) used consistently for clients, projects, and the invoices panel.
- `PageHeader` gives every detail page consistent breadcrumbs, back-nav, and a responsive actions area.
- Inline edit-in-place on client/project detail pages with Cancel/Save wired into the header actions, not a separate route.
- `runActionWithToast` gives most mutations a consistent loading → success/error toast.
- Invoice creation has a genuinely nice touch: a live-updating preview panel and a Quick/Detailed mode toggle that asks for confirmation before it would silently drop extra line items.

---

## What's Bad

Ordered by what would actually hurt in production, not by file order.

### 🔴 Blocks a credible launch

| # | Issue | Where | Why it matters |
|---|---|---|---|
| 1 | **`/invoices` is a placeholder.** The sidebar's "Invoices" link renders literally `<div>Invoices</div>`. | `app/(dashboard)/invoices/page.tsx` | The fully-built invoice table, filters, and stats (`invoiceColumns`, `InvoiceFiltersBar`, `computeInvoiceStats`) exist and are used — but only inside a client's detail tab. A user clicking the main nav item sees nothing. |
| 2 | **Invoice "View" and "Edit" links 404.** `InvoiceRowActions` links to `/invoices/[id]` and `/invoices/[id]/edit`; the post-create redirect in `InvoiceBuilder` also sends the user to `/invoices/[id]`. Neither route exists anywhere in `app/(dashboard)/invoices/`. | `app/(dashboard)/invoices/invoice-row-actions.tsx`, `invoice-builder.tsx` | A user who just created an invoice is redirected straight into a 404. |
| 3 | **"Create & Send" and "Save as Draft" are the same button.** Both call the identical `onSubmit` (create-only) handler. The code itself flags this with two `// TODO` comments. | `components/preview/invoice-preview.tsx:86,95` | The UI promises to send the invoice and doesn't — this is a trust-breaking bug for a billing product, not a cosmetic one. |
| 4 | **`/proposals` is a placeholder** (`<div>Proposals</div>`), and **`/notifications` and `/settings` are linked from the sidebar but have no route at all** — every click 404s. | `app/(dashboard)/proposals/page.tsx`, `components/sidebar/sidebar.tsx` (`EXTRA_ITEMS`) | Nav that promises features that don't exist reads as broken, not "coming soon," to a paying user. |
| 5 | **Dashboard shows a hardcoded name**, not the logged-in user's profile. | `app/(dashboard)/dashboard/page.tsx:8` — `<WelcomeHeader name="Fuzail Ansari" />` | Every other user sees the developer's name. This is a one-line fix (`getDashboardData` already loads `profile.name`) but it's live in the branch today. |
| 6 | **Zero automated tests, zero CI.** No `.github/workflows`, no test files anywhere in the repo, no `test` or `typecheck` script in `package.json`. | repo-wide | Nothing stops a broken build or a regression (like #1–#3 above) from reaching `main`. |

### 🟠 Should fix before real users touch it

| # | Issue | Where | Notes |
|---|---|---|---|
| 7 | **Milestones has schema + a read query but no UI.** The tab exists on a project's detail page but its content is commented out. | `app/(dashboard)/projects/project-details.tsx:390` — `{/* <MilestonesPanel /> */}` | Project detail advertises a "Milestones" tab with a live count badge that opens onto nothing. |
| 8 | **`sendReminderAction` doesn't send anything.** It updates `lastReminderSentAt` and stops. | `app/(dashboard)/invoices/actions.ts:437` — `// TODO: send the actual email here` | There's a `RESEND_API` key sitting unused in `.env`, so the intent is clear but not implemented. |
| 9 | **Quick invoice actions swallow errors instead of surfacing them.** Send/remind/mark-paid failures just `console.error` — the rest of the app uses `runActionWithToast` for exactly this. | `app/(dashboard)/invoices/invoice-row-actions.tsx:44-46` | A failed action looks like it succeeded to the user. |
| 10 | **Brand name is inconsistent.** Page `<title>` metadata says `"Clentri"`; the sidebar, invoice preview, and everywhere else say `"Clentric"`. | `app/layout.tsx:19` | Small, but visible in every browser tab. |
| 11 | **No `.env.example`**, so a new developer has to reverse-engineer required variables from `lib/supabase/config.ts` / `src/db/index.ts`. | repo root | Slows onboarding; easy to fix. |
| 12 | **README is the unedited `create-next-app` boilerplate** — no project description, no setup steps specific to Clentric (Supabase project, migrations, env vars). | `README.md` | First thing a new contributor or reviewer opens. |

### 🟡 Worth cleaning up, lower urgency

| # | Issue | Where | Notes |
|---|---|---|---|
| 13 | **Duplicate `pgEnum` definition.** `subscription_plan` is declared independently in both `users.ts` and `subscriptions.ts` with the same Postgres enum name. | `src/db/schema/users.ts:11`, `src/db/schema/subscriptions.ts:11-15` | Works today because Drizzle/Postgres tolerate the redeclaration, but it's a maintenance trap — a future edit to one won't touch the other, and they can silently drift. Should be one shared export. |
| 14 | **Trailing-space index name typo.** `"idx_proposals_user_id "` (note the trailing space before the closing quote). | `src/db/schema/proposals.ts:46` | Cosmetic in Postgres, but will look wrong forever in `\di` / migration diffs if not fixed now. |
| 15 | **Auth OTP verification is asymmetric and includes a fallback workaround.** Register tries `type: "signup"`, and on failure silently retries with `type: "recovery"`. Login goes straight to `type: "recovery"`. | `app/(auth)/register/page.tsx:39-52`, `app/(auth)/login/page.tsx:39` | Functionally this likely works, but the fallback-and-retry pattern in `register` suggests the underlying Supabase OTP-type behavior was never fully pinned down — worth confirming intentionally against Supabase's docs rather than leaving the retry as an undocumented safety net. |
| 16 | **Serverless connection pool size.** The Postgres client is created with `max: 10` even though `.env`'s own comment says `DATABASE_URL` already points at Supabase's transaction-mode pooler. | `src/db/index.ts:14-17` | With a serverless deploy target (Vercel), each concurrent function instance opens its own pool; `max: 10` per instance can exhaust the pooler under load. Worth lowering (commonly `max: 1` behind a pooler) once traffic is a real concern — not urgent pre-launch, but flag it before scaling. |
| 17 | **Empty `catch` block.** The Supabase server client's cookie `setAll` swallows errors silently. | `lib/supabase/server.ts:16` — `catch (error) {}` | This is the documented Supabase SSR pattern for calls made from a Server Component (where cookie writes are expected to no-op), so it's not wrong — but the empty catch with an unused `error` binding will trip most linters/reviewers and is worth a one-line comment explaining why it's intentional. |
| 18 | **`lib/` has many single-export micro-files** (`format-currency.ts`, `format-date.ts`, `format-invoice-number.ts`, `format-phone.ts`, `get-invoice-display-status.ts`, `get-next-invoice-number.ts`, `calculate-invoice-totals.ts`, `normalizeOptionalFields.ts`, ...). | `lib/` | Not wrong, just fragmented — grouping related ones (e.g. all `format-*` under `lib/format/`) would make the directory easier to scan as it grows. |
| 19 | **`theme-toggle` exists but the app is pinned to light mode.** `next-themes` is configured with `defaultTheme="light"` and `enableSystem={false}`. | `app/layout.tsx:44-45` | If dark mode is meant to ship, this is disabling it at the root; if it isn't ready, the toggle component shouldn't be rendered on the dashboard page (`app/(dashboard)/dashboard/page.tsx:9`). |

### Not a bug (correcting a prior finding)

An earlier pass in this same file flagged `proxy.ts` as a naming mistake ("Next.js expects `middleware.ts`"). That was checked against the actual Next.js version installed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, which confirms: **`middleware` is deprecated in this Next.js release and has been renamed to `proxy`.** `proxy.ts` is correct as-is; no action needed. Likewise, the earlier IDOR finding on invoice mutations ("updates filter only by `invoiceId`") no longer matches the code — every invoice action in the current branch already filters by `userId` alongside the record ID.

---

## Production Readiness

| Criteria | Ready? | Notes |
|---|:---:|---|
| Core CRM (clients + projects) | 🟢 | Solid — full CRUD, ownership-scoped, soft deletes, transactions where needed |
| Auth | 🟡 | Functionally works; the OTP-type fallback (#15) should be understood and simplified, not just left in |
| Invoicing | 🔴 | Backend is genuinely strong; the missing list/view/edit pages and the send-vs-draft button bug (#1–#3) are launch-blocking |
| Proposals | 🔴 | Not built |
| Billing (SaaS/Stripe) | 🔴 | Not built |
| Dashboard | 🔴 | Hardcoded content only |
| Settings / profile | 🔴 | No page; nav link 404s |
| Tests | 🔴 | None exist |
| CI/CD | 🔴 | None exists |
| Monitoring / error tracking | 🔴 | `console.error` only, no aggregation |
| Documentation | 🟡 | This file + `docs/PROJECT.md` (both gitignored, not shipped); README is still boilerplate |
| Security posture | 🟡 | userId-scoping is consistently applied and RLS backs it up; no rate limiting anywhere |

**Suitable today for:** continued development, an internal demo, or a design/product review.
**Not suitable for:** any real user — the primary "Invoices" nav item doesn't work, and two other nav items 404.

---

## Must-fix Before Going Live

The user's bar was "no changes needed before making it live." Here is the concrete list that closes that gap, roughly in the order it should be done:

### 1. Stop the nav from lying (hours, not days)
- [ ] Build `/invoices` as a real list page (the pieces — `invoiceColumns`, `InvoiceFiltersBar`, `computeInvoiceStats`, `getInvoicesByUserId` — already exist; this is wiring, not new logic).
- [ ] Build `/invoices/[id]` (view) and `/invoices/[id]/edit` (reuse `InvoiceBuilder` with `updateInvoiceAction`, mirroring how `ClientDetail`/`ProjectDetail` do inline edit).
- [ ] Fix `InvoicePreview`'s "Create & Send": either wire it to call `createInvoiceAction` then `sendInvoiceAction`, or remove the button and keep only "Save as Draft" until send is real.
- [ ] Either build `/proposals`, `/notifications`, `/settings` as minimal real pages, or remove/relabel their nav entries (e.g. a disabled "Coming soon" state) so nothing in the sidebar 404s.
- [ ] Replace the hardcoded dashboard name with `profile?.name` (already loaded by `getDashboardData`).

### 2. Close the safety-net gap (a few days)
- [ ] Add `npm run typecheck` (`tsc --noEmit`) and run it + `npm run lint` + `next build` in CI on every PR (a single GitHub Actions workflow covers all three).
- [ ] Add at least one end-to-end smoke test covering: log in → create client → create project → create invoice → mark invoice paid. Nothing currently guards these paths.
- [ ] Add `.env.example` and replace the README with real setup instructions (Supabase project creation, running migrations, required env vars).

### 3. Tidy the loose ends called out above
- [ ] Route quick invoice actions' errors through `runActionWithToast` instead of `console.error`.
- [ ] Implement or remove `sendReminderAction`'s TODO (email via the already-present `RESEND_API` key, or drop the button until it's real).
- [ ] Fix the `Clentri`/`Clentric` metadata mismatch, the duplicate `subscription_plan` enum, and the `"idx_proposals_user_id "` trailing-space typo.
- [ ] Wire the Milestones tab to real create/complete UI, or hide the tab until it exists.

### 4. Pre-scale hardening (not launch-blocking, but do before real traffic)
- [ ] Add rate limiting to server actions (auth + write actions especially).
- [ ] Revisit the Postgres client's `max: 10` connection setting for the serverless/pooled deployment target.
- [ ] Add error monitoring (Sentry or similar) — today a production error is only visible in Vercel's function logs.

---

*This assessment is a snapshot from reading the code directly — re-verify any specific claim against the current source before treating it as ground truth, especially anything time-sensitive like "no tests exist" or "route X doesn't exist" if more commits have landed since 2026-09-11.*
