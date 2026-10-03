-- Hard-deletes accounts whose deletion was requested more than `grace` ago
-- (see lib/account-deletion.ts). Returns how many were purged.
CREATE OR REPLACE FUNCTION public.purge_deleted_accounts(grace interval DEFAULT interval '30 days')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  account record;
  purged integer := 0;
BEGIN
  FOR account IN
    SELECT id FROM public.users WHERE deletion_requested_at < now() - grace
  LOOP
    -- One block per account: a failure rolls back that account only.
    BEGIN
      -- Lock and re-check, so a restore that lands mid-run wins.
      PERFORM 1 FROM public.users
      WHERE id = account.id AND deletion_requested_at < now() - grace
      FOR UPDATE;
      IF NOT FOUND THEN
        CONTINUE;
      END IF;

      -- Children before clients, which they reference with ON DELETE RESTRICT.
      UPDATE public.proposals SET deposit_invoice_id = NULL WHERE user_id = account.id;
      DELETE FROM public.invoices WHERE user_id = account.id;
      DELETE FROM public.proposals WHERE user_id = account.id;
      DELETE FROM public.projects WHERE user_id = account.id;
      DELETE FROM public.clients WHERE user_id = account.id;
      -- activity_logs.user_id is ON DELETE SET NULL, so it must go explicitly.
      DELETE FROM public.activity_logs WHERE user_id = account.id;
      -- Cascades to public.users and every table still keyed on it.
      DELETE FROM auth.users WHERE id = account.id;

      purged := purged + 1;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'purge_deleted_accounts: account % not purged: %', account.id, SQLERRM;
    END;
  END LOOP;

  RETURN purged;
END;
$$;
--> statement-breakpoint
-- Server-side only: never callable through the Supabase API.
REVOKE ALL ON FUNCTION public.purge_deleted_accounts(interval) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_cron;
--> statement-breakpoint
-- Daily at 03:30 UTC. Re-running this migration replaces the job, not duplicates it.
SELECT cron.schedule('purge-deleted-accounts', '30 3 * * *', $$SELECT public.purge_deleted_accounts()$$);
