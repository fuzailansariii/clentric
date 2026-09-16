import "server-only";
import { db } from "@/src/db";
import { users } from "@/src/db/schema/users";
import { subscriptions } from "@/src/db/schema/subscriptions";
import { and, desc, eq, isNull } from "drizzle-orm";

export async function getDashboardData(userId: string) {
  // One round trip via the relational query builder. The subscription is
  // ordered newest-first so a user with billing history always resolves to
  // their current row rather than an arbitrary one.
  const row = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
    with: {
      subscriptions: {
        orderBy: [desc(subscriptions.createdAt)],
        limit: 1,
      },
    },
  });

  if (!row) return { profile: null, subscription: null };

  const { subscriptions: userSubscriptions, ...profile } = row;

  return {
    profile,
    subscription: userSubscriptions[0] ?? null,
  };
}
