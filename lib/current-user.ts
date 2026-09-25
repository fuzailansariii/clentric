import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { AppError } from "./errors";
import { createClient } from "./supabase/server";

/**
 * The signed-in auth user, with no account-state checks. Only for the few
 * places that must work while an account is pending deletion: the restore
 * screen and its two actions. Everything else uses requireUser().
 */
export async function requireSignedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new AppError("UNAUTHENTICATED", "You must logged in.");
  return user;
}

// Deduped per request: requireUser() runs once per query, and a page makes
// several.
const getDeletionRequestedAt = cache(async (userId: string) => {
  const [row] = await db
    .select({ deletionRequestedAt: users.deletionRequestedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return row?.deletionRequestedAt ?? null;
});

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
