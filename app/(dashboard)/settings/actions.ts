"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/current-user";
import { logError } from "@/lib/errors";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { settingsSchema } from "./schema";

export async function updateSettingsAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    // Empty strings are stored as null so "unset" is one value everywhere,
    // and the public page's "is there branding?" check stays a null check.
    const blankToNull = (value?: string) =>
      value?.trim() ? value.trim() : null;

    const [row] = await db
      .update(users)
      .set({
        name: blankToNull(parsed.data.name),
        brandColor: blankToNull(parsed.data.brandColor),
        paymentDetails: blankToNull(parsed.data.paymentDetails),
        testimonialQuote: blankToNull(parsed.data.testimonialQuote),
        testimonialAuthor: blankToNull(parsed.data.testimonialAuthor),
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .returning({ id: users.id });

    if (!row) {
      return { success: false, error: "Could not find your account." };
    }

    revalidatePath("/settings");
    // Branding and payment details are read by every proposal page.
    revalidatePath("/proposals");

    return { success: true };
  } catch (error) {
    logError("updateSettingsAction", error);
    return { success: false, error: "Could not save settings. Try again." };
  }
}
