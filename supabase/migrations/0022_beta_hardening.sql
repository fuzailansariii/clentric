-- Folds in the hand-run files (0004 fix, 0005 RLS, rls-*.sql, invoice-counter-guard,
-- projects-proposal-fk) so `drizzle-kit migrate` alone builds a complete database. Re-runnable.

-- Sign-up trigger: fixed search_path, since it runs as SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
--> statement-breakpoint
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
--> statement-breakpoint
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
--> statement-breakpoint
CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_milestones_updated_at ON milestones;
--> statement-breakpoint
CREATE TRIGGER trg_milestones_updated_at BEFORE UPDATE ON milestones FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
--> statement-breakpoint
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_proposals_updated_at ON proposals;
--> statement-breakpoint
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_user_payment_methods_updated_at ON user_payment_methods;
--> statement-breakpoint
CREATE TRIGGER trg_user_payment_methods_updated_at BEFORE UPDATE ON user_payment_methods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- Invoice numbers never go down, whoever writes them.
ALTER TABLE invoice_counters DROP CONSTRAINT IF EXISTS invoice_counters_last_number_non_negative;
--> statement-breakpoint
ALTER TABLE invoice_counters ADD CONSTRAINT invoice_counters_last_number_non_negative CHECK (last_number >= 0);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION prevent_invoice_counter_decrease() RETURNS trigger AS $$
BEGIN
  IF new.last_number < old.last_number THEN
    RAISE EXCEPTION 'Invoice number must be higher than %', old.last_number
      USING errcode = 'check_violation';
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_invoice_counters_no_decrease ON invoice_counters;
--> statement-breakpoint
CREATE TRIGGER trg_invoice_counters_no_decrease BEFORE UPDATE ON invoice_counters FOR EACH ROW EXECUTE FUNCTION prevent_invoice_counter_decrease();
--> statement-breakpoint

-- Kept out of the Drizzle schema: it would close a type cycle (invoices -> projects -> proposals).
DO $$
BEGIN
  ALTER TABLE projects
    ADD CONSTRAINT projects_proposal_id_proposals_id_fk
    FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

-- Row level security on every table. The app connects as postgres (BYPASSRLS).
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_row" ON users;
--> statement-breakpoint
CREATE POLICY "users_manage_own_row" ON users FOR ALL USING (auth.uid() = id);
--> statement-breakpoint
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_clients" ON clients;
--> statement-breakpoint
CREATE POLICY "users_manage_own_clients" ON clients FOR ALL USING (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_projects" ON projects;
--> statement-breakpoint
CREATE POLICY "users_manage_own_projects" ON projects FOR ALL USING (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_milestones" ON milestones;
--> statement-breakpoint
CREATE POLICY "users_manage_own_milestones" ON milestones FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = milestones.project_id AND projects.user_id = auth.uid())
);
--> statement-breakpoint
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_invoices" ON invoices;
--> statement-breakpoint
CREATE POLICY "users_manage_own_invoices" ON invoices FOR ALL USING (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_invoice_items" ON invoice_items;
--> statement-breakpoint
CREATE POLICY "users_manage_own_invoice_items" ON invoice_items FOR ALL USING (
  EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
--> statement-breakpoint
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_proposals" ON proposals;
--> statement-breakpoint
CREATE POLICY "users_manage_own_proposals" ON proposals FOR ALL USING (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE proposal_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_proposal_items" ON proposal_items;
--> statement-breakpoint
CREATE POLICY "users_manage_own_proposal_items" ON proposal_items FOR ALL USING (
  EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_items.proposal_id AND proposals.user_id = auth.uid())
);
--> statement-breakpoint
ALTER TABLE proposal_milestones ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_proposal_milestones" ON proposal_milestones;
--> statement-breakpoint
CREATE POLICY "users_manage_own_proposal_milestones" ON proposal_milestones FOR ALL USING (
  EXISTS (SELECT 1 FROM proposals WHERE proposals.id = proposal_milestones.proposal_id AND proposals.user_id = auth.uid())
);
--> statement-breakpoint
ALTER TABLE client_portal_tokens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_portal_tokens" ON client_portal_tokens;
--> statement-breakpoint
CREATE POLICY "users_manage_own_portal_tokens" ON client_portal_tokens FOR ALL USING (
  EXISTS (SELECT 1 FROM clients WHERE clients.id = client_portal_tokens.client_id AND clients.user_id = auth.uid())
);
--> statement-breakpoint
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_notifications" ON notifications;
--> statement-breakpoint
CREATE POLICY "users_manage_own_notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_view_own_activity_logs" ON activity_logs;
--> statement-breakpoint
CREATE POLICY "users_view_own_activity_logs" ON activity_logs FOR SELECT USING (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "owners_manage_own_team_members" ON team_members;
--> statement-breakpoint
CREATE POLICY "owners_manage_own_team_members" ON team_members FOR ALL USING (auth.uid() = owner_id);
--> statement-breakpoint
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_payment_methods" ON user_payment_methods;
--> statement-breakpoint
CREATE POLICY "users_manage_own_payment_methods" ON user_payment_methods FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_manage_own_invoice_counter" ON invoice_counters;
--> statement-breakpoint
CREATE POLICY "users_manage_own_invoice_counter" ON invoice_counters FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
--> statement-breakpoint
-- Server-only tables: RLS on, no policies. Waitlist sign-ups go through a server action.
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE waitlist_emails ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "Anyone can join the waitlist" ON waitlist_emails;
--> statement-breakpoint

-- Close the Supabase Data API: anon/authenticated get no table or function access,
-- now or on tables created later. Nothing in the app uses it.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
