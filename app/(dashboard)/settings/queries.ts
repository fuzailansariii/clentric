import { unstable_rethrow } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";

export async function getMyProfile() {
  try {
    const user = await requireUser();

    const [row] = await db
      .select({
        name: users.name,
        email: users.email,
        brandColor: users.brandColor,
        paymentDetails: users.paymentDetails,
        testimonialQuote: users.testimonialQuote,
        testimonialAuthor: users.testimonialAuthor,
      })
      .from(users)
      .where(and(eq(users.id, user.id), isNull(users.deletedAt)))
      .limit(1);

    return row ?? null;
  } catch (error) {
    unstable_rethrow(error);
    logError("getMyProfile", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load your settings.");
  }
}

export type MyProfile = NonNullable<Awaited<ReturnType<typeof getMyProfile>>>;
