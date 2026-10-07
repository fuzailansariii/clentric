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
 * The purge runs in the database: public.purge_deleted_accounts(), scheduled
 * daily by pg_cron (supabase/migrations/0016_purge_deleted_accounts.sql).
 * Once the grace period has passed it locks and re-checks each account (a
 * restore that lands mid-run wins), deletes its rows in dependency order,
 * then deletes the auth user, which cascades to everything else. It is not
 * callable through the Supabase API and needs no service-role key in the
 * app. Its default grace interval must match ACCOUNT_DELETION_GRACE_DAYS.
 */

export const ACCOUNT_DELETION_GRACE_DAYS = 30;

const DAY_MS = 86_400_000;

/** When a pending account will be purged. */
export function scheduledDeletionDate(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + ACCOUNT_DELETION_GRACE_DAYS * DAY_MS);
}
