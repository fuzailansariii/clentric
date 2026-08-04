-- ============================================================
-- Fix handle_new_user trigger: was never successfully applied
-- to the live database (silently rolled back when originally run
-- alongside a batch of RLS policy statements, one of which
-- conflicted with an already-existing policy). This migration
-- is self-contained and safely re-runnable on its own.
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();