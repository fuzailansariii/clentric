"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireSignedInUser, requireUser } from "@/lib/current-user";
import { ACCOUNT_DELETION_GRACE_DAYS } from "@/lib/account-deletion";
import { logError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";

const requestDeletionSchema = z.object({
  /** The user types their email to confirm; compared exactly, as typed. */
  email: z.string().min(1, "Type your email to confirm"),
});

export async function requestAccountDeletionAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = requestDeletionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    // Exact match: no trimming or case-folding, so what the user confirmed
    // is exactly what the dialog showed them.
    if (!user.email || parsed.data.email !== user.email) {
      return {
        success: false,
        error: "That doesn't match your email address.",
      };
    }

    const [row] = await db
      .update(users)
      .set({ deletionRequestedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(users.id, user.id),
          isNull(users.deletedAt),
          isNull(users.deletionRequestedAt),
        ),
      )
      .returning({ id: users.id });

    if (!row) {
      return { success: false, error: "Could not find your account." };
    }

    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  } catch (error) {
    logError("requestAccountDeletionAction", error);
    return {
      success: false,
      error: "Could not delete your account. Try again.",
    };
  }

  redirect("/login");
}

/** Clears a pending deletion, within the grace period. */
export async function restoreAccountAction(): Promise<ActionResult> {
  try {
    // Not requireUser(): that refuses exactly the accounts this restores.
    const user = await requireSignedInUser();

    const [row] = await db
      .update(users)
      .set({ deletionRequestedAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(users.id, user.id),
          isNull(users.deletedAt),
          isNotNull(users.deletionRequestedAt),
          // Past the grace period the purge owns the account; the window is
          // enforced here, not only on the screen.
          gt(
            users.deletionRequestedAt,
            sql`now() - make_interval(days => ${ACCOUNT_DELETION_GRACE_DAYS})`,
          ),
        ),
      )
      .returning({ id: users.id });

    if (!row) {
      return {
        success: false,
        error: "This account can no longer be restored.",
      };
    }
  } catch (error) {
    logError("restoreAccountAction", error);
    return {
      success: false,
      error: "Could not restore your account. Try again.",
    };
  }

  redirect("/dashboard");
}

/** "Keep it deleted": leaves the request in place and signs out here. */
export async function keepAccountDeletedAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
