/**
 * Account deletion with a grace period.
 *
 * requestAccountDeletionAction sets users.deletion_requested_at and signs the
 * user out on every device. From then on:
 *   - requireUser() refuses the account, so no dashboard page, query,
 *     server action or the invoice PDF route works for it — the dashboard
 *     layout shows the restore screen instead;
 *   - public proposal links (/p/[token]) say "no longer available", and the
 *     client-facing actions behind them refuse to act;
 *   - nothing the user could trigger sends email, since every such action
 *     goes through requireUser(). (Clentric sends no scheduled email yet —
 *     any future cron/reminder job must skip users with
 *     deletion_requested_at set.)
 * Signing back in within the grace period shows the restore screen, where
 * the user can clear the column or sign out again.
 *
 * TODO(purge job) — not built yet. A scheduled, server-side-only job:
 *   1. Select users where deletion_requested_at < now() - interval
 *      '<ACCOUNT_DELETION_GRACE_DAYS> days'.
 *   2. For each, in one transaction, hard-delete their rows in dependency
 *      order (children before parents, since clients/invoices use
 *      ON DELETE RESTRICT): invoice_items -> proposal_items ->
 *      proposal_milestones -> milestones -> invoices (clear
 *      proposals.deposit_invoice_id first) -> proposals -> projects ->
 *      clients -> user_payment_methods, invoice_counters, notifications,
 *      activity_logs, client_portal_tokens, subscriptions, team_members ->
 *      users. Re-check deletion_requested_at in the DELETE's own WHERE so a
 *      restore that lands mid-run wins.
 *   3. Delete the auth user with the Supabase service role
 *      (auth.admin.deleteUser). The service-role key must only ever be read
 *      on the server (never NEXT_PUBLIC_*), and the job must not be callable
 *      from the browser — a cron route checking a secret header, or a
 *      Supabase scheduled function.
 *   4. Log counts, never row contents.
 */

export const ACCOUNT_DELETION_GRACE_DAYS = 30;

const DAY_MS = 86_400_000;

/** When a pending account will be purged. */
export function scheduledDeletionDate(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + ACCOUNT_DELETION_GRACE_DAYS * DAY_MS);
}
