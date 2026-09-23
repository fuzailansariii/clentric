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
    // Named explicitly rather than selecting the whole row. This runs in the
    // dashboard layout, so it is on the path of every page in the app — an
    // implicit select breaks all of them the moment a column is added to the
    // schema ahead of its migration, and ships columns nothing here reads.
    columns: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      plan: true,
    },
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
