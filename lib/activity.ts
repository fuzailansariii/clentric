import "server-only";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { and, eq } from "drizzle-orm";
import { logError } from "@/lib/errors";
import { db } from "@/src/db";
import { activityLog } from "@/src/db/schema/activity-logs";
import {
  ACTIVITY_ACTIONS,
  type ActivityAction,
  type ActivityMetadata,
} from "@/lib/activity-actions";

export * from "@/lib/activity-actions";

type ActivityEntry<A extends ActivityAction> = {
  userId: string;
  action: A;
  entityId: string;
} & (A extends keyof ActivityMetadata
  ? { metadata: ActivityMetadata[A] }
  : { metadata?: never });

/** Inserts after the response is sent; repeats are ignored by the unique index. */
export function logActivity<A extends ActivityAction>(entry: ActivityEntry<A>) {
  revalidatePath("/dashboard");
  after(async () => {
    try {
      await db
        .insert(activityLog)
        .values({
          userId: entry.userId,
          action: entry.action,
          entityType: ACTIVITY_ACTIONS[entry.action],
          entityId: entry.entityId,
          metadata: entry.metadata ?? null,
        })
        .onConflictDoNothing();
    } catch (error) {
      logError(`logActivity:${entry.action}`, error);
    }
  });
}

/** Takes an event back out when its action is undone (unpay). */
export async function removeActivity(entry: {
  userId: string;
  action: ActivityAction;
  entityId: string;
}) {
  try {
    await db
      .delete(activityLog)
      .where(
        and(
          eq(activityLog.userId, entry.userId),
          eq(activityLog.action, entry.action),
          eq(activityLog.entityId, entry.entityId),
        ),
      );
    revalidatePath("/dashboard");
  } catch (error) {
    logError(`removeActivity:${entry.action}`, error);
  }
}
