-- Invoice numbering guard, applied with 0008_invoice_defaults.sql.
--
-- The "Next invoice number" setting moves invoice_counters.last_number
-- forward. The settings action already refuses a lower value in its own
-- UPDATE ... WHERE last_number < next, but numbers are what keep invoices
-- unique and in order, so the database refuses too: last_number can never
-- go down, whoever writes it.
--
-- Also turns on RLS for invoice_counters — the one table the 0005 audit left
-- without it. Same reasoning as there: the app connects as `postgres`
-- (BYPASSRLS) and anon / authenticated hold no grants, so this is defence
-- in depth, not something the app relies on. No grants needed.
--
-- Every statement is guarded, so this file is safely re-runnable.

alter table invoice_counters
  drop constraint if exists invoice_counters_last_number_non_negative;
alter table invoice_counters
  add constraint invoice_counters_last_number_non_negative
  check (last_number >= 0);

create or replace function prevent_invoice_counter_decrease()
returns trigger as $$
begin
  if new.last_number < old.last_number then
    raise exception 'Invoice number must be higher than %', old.last_number
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_invoice_counters_no_decrease on invoice_counters;
create trigger trg_invoice_counters_no_decrease
  before update on invoice_counters
  for each row execute function prevent_invoice_counter_decrease();

alter table invoice_counters enable row level security;
drop policy if exists "users_manage_own_invoice_counter" on invoice_counters;
create policy "users_manage_own_invoice_counter" on invoice_counters
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
