-- ============================================================
-- List-page indexes
--
-- Every list page (clients, projects, invoices) asks for one user's rows
-- that aren't soft-deleted, newest first. The single-column user_id indexes
-- find the rows but still need a separate sort; these partial composite
-- indexes return them already in order and skip deleted rows entirely.
--
-- Mirrored in src/db/schema/{clients,projects,invoices}.ts.
--
-- Plain CREATE INDEX (not CONCURRENTLY) because migrations run inside a
-- transaction. It briefly blocks writes to each table while building — fine
-- at current table sizes; on a very large table, build it CONCURRENTLY by
-- hand instead.
-- ============================================================

create index if not exists idx_clients_user_created
  on public.clients (user_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_projects_user_created
  on public.projects (user_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_invoices_user_created
  on public.invoices (user_id, created_at desc)
  where deleted_at is null;
