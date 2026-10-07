import { deleteTestData, E2E_EMAIL, testDb } from "./support/env";

export default async function globalTeardown() {
  const sql = testDb();
  try {
    const [user] = await sql<{ id: string }[]>`
      select id from users where email = ${E2E_EMAIL}
    `;
    if (user) await deleteTestData(user.id);
  } finally {
    await sql.end();
  }
}
