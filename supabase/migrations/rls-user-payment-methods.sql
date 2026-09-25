-- Row level security and updated_at trigger for user_payment_methods.
--
-- drizzle-kit only generates structural DDL (0007_user_payment_methods.sql),
-- so the table arrives with RLS off and no updated_at trigger. On Supabase
-- that means the anon key could read bank details through PostgREST, so this
-- runs in the same transaction as 0007, not some time later.
--
-- Grants: none. The app connects as `postgres` (BYPASSRLS), and anon /
-- authenticated hold no table grants in this database. The policy is
-- defence in depth for the day someone adds `grant ... to authenticated`.
--
-- Every statement is guarded, so this file is safely re-runnable.

-- USER_PAYMENT_METHODS (own rows only)
alter table user_payment_methods enable row level security;
drop policy if exists "users_manage_own_payment_methods" on user_payment_methods;
create policy "users_manage_own_payment_methods" on user_payment_methods
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at, via the set_updated_at() function from 0005_rls_and_updated_at.sql
drop trigger if exists trg_user_payment_methods_updated_at on user_payment_methods;
create trigger trg_user_payment_methods_updated_at before update on user_payment_methods
  for each row execute function set_updated_at();
