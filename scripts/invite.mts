// Beta invite list: npm run invite add <email> [note] | remove <email> | list.
// Only invited emails can create an account (hook_beta_invite_only, migration 0023).
import postgres from "postgres";

const [command, ...rest] = process.argv.slice(2);

function fail(message: string): never {
  console.error(message);
  console.error("Usage: npm run invite add <email> [note] | remove <email> | list");
  process.exit(1);
}

function parseEmail(value: string | undefined): string {
  const email = value?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`Not an email: "${value ?? ""}"`);
  return email;
}

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) fail("DIRECT_URL or DATABASE_URL is missing from .env.");
if (!["add", "remove", "list"].includes(command ?? "")) fail(`Unknown command "${command ?? ""}".`);

const sql = postgres(url, { max: 1, prepare: false });

async function main() {
  if (command === "list") {
    const rows = await sql`
      select i.email, i.note, i.created_at, (u.id is not null) as signed_up
      from beta_invites i left join users u on lower(u.email) = i.email
      order by i.created_at desc`;
    if (rows.length) console.table(rows);
    else console.log("No invites yet.");
    return;
  }

  const email = parseEmail(rest[0]);

  if (command === "remove") {
    // Stops new sign-ups only; an account that already exists keeps working.
    const rows = await sql`delete from beta_invites where email = ${email} returning email`;
    console.log(rows.length ? `Removed ${email}.` : `${email} wasn't invited.`);
    return;
  }

  const note = rest.slice(1).join(" ") || null;
  const [row] = await sql`
    insert into beta_invites (email, note) values (${email}, ${note})
    on conflict (email) do update set note = coalesce(excluded.note, beta_invites.note)
    returning email`;
  console.log(`Invited ${row.email}. They can sign up at /register.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
