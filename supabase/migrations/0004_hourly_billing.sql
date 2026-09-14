-- ============================================================
-- Hourly billing
--
-- 1. invoice_items.unit — what a line's quantity counts (item / hour / day),
--    so an invoice can read "12.5 hrs × $85.00/hr". Every existing row
--    becomes 'item', which renders exactly as before.
-- 2. clients.hourly_rate / projects.hourly_rate — optional default rate the
--    invoice builder uses to prefill hour lines (a project's own rate wins
--    over its client's). Amounts are still computed server-side from the
--    submitted quantity × rate; these only prefill the form.
--
-- Mirrored in src/db/schema/{invoice-items,clients,projects}.ts. The CHECK
-- constraints are not declared in Drizzle (same as 0001's RLS) — another
-- reason never to run `drizzle-kit push`.
--
-- Safe to re-run. Adding a column with a constant default is metadata-only
-- on Postgres 11+, so no table rewrite or long lock.
-- ============================================================

do $$
begin
  create type public.invoice_item_unit as enum ('item', 'hour', 'day');
exception
  when duplicate_object then null;
end $$;

alter table public.invoice_items
  add column if not exists unit public.invoice_item_unit not null default 'item';

alter table public.clients
  add column if not exists hourly_rate numeric(12, 2);

alter table public.clients
  drop constraint if exists clients_hourly_rate_positive;
alter table public.clients
  add constraint clients_hourly_rate_positive
  check (hourly_rate is null or hourly_rate > 0);

alter table public.projects
  add column if not exists hourly_rate numeric(12, 2);

alter table public.projects
  drop constraint if exists projects_hourly_rate_positive;
alter table public.projects
  add constraint projects_hourly_rate_positive
  check (hourly_rate is null or hourly_rate > 0);
