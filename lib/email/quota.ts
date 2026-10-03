import "server-only";
import { and, count, eq, gt, ne, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { emailSends } from "@/src/db/schema/email-sends";
import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import {
  EMAIL_LIMITS,
  EMAIL_WINDOW_MS,
  emailLimitMessage,
  evaluateEmailQuota,
  type EmailUsage,
} from "./quota-rules";
import type { EmailResult } from "./send-email";

type Executor = Pick<typeof db, "select">;

type EmailKind = (typeof emailSends.$inferInsert)["kind"];

async function readUsage(
  executor: Executor,
  userId: string,
  entityId: string,
): Promise<EmailUsage> {
  const forEntity = sql`${emailSends.entityId} = ${entityId}`;
  const [row] = await executor
    .select({
      documentCount: sql<number>`count(*) filter (where ${forEntity})`.mapWith(
        Number,
      ),
      documentOldest:
        sql`min(${emailSends.createdAt}) filter (where ${forEntity})`.mapWith(
          emailSends.createdAt,
        ),
      documentLatest:
        sql`max(${emailSends.createdAt}) filter (where ${forEntity})`.mapWith(
          emailSends.createdAt,
        ),
      userCount: count(),
      userOldest: sql`min(${emailSends.createdAt})`.mapWith(
        emailSends.createdAt,
      ),
    })
    .from(emailSends)
    .where(
      and(
        eq(emailSends.userId, userId),
        ne(emailSends.status, "failed"),
        gt(
          emailSends.createdAt,
          sql`now() - make_interval(secs => ${EMAIL_WINDOW_MS / 1000})`,
        ),
      ),
    );

  return {
    documentCount: row?.documentCount ?? 0,
    documentOldest: row?.documentOldest ?? null,
    documentLatest: row?.documentLatest ?? null,
    userCount: row?.userCount ?? 0,
    userOldest: row?.userOldest ?? null,
  };
}

export type EmailStatus = {
  /** Emails this document can still get in the rolling 24 hours. */
  remaining: number;
  /** Why the next one can't go yet, and until when. Null when it can. */
  blocked: { reason: string; until: Date } | null;
};

/** Where an invoice or proposal stands against the limits, for its page. */
export async function getEmailStatus(
  entityId: string,
  noun: "invoice" | "proposal",
): Promise<EmailStatus> {
  try {
    const user = await requireUser();
    const quota = evaluateEmailQuota(await readUsage(db, user.id, entityId));
    return {
      remaining: quota.remaining,
      blocked: quota.allowed
        ? null
        : { reason: emailLimitMessage(quota, noun), until: quota.nextAt },
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getEmailStatus", error);
    // The server checks again on send, so the page can stay usable.
    return { remaining: EMAIL_LIMITS.perDocumentPerDay, blocked: null };
  }
}

/**
 * Claims one email against the limits, or throws a BAD_REQUEST AppError
 * explaining why not. The per-user advisory lock makes check-and-insert
 * atomic, so two tabs can't both take the last slot.
 */
export async function reserveEmailSend(input: {
  userId: string;
  kind: EmailKind;
  entityId: string;
  recipient: string;
  noun: "invoice" | "proposal";
}): Promise<string> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${input.userId}, 0))`,
    );

    const quota = evaluateEmailQuota(
      await readUsage(tx, input.userId, input.entityId),
    );
    if (!quota.allowed) {
      throw new AppError("BAD_REQUEST", emailLimitMessage(quota, input.noun));
    }

    const [row] = await tx
      .insert(emailSends)
      .values({
        userId: input.userId,
        kind: input.kind,
        entityId: input.entityId,
        recipient: input.recipient,
      })
      .returning({ id: emailSends.id });
    if (!row) throw new AppError("EMAIL_RESERVE_FAILED", "Could not send.");
    return row.id;
  });
}

/** Records how a reserved send went. A failed one stops counting. */
export async function finishEmailSend(
  sendId: string,
  userId: string,
  result: EmailResult,
): Promise<void> {
  await db
    .update(emailSends)
    .set({
      status: result.status,
      providerId: result.status === "sent" ? result.providerId : null,
    })
    .where(and(eq(emailSends.id, sendId), eq(emailSends.userId, userId)));
}
