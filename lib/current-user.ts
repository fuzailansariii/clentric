import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { AppError, logError } from "./errors";
import { createClient } from "./supabase/server";

/**
 * The signed-in auth user, with no account-state checks. Only for the few
 * places that must work while an account is pending deletion: the restore
 * screen and its two actions. Everything else uses requireUser().
 */
export async function requireSignedInUser() {
  const user = await getAuthUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "You must logged in.");
  return user;
}

// One Supabase Auth call per request, however many layouts and queries ask.
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

// Deduped per request: requireUser() runs once per query, and a page makes
// several.
const getDeletionRequestedAt = cache(async (userId: string) => {
  const [row] = await db
    .select({ deletionRequestedAt: users.deletionRequestedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (row) return row.deletionRequestedAt;

  await createMissingUserRow(userId);
  return null;
});

/**
 * The sign-up trigger normally makes this row. Without it settings 404 and
 * every write fails, so make it here the same way the trigger does.
 */
async function createMissingUserRow(userId: string) {
  const user = await getAuthUser();
  if (!user?.email || user.id !== userId) return;

  try {
    const created = await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? user.email,
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    if (!created.length) {
      logError(
        "createMissingUserRow",
        new Error("users row missing and its email is taken by another row"),
      );
    }
  } catch (error) {
    logError("createMissingUserRow", error);
  }
}

/**
 * The signed-in user, refused while their account is pending deletion — so
 * a locked account can't read or change anything, even by calling a server
 * action directly. See lib/account-deletion.ts.
 */
export async function requireUser() {
  const user = await requireSignedInUser();

  if (await getDeletionRequestedAt(user.id)) {
    throw new AppError(
      "ACCOUNT_PENDING_DELETION",
      "This account is scheduled for deletion.",
    );
  }

  return user;
}
