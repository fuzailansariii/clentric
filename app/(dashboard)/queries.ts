import "server-only";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { subscriptions } from "@/src/db/schema/subscriptions";
import { and, eq, isNull } from "drizzle-orm";

export async function getDashboardData(userId: string) {
  const [profileRows, subscriptionRows] = await Promise.all([
    db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt))),
    db.select().from(subscriptions).where(eq(subscriptions.userId, userId)),
  ]);

  return {
    profile: profileRows[0] ?? null,
    subscription: subscriptionRows[0] ?? null,
  };
}
