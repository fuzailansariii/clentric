-- ============================================================
-- 1. AUTO-CREATE public.users ROW ON SIGNUP
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- 2. AUTO-UPDATE updated_at ON EVERY UPDATE
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();

create trigger trg_clients_updated_at before update on clients
  for each row execute function set_updated_at();

create trigger trg_projects_updated_at before update on projects
  for each row execute function set_updated_at();

create trigger trg_milestones_updated_at before update on milestones
  for each row execute function set_updated_at();

create trigger trg_invoices_updated_at before update on invoices
  for each row execute function set_updated_at();

create trigger trg_proposals_updated_at before update on proposals
  for each row execute function set_updated_at();

create trigger trg_client_portal_tokens_updated_at before update on client_portal_tokens
  for each row execute function set_updated_at();

create trigger trg_subscriptions_updated_at before update on subscriptions
  for each row execute function set_updated_at();


-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

-- USERS
alter table users enable row level security;
create policy "users_manage_own_row" on users
  for all using (auth.uid() = id);

-- CLIENTS
alter table clients enable row level security;
create policy "users_manage_own_clients" on clients
  for all using (auth.uid() = user_id);

-- PROJECTS
alter table projects enable row level security;
create policy "users_manage_own_projects" on projects
  for all using (auth.uid() = user_id);

-- MILESTONES (via parent project)
alter table milestones enable row level security;
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
create policy "users_manage_own_invoices" on invoices
  for all using (auth.uid() = user_id);

-- INVOICE_ITEMS (via parent invoice)
alter table invoice_items enable row level security;
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
create policy "users_manage_own_proposals" on proposals
  for all using (auth.uid() = user_id);

-- PROPOSAL_ITEMS (via parent proposal)
alter table proposal_items enable row level security;
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
create policy "users_manage_own_subscription" on subscriptions
  for all using (auth.uid() = user_id);

-- NOTIFICATIONS
alter table notifications enable row level security;
create policy "users_manage_own_notifications" on notifications
  for all using (auth.uid() = user_id);

-- ACTIVITY_LOGS (read-only for users, writes only via service role)
alter table activity_logs enable row level security;
create policy "users_view_own_activity_logs" on activity_logs
  for select using (auth.uid() = user_id);

-- TEAM_MEMBERS
alter table team_members enable row level security;
create policy "owners_manage_own_team_members" on team_members
  for all using (auth.uid() = owner_id);

-- WEBHOOK_EVENTS (no user-facing policies — server-only via service role key)
alter table webhook_events enable row level security;