// Security check for a database built by `npx drizzle-kit migrate`: npm run db:check.
// Read-only. Exits 1 when anything is missing, so it fits a deploy checklist or CI.
import postgres from "postgres";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DIRECT_URL or DATABASE_URL is missing from .env.");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false });
const failures: string[] = [];
const check = (ok: boolean, label: string) => {
  console.log(`${ok ? "ok  " : "FAIL"}  ${label}`);
  if (!ok) failures.push(label);
};

async function main() {
  const tables = await sql<{ name: string; rls: boolean }[]>`
    select c.relname as name, c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' order by 1`;
  const noRls = tables.filter((t) => !t.rls).map((t) => t.name);
  check(noRls.length === 0, `RLS on all ${tables.length} public tables${noRls.length ? ` (missing: ${noRls.join(", ")})` : ""}`);

  const grants = await sql<{ table_name: string; grantee: string }[]>`
    select distinct table_name, grantee from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated')`;
  check(grants.length === 0, `No table grants to anon/authenticated${grants.length ? ` (found ${grants.length})` : ""}`);

  const [defaults] = await sql<{ n: number }[]>`
    select count(*)::int as n from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname = 'public' and d.defaclrole = 'postgres'::regrole
      and (d.defaclacl::text like '%anon=%' or d.defaclacl::text like '%authenticated=%')`;
  check(defaults.n === 0, "New tables won't be granted to anon/authenticated");

  const [signup] = await sql<{ n: number; safe: boolean }[]>`
    select count(*)::int as n,
      bool_and(coalesce(p.proconfig::text like '%search_path%', false)) as safe
    from pg_trigger t join pg_proc p on p.oid = t.tgfoid
    where t.tgname = 'on_auth_user_created' and p.proname = 'handle_new_user'`;
  check(signup.n === 1 && signup.safe, "Sign-up trigger exists with a fixed search_path");

  const [hook] = await sql<{ ok: boolean }[]>`
    select coalesce(bool_and(
      has_function_privilege('supabase_auth_admin', p.oid, 'execute')
      and not has_function_privilege('anon', p.oid, 'execute')
    ), false) as ok
    from pg_proc p where p.proname = 'hook_beta_invite_only'`;
  check(hook.ok, "Beta invite hook exists, callable only by Supabase Auth");

  const [cron] = await sql<{ n: number }[]>`
    select count(*)::int as n from cron.job where jobname = 'purge-deleted-accounts'`;
  check(cron.n === 1, "Daily account purge job is scheduled");

  console.log(failures.length ? `\n${failures.length} check(s) failed.` : "\nAll checks passed.");
  console.log("Not checkable from SQL: turn on the hook in Supabase (Auth > Hooks > Before User Created).");
  if (failures.length) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
