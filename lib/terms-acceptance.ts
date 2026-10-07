import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { logError } from "@/lib/errors";
import { LEGAL } from "@/lib/legal-config";

/** Records the first use after the sign-up notice; only ever fills empty columns. */
export async function recordTermsAcceptance(userId: string): Promise<void> {
  try {
    await db
      .update(users)
      .set({ termsAcceptedAt: new Date(), termsVersion: LEGAL.termsVersion })
      .where(and(eq(users.id, userId), isNull(users.termsAcceptedAt)));
  } catch (error) {
    logError("recordTermsAcceptance", error);
  }
}
