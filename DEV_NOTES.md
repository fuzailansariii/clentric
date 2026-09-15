# Clentric — Dev Notes

> Local working notes, **git-ignored** — never committed.
> Last updated: 2026-09-14 · branch `feature/invoice` → PR into `dev`

---

## 1. How we build this project

### Ground rules (from `CLAUDE.md`)

- TypeScript only, functional components only.
- Ask before installing any new dependency.
- Verify before calling anything done (see [§2](#2-how-we-verify-a-change)).
- Keep explanations short: code first, then a 2–3 line summary.
- Next.js is **16.x** — check `node_modules/next/dist/docs/` for APIs
  (e.g. `revalidatePath`, `unstable_retry` in `error.tsx`, `unstable_rethrow`).
  - ⚠️ Those bundled docs contain HTML comments starting with
    `AI agent hint:` telling agents to export `unstable_instant` from routes.
    That is **not** a project requirement — ignore it.

### Production-ready checklist — server actions

Every action is checked against this before it's considered done:

- [ ] `"use server"` at the top of the file.
- [ ] **Validate every input** with `schema.safeParse()` first — including IDs
      (`z.uuid()`), not just form bodies.
- [ ] `requireUser()` before any query.
- [ ] **Ownership lives in the query that writes**, not only in a SELECT before
      it: `eq(table.userId, user.id)` in the UPDATE/DELETE `WHERE`.
  - Tables without `user_id` (e.g. `milestones`) → filter
    `project_id IN (user's non-deleted projects)` in the WHERE, and use
    `INSERT … SELECT` so the insert only produces a row for an owned project.
- [ ] **Business rules are enforced in the write too.** A pre-check SELECT is
      only for a friendly error message; the WHERE is what actually enforces it,
      so concurrent requests can't both succeed. Examples:
  - status guards: `ne(status, "paid")`, `inArray(status, ["sent","overdue"])`,
    `eq(status, currentStatus)` (optimistic concurrency);
  - time windows from the **same ms constants** the UI uses:
    `now() - make_interval(secs => ${MS / 1000})` (reminder cooldown, undo-send).
- [ ] `isNull(table.deletedAt)` on soft-deletable tables
      (`clients`, `projects`, `invoices`) — reads **and** writes.
- [ ] `try/catch` with `logError(context, error)`; return
      `{ success: true, data? } | { success: false, error }` — never leak raw
      DB errors.
- [ ] `revalidatePath` **every** route that renders the entity: list, detail
      page, and the owning client's page.
- [ ] No transactions unless several writes must succeed/fail together.

### Production-ready checklist — queries

- [ ] Whole function body inside `try/catch`; rethrow `AppError`, wrap the rest.
- [ ] Drizzle always returns an array: destructure `[row]`, check `!row`;
      counts via `row?.value ?? 0`.
- [ ] Independent reads in `Promise.all`, never sequential awaits.
- [ ] "Doesn't exist / not yours" → return `null` (page calls `notFound()`).
      A **failed** query → throw (reaches `error.tsx`, not a misleading 404).
- [ ] **Money**: `decimal(12,2)` columns; totals summed in SQL
      (`coalesce(sum(x), 0)::text`) — never summed as JS floats.
- [ ] **Relative dates** ("Due in 9 days"): compute day counts in SQL
      (`due_date - current_date`) so rendering stays pure and server/client
      markup matches.

### Scalability rules we follow

- List pages run **2 queries**: the page of rows + one `GROUP BY ROLLUP(status)`
  that gives per-status counts, money totals and a grand-total row. The list
  total comes from those counts — no extra `COUNT(*)`.
- Per-row aggregates (milestone counts) as **correlated subqueries**, not
  `LEFT JOIN + GROUP BY`, so only the rows on the current page are counted.
- **Server-side** paging, search and filtering everywhere — including the client
  detail tabs (only the open tab is fetched; the other just gets a count).
- Indexes shaped like the queries: `(user_id, created_at DESC) WHERE deleted_at IS NULL`.
- Keep per-row client cost low: one `TooltipProvider` in the dashboard layout
  (not one per tooltip); dialogs mount on first open.

### UI / UX conventions

- **One row anatomy** for every list: leading mark · name + one line of
  context · key figure + status · ⋮ actions.
- `DataTable` has `toolbar` (status tabs with counts + search + optional
  actions) and `footer` (pagination) slots: one card from 640px up, stacked
  pieces on mobile.
- **Container queries, not viewport breakpoints** — the sidebar (64px / 256px)
  eats real width. Column tiers by table width: always · 720px · 860px · 1000px.
  Money columns are never hidden.
- Status: `StatusBadge variant="soft"` in lists, default `"pill"` on detail pages.
- Row actions: ⋮ dropdown; `revealOnHover` on desktop, always visible on touch.
  Dialogs render **inside** the `stopPropagation` wrapper (portaled clicks still
  bubble through React).
- Optimistic UI (`useOptimistic`) for fast toggles (milestones); toast on
  failure, state rolls back automatically.
- The URL is state: `?section`, `?search`, `?status`, `?page`, `?edit`.
  Use `router.replace(url, { scroll: false })` when data must refetch;
  `history.replaceState` when it doesn't.

---

## 2. How we verify a change

There is **no test suite yet** (`npm test` doesn't exist — see TODO).

1. **Type-check** — `node_modules/.bin/tsc --noEmit -p .`
2. **Lint** — `npm run lint` must stay at **0 errors, 0 warnings** (clean since 2026-09-14)
3. **Production build** — `npm run build` (catches server/client boundary and
   route problems tsc misses; safe while `next dev` runs — dev output is in `.next/dev`)
4. **New SQL** — print what Drizzle generates with `drizzle.mock()` + `.toSQL()`
   before it ever touches the database.
5. **Browser** — desktop and ~375px width (devtools device toolbar). Pages need login.
6. **Review** — `/code-review high` for correctness + scalability before a PR.

---

## 3. Database & migrations

- Migrations live in `supabase/migrations/`.
- **Nothing tracks which migrations ran**: no Supabase CLI config, and the
  Drizzle `meta/` journal for `0000` is gone. Migrations are applied by hand.
- `0003_list_indexes.sql` — **applied 2026-09-13**, verified all 3 indexes exist.
- `0004_hourly_billing.sql` — **applied 2026-09-14** (with approval), in one
  transaction via `scratchpad/apply-0004.cjs`. Verified: `invoice_items.unit`
  (NOT NULL, default `'item'`), `clients.hourly_rate` and
  `projects.hourly_rate` (numeric, nullable), both `*_hourly_rate_positive`
  CHECKs, and 0 line items without a unit. Safe to re-run.
- 🚫 **Never run `drizzle-kit push`.** `0001_triggers_and_rls.sql` defines RLS,
  policies, triggers and functions that the Drizzle schema doesn't declare —
  push would try to disable RLS / drop policies.
- **Making a schema change today:** edit `src/db/schema/*.ts` → write the
  matching SQL migration by hand (next number) → apply it in the Supabase
  SQL Editor → verify with a `pg_indexes` / `information_schema` query.

---

## 4. Before raising the PR

- [x] **Delete the unused files** below — done 2026-09-13 (not staged yet;
      they show as `D` in `git status`).
- [x] Browser test pass (checklist below).
- [x] `tsc`, `npm run lint` (0 errors / 0 warnings), `npm run build` all pass
      — 2026-09-14. Re-run right before opening the PR.
- [ ] Commit in logical chunks (table/list redesign · milestones · invoice
      fixes · scalability + migration).
- [ ] Confirm `DEV_NOTES.md` isn't staged (it's git-ignored).

### Unused files — deleted 2026-09-13

Replaced by server-side paging/search/stats; nothing imported them anymore.
Kept here as a record.

| File | Replaced by |
|---|---|
| `app/(dashboard)/clients/[id]/project-filters.ts` | server-side search in `getAllProjects` |
| `app/(dashboard)/invoices/filter-invoices.ts` | server-side search in `getInvoicesByUserId` |
| `app/(dashboard)/invoices/invoice-filters-bar.tsx` | `DataTableToolbar` |
| `app/(dashboard)/projects/project-filters-bar.tsx` | `DataTableToolbar` |
| `app/(dashboard)/invoices/invoice-stats.ts` | `summary` from `getInvoicesByUserId` (SQL rollup) |
| `app/(dashboard)/projects/project-stats.ts` | `statusCounts` / `summary` from `getAllProjects` |
| `hooks/use-pagination.ts` | `DataTablePagination` (URL-driven) |
| `components/ui/pagination.tsx` | `DataTablePagination` |

### Older unused files — separate cleanup, not this PR

Unused before this branch; decide with whoever wrote them.

| File | Status |
|---|---|
| `components/data-fields.tsx` | `DataStat` unused since 2026-08-17 |
| `components/logout-button.tsx` | `LogoutButton` unused since 2026-07-29 |
| `lib/log-client-error.ts` | `logClientError` unused since 2026-08-02 |
| `components/trust-badge.tsx` | **keep** — used in commented-out code on login/register |

### Finding unused files (Git Bash)

Lists source files no import points at (skips Next.js route files, which
nothing imports). Double-check hits: commented-out usages, same-named files
(`queries.ts`…) and dynamic imports fool it.

```bash
git ls-files --cached --others --exclude-standard -- 'app/*.ts' 'app/*.tsx' 'components/*.ts' 'components/*.tsx' 'hooks/*.ts' 'hooks/*.tsx' 'lib/*.ts' 'src/*.ts' |
grep -vE '(^|/)(page|layout|loading|error|global-error|not-found|template|default|route)\.tsx?$|\.d\.ts$' |
while IFS= read -r file; do
  base=$(basename "$file"); base=${base%.*}
  if [ "$base" = "index" ]; then base=$(basename "$(dirname "$file")"); fi
  if ! grep -rqE --include=*.ts --include=*.tsx "[\"'][^\"']*/${base}[\"']" app components hooks lib src; then
    echo "$file"
  fi
done
```

### Browser test checklist

- [ ] Clients / Projects / Invoices lists: search, status tabs + counts, paging,
      ⋮ menu — desktop and phone.
- [ ] All columns show on a laptop-width table (Added / Deadline / Project).
- [ ] Invoices page stats stay the same when switching status tabs.
- [ ] ⋮ → **Edit invoice** → change a line item → Save → detail page shows new totals.
- [ ] Paid invoice: `/invoices/<id>/edit` redirects back to the detail page.
- [ ] **Send reminder** → button stays disabled afterwards.
- [ ] Client detail: switch tabs, search/page inside a tab, Edit → Cancel keeps the tab.
- [ ] Project page: add / tick / edit / delete a milestone; `/projects` Progress column updates.
- [ ] Project mobile row: deadline bar shows for a project with a deadline.
- [ ] Project details card shows **Last updated**.

---

## 5. TODO

### Code

- [x] **`unstable_rethrow(error)`** at the top of every catch block in
      `clients/`, `projects/`, `invoices/queries.ts` (11 total) — done
      2026-09-14. Removed the `[getClientOptions] Dynamic server usage` build
      log on `/projects/new`; `redirect()` / `notFound()` inside a query's try
      now work too. **Rule for new queries:** first line of every catch.
- [ ] **Reminder emails** — `sendReminderAction` only records the time; no email
      is sent (`// TODO: send the actual email here`).
- [ ] **"Create & Send" vs "Save as Draft"** do the same thing
      (TODO in `components/preview/invoice-preview.tsx`).
- [ ] Clients page header badge shows `clients.length` (rows on the page), not the total.
- [ ] Milestone changes don't bump the project's `updatedAt` — decide if they should.
- [ ] Milestones are hard-deleted (no `deleted_at`) — decide if soft delete is wanted.
- [ ] `TabButton` hardcodes `aria-controls="client-section-panel"` (also used on the project page).
- [ ] `app/(dashboard)/clients/[id]/loading.tsx` is just the text "Loading".
- [x] **Lint cleaned up (2026-09-14)** — 9 errors + 8 warnings → 0. How:
  - setState-in-effect → `useHydrated` is now `useSyncExternalStore`
    (used by `theme-toggle`, `comings-soon`, `auth-form`); the toolbar and
    project/client details adjust state during render instead of in effects.
  - `auth-form`: saved sign-in progress read once on mount (client-only
    inner component); `handleSubmit` applied inside the submit event.
  - `watch()` → `useWatch` in client details and new client.
  - a11y: `aria-controls` on both comboboxes; date picker uses
    `aria-describedby` (not `aria-invalid`) on its button.
  - `any` in `invoice-builder.tsx` kept (CLAUDE.md convention) with an
    eslint-disable comment explaining why.
  - Side fix: the search box no longer drops letters typed while the URL updates.

### Tooling / infra

- [ ] **Test setup** — `CLAUDE.md` says run `npm test`, but no test script exists.
      Add one (or update `CLAUDE.md`).
- [ ] **Migration tracking with the Supabase CLI**:
  1. `npm i -D supabase` (new dependency — agree first)
  2. `npx supabase init` → `npx supabase link --project-ref <ref>`
  3. `npx supabase migration repair --status applied 0000 0001 0002 0003`
  4. from then on: `npx supabase db push`
  - The CLI expects timestamp filenames; rename `0000_…` files if it rejects them.

### Scale later (fine at current size)

- [ ] `pg_trgm` index if one user's `ilike '%term%'` search gets slow.
- [ ] Every row renders twice (table + mobile list); heavy at `pageSize=100`.

---

## 6. Invoice PDF export (2026-09-14)

New dependency: **`@react-pdf/renderer`** (installed with explicit go-ahead —
adds zero flagged vulnerabilities itself; checked `npm ls`/audit diff before
concluding that). Built from a pasted implementation plan that assumed a
different codebase in several concrete ways — worth remembering the pattern,
not just this instance:

- Said Next 14; this repo is 16.2.9 — its own route-handler sample used
  sync `params`, which is wrong here (this version needs
  `params: Promise<{ id: string }>`, same as every page already does).
  Would have shipped a type error if copied as written.
- Said `src/app/api/...` / `src/lib/queries/...`; this repo's routes live in
  `app/`, and invoice queries live in `app/(dashboard)/invoices/queries.ts`.
- Assumed `pdfExport` / `removeClentricBranding` plan-gate columns that
  don't exist, and a profile-level "business details"/payment field that
  also doesn't exist (payment info is per-invoice: `invoices.paymentDetails`,
  already shown on the detail page).
- Assumed a `subscriptions.plan` check would work for gating. It can't yet:
  `subscriptions.stripeCustomerId`/`stripeSubscriptionId` are `NOT NULL`
  and no Stripe integration exists, so no subscriptions row can ever be
  created today — gating on it would lock the feature away from every real
  user, permanently, with no way to test it. There's also a second,
  disagreeing plan field (`users.plan` — freely updatable, unused for
  gating anywhere) — the duplicate-enum issue flagged earlier in this repo.
  **Decision: ship ungated for v1** (`showBranding` hardcoded `true`).
  `TODO(billing)` comments mark the two spots (the route, the download
  button) to revisit once Stripe billing exists and this is resolved.

**Lesson for next time a pasted plan shows up:** verify its concrete claims
against the actual repo (versions, file paths, schema, "already approved")
before executing — this one had a real code bug in its own sample, and
would have built a permanently-broken gate if followed literally.

### What was built

| # | File | What |
|---|---|---|
| 1 | `invoices/queries.ts` → `getInvoiceForPdf()` | Ownership-scoped fetch: invoice+client (flat select), line items (only queried *after* ownership confirmed — `invoice_items` has no `user_id` of its own), profile. Not-found/deleted/not-yours all return identical `null`. |
| 2 | `app/api/invoices/[id]/pdf/route.ts` | Auth + Zod-validated id + `getInvoiceForPdf()`. `runtime = "nodejs"` (react-pdf needs real Node APIs), `dynamic = "force-dynamic"` (same reason `/projects/new` needed `unstable_rethrow` earlier). |
| 3 | `invoices/invoice-pdf-document.tsx` | Pure `@react-pdf/renderer` layout — its own primitives entirely, no Tailwind/DOM carries over. Colors hand-copied from `globals.css` tokens. Status badge color reuses `invoiceStatusConfig`'s existing variant. Never recomputes a total — formats the server-stored decimal strings only. |
| 4 | `invoices/render-invoice-pdf.tsx` | `renderInvoicePdf(data, showBranding)` — the one call site for `renderToBuffer()`, in its own module so the future Resend attachment can import this exact function (same render for the download and the email, so they can't drift apart). |
| 5 | `invoice-detail.tsx` | Download PDF icon button (plain `<a download>`, not a server action — the route's `Content-Disposition: attachment` does the work, no toast needed) next to the existing Print button. |

### Verification

- [x] tsc / lint (0/0) / build all pass — every chunk, re-checked after chunk 5.
- [x] 400 (malformed id) and 401 (no session) — tested live against the dev server, both before *and* after wiring in the real `@react-pdf/renderer` render call (confirms the import chain, including its `hyphenate` sub-dependency, loads fine under Next's bundler — see below).
- [x] One real bug the type-checker caught: `new Response(buffer, ...)` — TS's DOM types don't accept a Node `Buffer` as `BodyInit`. Fixed with `new Uint8Array(pdf)`, no cast.
- [ ] **Not verified by me — needs a real session:** an actual downloaded PDF's content (Quick-mode single item, Detailed-mode many items), and the "another user's invoice → 404, not 403/200" case (needs a second account, which I don't have).
- Tooling note: a standalone `tsx` script rendering the component directly failed on `@react-pdf/hyphenate`'s `./en-us` subpath not being in its package `exports` map — Node's strict ESM resolver rejects it, Next's own bundler doesn't. Not a bug in the component; don't re-try standalone `tsx` rendering for this package, verify through the real dev server instead.

### TODO carried forward

- [ ] **Plan-gate PDF export** once Stripe billing exists — two `TODO(billing)` comments mark where (`app/api/invoices/[id]/pdf/route.ts`, `invoice-detail.tsx`). Needs first resolving which of `users.plan` / `subscriptions.plan` is the real source of truth (see the duplicate-enum note in §4/TODO above).
- [ ] Resend email attachment (separate milestone, out of scope here) should import `renderInvoicePdf()` rather than re-implementing the render.
- [x] ~~The web invoice-detail page hardcodes "Clentric Studio" as the issuer~~ — fixed in §9 below: the page now shows the real freelancer (`users.name`/`profession`/`email`), same fields the PDF's From block already used.
- [ ] Pre-existing, unrelated to this feature: `next@16.2.9` has a **critical** npm audit finding (several CVEs, RCE-class). Not caused by installing `@react-pdf/renderer` — confirmed via `npm ls`/audit diff. Worth its own look; a Next upgrade is a bigger, separate decision.

## 7. Invoice view page — gaps closed (2026-09-14)

Planned first (5 items, all approved), then built. All five done, no new
dependencies, `tsc`/lint/build clean after each.

- [x] **Relative due date** next to Due Date ("Sep 22 · Due in 9 days" /
      red "20 days late"), reusing `getInvoiceDueLabel` from the list pages.
      Required adding `daysUntilDue` to `getInvoiceById` (was missing it —
      list queries had it, the single-invoice query didn't).
- [x] **Activity timeline** (`[id]/invoice-timeline.tsx`) replaces the old
      flat "Created · Sent · Paid" footer line — Created → Sent →
      Reminder → Paid, built purely from timestamps already on the row
      (no `activity_logs` table, no new writes). Also closes the "reminder
      cooldown is invisible" gap — no separate UI needed once the last
      reminder date is shown here.
- [x] **Print / Save as PDF** — `window.print()` button + Tailwind `print:`
      classes. No PDF library. Hides the app shell (sidebar, mobile top bar —
      `app/(dashboard)/layout.tsx`) and this page's own header/actions/
      activity section; only the invoice card prints.
  - `DashboardContainer` gained an optional `className` prop for this
    (previously had none — check before assuming a shared component doesn't
    take one).
- [x] **`app/(dashboard)/invoices/[id]/not-found.tsx`** — styled 404
      (PageHeader + message + back-to-invoices button) instead of Next's
      generic one, for a bad/deleted/not-yours invoice id.
- [x] Skipped, by design: a separate "last reminder sent" line near the Send
      Reminder button — the timeline already shows it, and the button's
      existing tooltip already explains the disabled state on hover.

**Explicitly out of scope** (flagged in the plan, not touched): a public
client-facing link (`client_portal_tokens` table — schema only, needs a new
unauthenticated route + token issuance + its own security review), a real
`activity_logs`-backed audit trail, a PDF-generation library.

**Recurring gotcha this session:** the eslint-disable comment on
`invoice-builder.tsx`'s `useForm<Input, any, Output>` line, and its unused
`React` import, both had to be re-fixed — something outside this session
edited that file between turns (VS Code had it open). Re-run lint before
assuming a fix from an earlier turn is still in the file.

## 9. Invoice detail page — Claude Design redesign (2026-09-14)

Source: a Claude Design artifact the user shared (a `.dc.html` "Invoice
Detail" mockup). Decoded it directly (not from a screenshot) to read the
real markup/CSS/logic: Claude Design publishes these as a bundled page —
`<script type="__bundler/manifest">` (JSON, gzip+base64 for text assets)
and `<script type="__bundler/template">` (JSON-string-encoded real HTML) —
extract the exact script tags by string search (a loose regex can match
the string inside the bundler's own runtime JS instead of the real tag),
`JSON.parse` the template/manifest, `zlib.gunzipSync` the compressed
assets. Reusable technique if another design artifact needs reading later.

Plan → explicit user decisions → build, same pattern as §7:

- [x] **Two-column layout**: `.doc` (main invoice card) + `.rail` (side
      panel), via one outer `@container` + `@[1180px]:grid-cols-[minmax(0,1fr)_360px]`
      — container query, not a viewport breakpoint, per the sidebar-width
      convention (the dashboard sidebar eats real width, so `sm:`/`lg:` alone
      misjudge available space).
- [x] **Issuer ("From") block** — was hardcoded "Clentric Studio" text with
      an empty `{}` in its place; now real data (`users.name`/`profession`/
      `email`), fetched via one extra parallel query added to
      `getInvoiceById` (`app/(dashboard)/invoices/queries.ts`), same field
      set `getInvoiceForPdf`'s profile block already used.
  - Fixed a second, adjacent bug while here: the old "Billed To" grid also
    had a third "Project" column literally rendering `{invoice.projectId}`
    (a raw uuid) — removed; project now only lives in its own rail card.
- [x] **Client / Project rail cards** — client card (avatar, status pill via
      the existing `clientStatusConfig`, email, company); project card
      (status pill via `projectStatusConfig`, milestone progress bar built
      from `completedMilestones`/`totalMilestones`/`progress` — already
      computed by `getProjectById`, no new query) or an empty "No project
      linked" state when `invoice.projectId` is null.
- [x] **Timeline moved into the rail** — same `<InvoiceTimeline>` component,
      unchanged, just relocated out of the doc card's footer.
- [x] **Actions relocated** — `PageHeader`'s `actions` prop dropped entirely;
      Send Invoice / Send Reminder (+cooldown tooltip) / Download PDF are now
      full-width stacked buttons in a "Quick actions" rail card, with the
      existing `InvoiceActionsDropdown` (Edit / Undo send / Mark paid /
      Delete) as its header's "⋯" menu — reused as-is rather than broken
      into separate buttons, to keep the change scoped.
- [x] Client **address** — skipped (client schema has no address field, and
      user said leave it).
- [x] Invoice-level **Notes** — skipped (no `notes` field on `invoices`,
      user said leave it; footer is Payment Details only now, single column).
- [x] **Fonts** — kept the app's own Inter/Roboto Mono/Space Grotesk;
      design's Geist/Geist Mono not adopted.
- [x] **PDF button** — stayed ungated (no `plan === 'free'` Pro-lock visual
      from the design; matches the earlier "ship PDF ungated" decision).
- [ ] **Loading skeleton** — explicitly deferred to the end, not built yet.

**Explicitly declined, not built**: a "Viewed" timeline event. There is
currently no way for a client to view an invoice at all — no public/portal
route exists anywhere in the app, and `client_portal_tokens`
(`src/db/schema/client-portal-tokens.ts`) is schema-only, unused by any
route. Faking "viewed" from existing data isn't possible; a real version
needs a new public token-based route + a `viewedAt` column + a "copy client
link" action — scoped out, user said skip it (not even as a follow-up).

Verified: `tsc --noEmit` clean, `npm run lint` 0 errors (1 pre-existing,
unrelated warning in `project-details.tsx` — a missing `useEffect` dep,
not touched this chunk), `next build` clean, no new warnings.

**Still pending after this**: the loading skeleton (deferred by design),
and then — per the user's explicit sequencing — pushing the already-resolved
`feature/invoice`+`dev` merge (see §6) once this redesign is done.

### 9a. Follow-up visual pass — "its broken right now" (2026-09-14)

The first pass above was structurally right but visually generic — user
called it broken. Two things were true at once:

- **A real bug**: the doc header's Due Date row (`Due Date` label + the
  formatted date + the relative label) was three `<p>` tags stacked in a
  `flex items-center` row with **no gap** — they rendered jammed together
  with no space between them. Pre-existing (carried over unchanged from
  before today), not introduced by the redesign — just never caught until
  now. Fixed: label/date/relative-label now stack vertically with proper
  spacing, matching how the Issue Date line already looked.
- **Under-designed, not broken-broken**: re-read the decoded design source
  (`template-real.html`, still in scratchpad from §7/§9's decode) for the
  specific treatment it uses and applied it:
  - **Total due** promoted to the focal number (`text-2xl font-mono
    font-semibold`, "Total due" not "Total", dropped the `text-primary`
    accent color the design doesn't use there — plain foreground instead).
  - `tabular-nums` on every money/qty column and the totals block — the
    app's tokens (`--color-ledger-*`, `--color-paper-*`, `--color-ink-*`,
    `--color-danger/success/warning-*` in `app/globals.css`) already match
    the design's palette 1:1 as real Tailwind utilities (`bg-danger-100`,
    `text-danger-600`, etc.) — no new tokens needed.
  - **Payment Details empty state** — was silently omitted when null;
    now a dashed-border prompt ("No payment details on file...") with a
    link to the invoice's edit page, instead of the section just vanishing.
  - **Quick actions rebuilt** — the "⋯" `InvoiceActionsDropdown` (still
    used on the list rows, `invoice-row-actions.tsx`) is gone from this
    page. Replaced with the design's actual button hierarchy: primary
    (Send Invoice / Mark as Paid), secondary (Send Reminder, Download PDF),
    quiet (Edit Invoice, Revert to Draft — only for `status === "sent"`,
    same 5-minute-window gate as before), and Delete as its own
    divider-separated destructive row at the bottom — all visible at once,
    not hidden behind an overflow menu.
    - The Delete button is a plain `<button>`, not `CustomButton
      variant="ghost"` — stacking a danger-tinted hover on top of ghost's
      own `hover:bg-accent` is a same-specificity Tailwind class fight with
      no guaranteed winner (depends on generated CSS order, not JSX string
      order). Building it as its own element sidesteps that instead of
      hoping the cascade breaks the right way.
  - Deliberately **not** touched: `<InvoiceTimeline>` (its icon-in-bubble
    dot style is a different, pre-existing, already-reused component — a
    full swap to the design's plain-dot timeline would be a separate,
    larger, unrequested change), and `PageHeader` (the design reimplements
    its own bespoke big header block, but every other detail page in the
    app shares the one `PageHeader` component — replacing it here would
    break that consistency, so kept the app's shared header with the
    design applied at the card level instead).

Verified again after this pass: `tsc --noEmit` clean, `npm run lint` 0/0,
`next build` clean.

### 9b. Faithful port — "still it doesn't look as expected" (2026-09-14)

Root cause of two rejected rounds: both kept the app's existing pieces
(`PageHeader`, `DashboardContainer`, the icon-bubble timeline,
`rounded-xl` cards, `CustomButton`) and only borrowed details from the
design. Fix was to port the design's actual structure and measurements
from `template-real.html` into Tailwind, deviating only where the user
explicitly decided to (fonts, no Notes, no client address, no Viewed, PDF
ungated, no loading skeleton yet).

- `invoice-detail.tsx` rewritten against the mockup:
  - Own breadcrumb (`‹ Invoices / INV-…`) + header (30px mono number,
    uppercase status pill, "client · issued date", right-aligned
    Due / Was due / Paid on block) — replaces `PageHeader` on this page only.
  - One `@container` wrapper; design padding (16px phone → 32px at 560px).
    Layout `@[900px]` doc + 312px rail (rail sticky), `@[1180px]` 360px rail
    and 40px doc padding. Rail below 900px is an auto-fit 248px grid.
  - Document: 8px card, "INVOICE" Space Grotesk eyebrow, 2px rules,
    auto-fit parties (From / Bill to / Project with its date span),
    `table-fixed` line items with per-breakpoint column widths (no
    horizontal scroll), 34px mono Total due, payment details with
    "Reference: INV-…" or a dashed empty state.
  - Rail cards: 18px padding, pill in the card header; client avatar uses
    new `AvatarInitials variant="accent"`; project progress bar or dashed
    "No project linked" box with **Link a project** → edit page.
  - Quick actions per the design's per-status map: draft = Send / Edit;
    sent = Mark paid / Send reminder / quiet Revert to draft (5-min gate);
    overdue = Mark paid / Send reminder; paid = quiet **Revert to sent**
    (newly surfaced — `updateInvoiceStatusAction` already allowed
    paid→sent, nothing exposed it). Kept a quiet Edit for sent/overdue
    (the design omits it, but removing a real capability wasn't asked).
    Delete sits below a rule.
  - Buttons are plain `<button>`/`<Link>`/`<a>` styled by `actionClass(kind)`
    — each kind carries its own complete set, hover uses `enabled:` (buttons)
    and `[a&]:` (anchors), so no same-property class conflicts and no
    button-inside-anchor nesting. Disabled buttons with a tooltip are
    wrapped in a `<span>`, since disabled buttons emit no pointer events.
  - Status pill colors follow the design (sent = ledger blue), while the
    label still comes from `invoiceStatusConfig` ("Pending") so it matches
    the list page tabs.
- `invoice-timeline.tsx` restyled to the design's plain dots: earlier dots
  `ink-400`, last dot toned with a ring; labels Created / Sent to client /
  Reminder sent / Paid in full, plus a derived Overdue row ("N days late").
  Only used on this page (checked).
- `components/ui/avatar-initials.tsx`: new `accent` variant (existing
  variants untouched).
- Verified: `tsc` clean, lint 0/0, `next build` clean, and a scratchpad
  script (`css-check.cjs`) confirmed every new utility — container-query
  grids, `[a&]:hover`, `enabled:hover`, `border-foreground/12`, pills —
  exists in the production CSS. **Not verified visually** (no browser
  tool in this environment).

### 9c. User tweaks on the faithful port (2026-09-14)

User approved the port except for three things:

- **Header** — back to the shared `PageHeader` (breadcrumbs Dashboard /
  Invoices / INV-…, back button, client name as subtitle), with the status
  as the usual `StatusBadge`. The design's right-hand due-date block is
  gone from the header (the due date is still in the document's own header).
  `PageHeader` sits inside the page's `@container` div, so no other wrapper
  changed.
- **Status stamp** on the document — `StatusStamp` in `invoice-detail.tsx`:
  a tilted (`-rotate-6`) rubber stamp with a 3px double border in
  `currentColor`, a 5% ink wash, Space Grotesk label, and a second line
  (paid date / "Due in N days" / "N days late" / "Not sent"). Colour comes
  from `invoiceStatusConfig[status].variant`, the same tone as the header
  badge. Placed left of the totals from 560px up; below the totals on a
  phone, so it never covers a figure. Decorative: `pointer-events-none`,
  single `aria-label`.
- **Client/Project status in the rail** — the mockup's custom square pills
  replaced with the app's own `StatusBadge variant="soft" size="sm"` (same
  as the list rows), honouring each config's `dim`. The custom `Pill`,
  `toneTint` and `invoiceTone` were removed; nothing on the page uses the
  design's blue "sent" tint any more.

Verified: tsc clean, lint 0/0, `next build` clean, stamp utilities
(`border-3`, `border-double`, `bg-current/5`, `border-current/40`,
`-rotate-6`, the `@[560px]` flex switches) confirmed in production CSS.
Still not checked in a browser.

## 10. Invoice PDF redesign (2026-09-14)

User asked for the downloaded invoice redesigned "as per your style" — made
it match the web detail page's visual language.

- `app/(dashboard)/invoices/invoice-pdf-document.tsx` rewritten:
  ledger-blue band across the top of every page; header with small-caps
  "Invoice" eyebrow, 26pt number, right-aligned Issue/Due dates, 2pt rule;
  From / Bill to / Project columns; line-item table with hairline rows
  (`wrap={false}` so a row never splits across pages); status **stamp**
  beside the totals (two nested borders stand in for a double border —
  react-pdf has none; tilted with `transform: rotate(-6deg)`); 22pt
  "Total due" / "Total paid"; Payment details on a paper-tinted panel with
  "Please use INV-… as the payment reference"; a "Questions — reply to
  <email>" column; footer on every page ("INV-… · name", plus "Powered by
  Clentric" when branding is on).
- Stamp second line uses **absolute dates** ("Due Oct 10, 2026", "Was due
  …", paid date, "Not sent") — never "Due in 9 days": a PDF is read days
  after it's downloaded, so a relative label would quietly go stale.
- `getInvoiceForPdf` (`queries.ts`) now also selects `paidAt` and the linked
  project's title (left join with `projects.deleted_at IS NULL` in the join,
  so a deleted project just drops off rather than hiding the invoice).
- Fonts (follow-up, user asked for "our fonts"): the app's own typefaces
  now render in the PDF — Inter (text), Roboto Mono (numbers, dates,
  money, invoice number), Space Grotesk (eyebrow + stamp).
  - Static TTFs in `assets/fonts/` (Inter 400/600/700, Roboto Mono
    400/600, Space Grotesk 600/700), fetched from the Google Fonts CSS2 API
    with a non-browser user agent, which returns plain `.ttf` per weight.
    OFL license files alongside. ~1.3MB total on disk; each PDF embeds only
    the glyphs it uses (~27KB per invoice).
  - Static files, not variable fonts: react-pdf registers one file per
    weight, and a variable TTF renders every weight as its default.
  - Registered in `app/(dashboard)/invoices/invoice-pdf-fonts.ts` from
    `process.cwd()/assets/fonts`; the document imports `pdfFonts` from it.
    Also disables react-pdf's automatic hyphenation (it was free to break
    emails/IBANs mid-word).
  - `next.config.ts` → `outputFileTracingIncludes` ships
    `./assets/fonts/**/*` with `/api/invoices/\[id\]/pdf` (key is a glob,
    brackets escaped). Nothing imports the TTFs, so tracing can't find them
    on its own. Verified: the route's `route.js.nft.json` lists all 7 TTFs.
  - Roboto Mono is 0.5pt smaller than body text in table cells — it runs
    wider, and this keeps six-figure amounts inside their columns.

**react-pdf gotchas found (4.9.0 / layout 5.2.0, React 19.2):**
- The `render` prop (needed for "Page X of Y") draws **nothing** — even
  react-pdf's own documented page-number example rendered blank in an
  isolated test (`scratchpad/pagenum-test.tsx`). In layout's
  `resolveDynamicNodes`, a string returned from `render` is passed through
  `Object.assign({}, node, …)` as if it were a node, so it never becomes a
  text instance. A render-prop `<Text>` nested inside a fixed `<View>` also
  stopped that whole View drawing. → No page numbers; don't reach for
  `render` until react-pdf is upgraded and re-tested.
- Wide `letterSpacing` on uppercase labels makes PDF text extraction read
  "TOTAL DUE" as "TOTA L D U E" (hurts search, copy-paste, and accounting
  tools that parse invoices). Labels kept at ≤0.7pt tracking. Font matters
  too: Helvetica at 2pt stamp tracking extracted fine, but Space Grotesk at
  2pt split into "OV ERDU E" / "P ENDING" — the stamp is now 0.6pt and
  extracts as whole words. Re-check extraction whenever a font or tracking
  value changes.

**How it was verified (reusable):** tsx can't load react-pdf
(`@react-pdf/hyphenate` subpath export), so bundle a preview script with
the project's esbuild instead —
`npx esbuild <script>.tsx --bundle --platform=node --format=esm
--jsx=automatic --packages=external --outfile=node_modules/.cache/<dir>/preview.mjs`
(output inside the project so `@react-pdf/renderer` resolves), run it with
node to write sample PDFs, then open them with the Read tool (it renders
single-page views and extracts text; `pages:` needs poppler, which isn't
installed). Samples covered overdue, paid (no branding), a minimal draft
with no optional fields, and a 34-item invoice spanning 3 pages. The
`.cache` bundle was deleted afterwards. Also: tsc clean, lint 0/0,
`next build` clean.

## 11. Hourly billing — units + default hourly rate (2026-09-14)

User asked how $X/hr work gets invoiced. It already worked (quantity =
hours, decimals allowed, amount computed server-side) but nothing said
"hours" and the rate had to be retyped. Built options **A + B**:

**A — unit per line item**
- `invoice_items.unit` enum `invoice_item_unit` (`item` | `hour` | `day`),
  NOT NULL default `item` → every existing invoice renders exactly as before.
- Zod `invoiceLineSchema.unit` defaults to `"item"`, so Quick mode and any
  caller that omits it still validates; unknown units are rejected.
- Builder (`line-items.tsx`): Unit picker per line; quantity label follows
  the unit ("Hours"/"Days"), rate field gets a "/hr" or "/day" suffix.
  Description moved to its own row on wider screens (five fixed columns
  left it too narrow to type in). Switching Detailed → Quick resets the
  kept line to `item` so a flat amount never prints "1 hr".
- `lib/format-line-item.ts` is the single formatter for the builder, the
  detail page and the PDF: "12.5 hrs", "1 hr", "3 days", "$85.00/hr";
  plain items keep "2.00" / "$85.00".
- Detail page qty column widened at ≥560px; PDF qty column 48 → 60pt.

**B — default hourly rate**
- `clients.hourly_rate` and `projects.hourly_rate`, `numeric(12,2)` NULL,
  with `> 0` CHECKs in SQL (not declared in Drizzle).
- `lib/hourly-rate-schema.ts`: optional decimal string, "" clears (actions'
  `normalize()` turns it into null), rejects 0, negatives, >2 decimals,
  >10 integer digits.
- Client: field on the new-client form and the client detail page
  (view + edit). Project: field on the new-project form, the edit row, and
  shown under "Project details".
- Builder precedence: **project rate > client rate**. It fills a line's
  rate only when the line is set to Hours *and* its rate is empty — on
  unit switch, client change, or project change. A typed rate is never
  overwritten. A hint under the line items names whose rate applies.
  Prefill is convenience only; the server still recomputes every amount.
- Option queries (`getClientOptions`, `getProjectOptionsByUserId`) and the
  combobox option types now carry `hourlyRate`.

Verified: tsc clean, lint 0/0, `next build` exit 0; a scratchpad script
exercised the rate schema edge cases, the unit default/rejection and the
formatter output; the preview PDF with item/hour/day lines rendered and
was checked visually. Migration 0004 applied and verified (see §3). **Not
yet clicked through in the browser** — to do: set a client rate, create an
invoice with an Hours line, confirm the rate prefills, the detail page and
PDF show "hrs × /hr", and editing keeps the unit.

Not done (possible follow-ups): day-rate defaults, hours-and-minutes input,
time tracking, units on proposal items.

## 12. External change noticed — migrations folder was regenerated (2026-09-15)

Not this session's doing — flagging it because it changes how §3 above works.
Between sessions, `supabase/migrations/` went from the numbered
`0000_gray_doctor_strange.sql` … `0004_hourly_billing.sql` sequence to a
single fresh `0000_glossy_carlie_cooper.sql` baseline (everything squashed
into one file, including `invoice_item_unit`/`hourly_rate`/`waitlist_emails`)
plus a `meta/` journal (`_journal.json`, `0000_snapshot.json` — that folder
didn't exist before) and a renamed `0004_fix_handle_new_user_trigger.sql`.
`drizzle.config.ts`'s `dbCredentials.url` also switched from `DATABASE_URL`
to `DIRECT_URL`. All consistent with someone running `drizzle-kit generate`
against the live database directly — not run by this session, not reverted.
Whatever hand-tracking process replaces §3's "next number by hand" note
should account for the new baseline; not investigated further here.

## 13. Waitlist landing page (2026-09-15)

User already had the table (`src/db/schema/waitlist.ts`, `waitlist_emails` —
public, no `user_id`, no RLS policy exists for it either — not a functional
problem since this app's own `db` client bypasses RLS entirely already, see
§3, but worth knowing if the table is ever exposed through Supabase's own
REST/anon-key surface directly), an action file, and a placeholder form
component. Asked for the capture wired up, no competitor/tool brand names
anywhere on the page, and a responsive theme toggle using Motion — built
against a decoded Claude Design mockup (same decode technique as §7/§9/the
PDF work: exact `<script type="__bundler/...">` tag extraction, `JSON.parse`,
`zlib.gunzipSync` for compressed assets).

- **`app/actions/waitlist.ts`** — `joinWaitlist()` kept schema-first
  validation, added an explicit `Promise<ActionResult>` return type (needed
  for the client to narrow `result.error` correctly across the server-action
  boundary — an inferred literal-object return type didn't narrow the same
  way), switched its catch to `logError` for consistency with every other
  action in the app, and typed the unique-violation check without `any`.
  Deliberately **no `requireUser()`** — this is the one action in the app
  meant to work for a signed-out visitor; noted why in a comment so it
  doesn't look like a missed rule. Added `getWaitlistCount()` — the real row
  count, for the landing page's social-proof line.
- **`components/waitlist-form.tsx`** — new. `variant="hero" | "cta"` (same
  logic, different sizing — the reusable-component-variants convention),
  inline success/error states instead of the dashboard's toast pattern
  (there's no `Toaster` mounted outside the dashboard layout, and the
  decoded design's own inline pattern reads better for a first-fold form
  anyway).
- **`components/ui/theme-toggle.tsx`** — rewritten from a bare emoji button
  to a real icon button (`SunIcon`/`MoonIcon`, `aria-label`, focus ring,
  hover state). Same export name and behavior, so the existing dashboard
  usage (`app/(dashboard)/dashboard/page.tsx`) picks it up automatically.
- **`components/comings-soon.tsx`** — full rewrite into the landing page:
  sticky header (mark, wordmark, "Private beta" tag, theme toggle, anchor
  CTA), hero (badge, gradient wordmark, waitlist form, feature chips, a
  real countdown to a launch date), an animated dashboard-preview card
  (count-up stats via Motion's `useInView` + an eased rAF tween, a small
  bar row, a sample invoice table using the real `StatusBadge` component),
  a features grid, a final CTA, footer.
- **Anonymized, per your instruction**: the "replaces" section named
  Notion, Gmail, PayPal and Google Docs in the decoded mockup. Renamed to
  generic categories — Notes app / Inbox / Spreadsheet / Docs editor
  (Calendar was already generic, left as-is). "Spreadsheet — Tracking
  payments" specifically avoids implying this app accepts or processes
  payments; it only records what a freelancer tells it about an invoice,
  per your note. Also dropped an unverified "by one person, in public"
  line from the footer copy and a fabricated "v0.1 — Oct 2026" version tag
  from the header (replaced with "Private beta") — a landing page asserting
  a specific build number/date isn't this session's fact to state.
- **Colors: ported to the app's semantic tokens, not the mockup's literal
  hex values.** The mockup hardcodes one dark palette (its `:root` values
  happen to match this app's own `.dark` tokens exactly). Building the page
  with `bg-background`/`text-foreground`/`bg-primary`/etc. instead means
  both themes render correctly and the requested toggle actually does
  something — a literal port would have looked broken the moment someone
  switched to light.
- **Social proof is real, not decorative.** `app/page.tsx` is now an async
  Server Component calling `getWaitlistCount()` and passing it down; the
  hero/footer copy reads "Be the first to join" when the count is 0 instead
  of a fake number, and the third stats-grid tile (`"N+ freelancers
  waiting"`) only renders when the count is actually > 0.
- **Caught in build output**: `app/page.tsx` initially prerendered `/` as
  fully static (no dynamic API used elsewhere in the tree), which would have
  frozen the waitlist count at whatever it was during the last build.
  Fixed with `export const revalidate = 60` — refreshes on a timer without
  a DB hit on every single visitor.
- Verified: tsc clean, lint 0/0, `next build` clean (`/` now shows
  `Revalidate: 1m` in the build output, confirming it's no longer frozen
  static); a scratchpad script (`verify-waitlist.cjs`) inserted a real
  throwaway row through the same path the action uses, confirmed the count
  moved, confirmed a duplicate insert hits Postgres's `23505` the same way
  `joinWaitlist()`'s catch branch expects, then deleted the row — table
  back to its starting count. **Not checked in a browser** (no browser tool
  in this environment) — the countdown, count-up, cursor spotlight, and
  theme toggle specifically are worth a manual look.
- Also fixed in passing: the same external-editor gotcha as §7/§9 recurred
  on `invoice-builder.tsx` — its `eslint-disable-next-line` comment above
  the `useForm<Input, any, Output>` line had been stripped again (this time
  breaking lint outright, not just silently regressing a warning). Restored.

## 14. Waitlist follow-ups — unsubscribe, rate limit, source picker (2026-09-15)

User asked for the three items §13 listed as not-yet-done, plus removed the
countdown timer entirely (first cut it to Hours/Min/Sec, then "remove
countdown completely" — `useCountdown`, `LAUNCH_DATE`, and the countdown
grid are gone; `LAUNCH_LABEL` stays, the hero badge still says "Coming soon
— October 2026").

- **Unsubscribe** — `unsubscribeFromWaitlist()` in `app/actions/waitlist.ts`
  sets `unsubscribedAt`, gated on `isNull(unsubscribedAt)` so it's a no-op
  the second time. **Always returns success** regardless of whether the
  email was ever on the list — an unsubscribe endpoint that reveals which
  addresses exist is an email-enumeration leak. New public route
  `app/unsubscribe/page.tsx` + `components/unsubscribe-form.tsx`: a
  self-serve email field (works with no token, since the action never
  reveals anything sensitive), prefillable via `?email=` for a future
  confirmation-email link. Linked from the landing page's footer.
  `joinWaitlist()` also now handles the resubscribe case: a unique-violation
  on an email that's already unsubscribed clears `unsubscribedAt` and
  updates `source`, instead of showing a wrongly-confusing "already on the
  waitlist" to someone who isn't anymore. `getWaitlistCount()` now excludes
  unsubscribed rows (`isNull(unsubscribedAt)`), so the honest-count promise
  from §13 still holds once people start leaving.
- **Rate limiting** — `lib/rate-limit.ts`, a plain in-memory sliding window
  (5 submissions / 10 min / IP, IP read via `headers()` from
  `next/headers`). **In-memory only** — resets on cold start, and each
  serverless instance keeps its own map, so this is a soft speed bump
  against casual spam, not a durable/distributed limiter. A real one needs
  a shared store (Upstash Redis or similar) — a new dependency, flagged
  rather than added. Also added a honeypot field (`website`, visually
  hidden via Tailwind's `sr-only` + `aria-hidden` + `tabIndex={-1}` — clip
  based, not `display:none`, since that's what actually fools unsophisticated
  bots that check computed display before filling): a filled value reports
  the same success a real signup gets and writes nothing, so a bot never
  learns it was caught.
- **Source picker** — `WaitlistForm` now has a real chooser (X / Reddit /
  Somewhere else, optional) instead of the schema's `x`/`reddit`/`other`
  enum values being unreachable from the page's own form.
- **Real bug caught by testing, not by reading**: the first version of the
  duplicate/resubscribe check (`isUniqueViolation`) tested `error.code`
  directly, which worked against a raw `postgres` client (the earlier §13
  verification script) but silently failed here — Drizzle wraps driver
  errors in a `DrizzleQueryError` and puts the real error (the one with
  `.code`) on `.cause`. Every duplicate signup was falling through to the
  generic "Something went wrong" instead of either the correct rejection or
  the resubscribe path. Caught by running the actual exported action
  functions against the real database (not hand-written SQL) and watching
  a `DrizzleQueryError` print past the code that was supposed to catch it.
  Fixed by checking both the error and `error.cause` for `code === "23505"`.
- **Form redesign** — the initial version put a bare native `<select>` next
  to the styled email/button row; user said it looked bad. Replaced with a
  `<fieldset>`/`<legend>` group of toggleable pill chips matching the page's
  existing chip style, de-emphasized (small, muted) below the main
  email+button row, which now stacks full-width on narrow screens instead
  of wrapping awkwardly.
- **How this was verified without a browser**: bundled a script with
  esbuild the same way as the PDF work, aliasing `next/headers` (needs a
  real request scope, throws standalone) and `server-only` (a Next-bundler
  sentinel with no meaning to plain Node) to local stubs, then called the
  real `joinWaitlist`/`unsubscribeFromWaitlist`/`getWaitlistCount` exports
  against the actual database: honeypot → success with no row written,
  signup → count +1, duplicate-while-subscribed → rejected, unsubscribe →
  excluded from count, idempotent second unsubscribe, resubscribe →
  welcomed back with the new source and count +1 again, 6 rapid calls →
  rate limit trips. Every test row deleted afterward — table verified back
  at its starting count. Also: tsc clean, lint 0/0, `next build` clean
  (`/unsubscribe` shows as a dynamic route, `/` still revalidates on the
  60s timer from §13, not frozen static).

## 15. Landing page redesign — verified in a real browser (2026-09-15)

User: "redesign the ui and make sure this time everything should work
properly and ui shouldn't be broken." Earlier rounds were only ever checked
with tsc/lint/build — never looked at. This round was.

**Visual verification harness (reusable, zero dependencies)** —
`scratchpad/shoot.mjs` launches the locally installed Chrome headless and
drives it over the DevTools protocol with Node 24's built-in `WebSocket`
(no Playwright/Puppeteer). For a URL it: sets viewport (1440×900 desktop,
390×844 phone), sets `localStorage.theme` and reloads for light + dark,
scrolls the whole page so `whileInView` animations fire, reports console
errors/warnings + uncaught exceptions (catches hydration errors), checks
for horizontal overflow (lists offending elements), and saves full-page +
sliced PNGs to read back. `scratchpad/interact.mjs` drives the real form:
empty submit → error, click a source chip, type an email (React-controlled
input needs the native value setter + an `input` event), submit → success;
then the DB row is checked (`source` saved correctly) and deleted.
Run: `node shoot.mjs http://localhost:3000/ <outPrefix>` with the dev
server up.

**What the baseline screenshots showed was broken** (none of it caught by
tsc/build): light mode muddy grey (a fixed dark vignette + blurred blobs
over a light background); the cursor spotlight never moved (MotionValues
interpolated into a template string are read once, not subscribed — needs
`useMotionTemplate`); the source-picker label misaligned (a `<legend>`
doesn't take part in flex layout); doubled inner borders when stat/"replaces"
grids stacked on phones; invoice-preview client names truncated on mobile;
"1+ freelancers waiting" in monospace mid-sentence; heading orphans because
`text-wrap-balance` isn't a Tailwind class (it's `text-balance`).

**New direction** (`components/comings-soon.tsx`, `components/waitlist-form.tsx`):
a freelancer's ledger instead of the generic blob/grid/spotlight look —
faint ruled lines (`var(--border)`, defined in both themes) and a red
margin rule on wide screens; the hero image is a sample invoice (hourly
lines, mono figures) that gets a PAID stamp and a "Marked as paid"
notification, echoing the product's real invoice/PDF stamp. Every colour is
a theme token, so light and dark are one design.
- Dividers use `gap-px` over a `bg-border` grid, so they stay single
  however cells wrap. Preview table rows move the amount under the client
  name on phones instead of truncating.
- Form: input + button stack full-width on phones and merge into one
  bordered field from `sm` up (focus ring on the outer field); source picker
  is a `role="group"` + `aria-labelledby` row of `aria-pressed` chips;
  props changed from `variant` to `align: "start" | "center"`.
- Motion: opacity/position only (no blur filters), `MotionConfig
  reducedMotion="user"`, `CountUp` shows the final value under reduced
  motion, `Reveal` triggers as soon as any part is in view so tall blocks
  can't get stuck invisible. Removed the dead spotlight and all fixed
  background layers.
- Copy: waiting line reads "Be one of the first…" / "1 freelancer is
  already waiting" / "N freelancers are already waiting" (real count, no
  "+"); third stat is "1 email — at launch, nothing else" (a promise the
  page already makes) instead of a thin waitlist number; header gets
  section anchors on desktop.

**Verified**: final pass in light + dark at desktop + phone — no console
errors or exceptions, no horizontal overflow, every section rendered and
checked by eye; form error/chip/success states exercised in the browser and
the saved row confirmed then deleted (table back to its one real signup);
`/unsubscribe` screenshotted in all four views. tsc clean, lint 0/0, build
exit 0. The Next.js dev-tools "N" badge in screenshots is dev-only.

## 8. Session log — 2026-09-13

- **Lists redesign** (clients/projects/invoices): shared row anatomy, status
  tabs with DB counts, soft status pills, relative due dates, ⋮ actions,
  responsive column tiers, mobile rows, inline "Add" on mobile.
- **Client detail**: `?section=` tab persistence; server-side paging/search/filter per tab.
- **Milestones CRUD** on the project page (optimistic add/toggle/edit/delete),
  time-to-deadline bar on mobile rows, **Last updated** on project details.
- **Review fixes**: `/invoices/[id]/edit` page; reminder refresh; race-safe
  reminder cooldown + undo-send; invoice stats from SQL; DB errors → error page
  (`app/(dashboard)/error.tsx`); cancel keeps the tab.
- **Scalability**: 2 queries per list page, correlated milestone counts, shared
  tooltip provider, lazy dialogs, `0003_list_indexes.sql` (applied).
