-- ============================================================
-- Applies what rls-and-triggers.sql never managed to apply.
--
-- An audit of the live database found that NONE of that file had
-- landed: no set_updated_at function, no updated_at triggers, and
-- row level security off on every table with zero policies. Only
-- its section 1 (the signup trigger) exists, and only because
-- 0004_fix_handle_new_user_trigger.sql applied it separately.
--
-- Two deliberate differences from the original file:
--
--   1. Section 1 is NOT repeated here. 0004 already created the
--      on_auth_user_created trigger, and re-running the original
--      `create trigger` (no `if exists` guard) is what made the
--      whole batch roll back the first time.
--
--   2. client_portal_tokens gets NO updated_at trigger. That table
--      has no updated_at column, so the trigger would create
--      successfully and then fail on the first UPDATE with
--      'record "new" has no field "updated_at"'.
--
-- Every statement is guarded, so this file is safely re-runnable.
-- ============================================================

-- ============================================================
-- 1. AUTO-UPDATE updated_at ON EVERY UPDATE
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_clients_updated_at on clients;
create trigger trg_clients_updated_at before update on clients
  for each row execute function set_updated_at();

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists trg_milestones_updated_at on milestones;
create trigger trg_milestones_updated_at before update on milestones
  for each row execute function set_updated_at();

drop trigger if exists trg_invoices_updated_at on invoices;
create trigger trg_invoices_updated_at before update on invoices
  for each row execute function set_updated_at();

drop trigger if exists trg_proposals_updated_at on proposals;
create trigger trg_proposals_updated_at before update on proposals
  for each row execute function set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on subscriptions;
create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();

-- ============================================================
-- 2. ROW LEVEL SECURITY
--
-- The application connects as `postgres`, which has BYPASSRLS, so
-- these policies do not affect server-side queries. They exist as
-- defence in depth for the PostgREST path (the public anon key):
-- today anon/authenticated hold no table grants at all, but a
-- future `grant ... to authenticated` would otherwise expose
-- every row to every logged-in user.
-- ============================================================

-- USERS
alter table users enable row level security;
drop policy if exists "users_manage_own_row" on users;
create policy "users_manage_own_row" on users
  for all using (auth.uid() = id);

-- CLIENTS
alter table clients enable row level security;
drop policy if exists "users_manage_own_clients" on clients;
create policy "users_manage_own_clients" on clients
  for all using (auth.uid() = user_id);

-- PROJECTS
alter table projects enable row level security;
drop policy if exists "users_manage_own_projects" on projects;
create policy "users_manage_own_projects" on projects
  for all using (auth.uid() = user_id);

-- MILESTONES (via parent project)
alter table milestones enable row level security;
drop policy if exists "users_manage_own_milestones" on milestones;
create policy "users_manage_own_milestones" on milestones
  for all using (
    exists (
      select 1 from projects
      where projects.id = milestones.project_id
      and projects.user_id = auth.uid()
    )
  );

-- INVOICES
alter table invoices enable row level security;
drop policy if exists "users_manage_own_invoices" on invoices;
create policy "users_manage_own_invoices" on invoices
  for all using (auth.uid() = user_id);

-- INVOICE_ITEMS (via parent invoice)
alter table invoice_items enable row level security;
drop policy if exists "users_manage_own_invoice_items" on invoice_items;
create policy "users_manage_own_invoice_items" on invoice_items
  for all using (
    exists (
      select 1 from invoices
      where invoices.id = invoice_items.invoice_id
      and invoices.user_id = auth.uid()
    )
  );

-- PROPOSALS
alter table proposals enable row level security;
drop policy if exists "users_manage_own_proposals" on proposals;
create policy "users_manage_own_proposals" on proposals
  for all using (auth.uid() = user_id);

-- PROPOSAL_ITEMS (via parent proposal)
alter table proposal_items enable row level security;
drop policy if exists "users_manage_own_proposal_items" on proposal_items;
create policy "users_manage_own_proposal_items" on proposal_items
  for all using (
    exists (
      select 1 from proposals
      where proposals.id = proposal_items.proposal_id
      and proposals.user_id = auth.uid()
    )
  );

-- CLIENT_PORTAL_TOKENS (via parent client)
alter table client_portal_tokens enable row level security;
drop policy if exists "users_manage_own_portal_tokens" on client_portal_tokens;
create policy "users_manage_own_portal_tokens" on client_portal_tokens
  for all using (
    exists (
      select 1 from clients
      where clients.id = client_portal_tokens.client_id
      and clients.user_id = auth.uid()
    )
  );

-- SUBSCRIPTIONS
alter table subscriptions enable row level security;
drop policy if exists "users_manage_own_subscription" on subscriptions;
create policy "users_manage_own_subscription" on subscriptions
  for all using (auth.uid() = user_id);

-- NOTIFICATIONS
alter table notifications enable row level security;
drop policy if exists "users_manage_own_notifications" on notifications;
create policy "users_manage_own_notifications" on notifications
  for all using (auth.uid() = user_id);

-- ACTIVITY_LOGS (read-only for users, writes only via service role)
alter table activity_logs enable row level security;
drop policy if exists "users_view_own_activity_logs" on activity_logs;
create policy "users_view_own_activity_logs" on activity_logs
  for select using (auth.uid() = user_id);

-- TEAM_MEMBERS
alter table team_members enable row level security;
drop policy if exists "owners_manage_own_team_members" on team_members;
create policy "owners_manage_own_team_members" on team_members
  for all using (auth.uid() = owner_id);

-- WEBHOOK_EVENTS (no user-facing policies — server-only via service role key)
alter table webhook_events enable row level security;
