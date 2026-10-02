import "server-only";
import { unstable_rethrow } from "next/navigation";
import { and, asc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { logError } from "@/lib/errors";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";

const PER_KIND_LIMIT = 3;
export const EXPIRING_SOON_DAYS = 2;

export type AttentionItem =
  | {
      kind: "overdue";
      id: string;
      invoiceNumber: number;
      numberPrefix: string;
      clientName: string;
      total: string;
      currency: string;
      daysLate: number;
    }
  | {
      kind: "payment_claimed";
      id: string;
      invoiceNumber: number;
      numberPrefix: string;
      clientName: string;
      total: string;
      currency: string;
    }
  | {
      kind: "expiring";
      id: string;
      title: string;
      clientName: string;
      daysLeft: number;
    };

/** Things the user should act on, most urgent kind first; null on failure. */
export async function getAttentionItems(): Promise<AttentionItem[] | null> {
  try {
    const user = await requireUser();
    const myInvoices = and(
      eq(invoices.userId, user.id),
      isNull(invoices.deletedAt),
      isNull(clients.deletedAt),
    );
    const invoiceFields = {
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      numberPrefix: invoices.numberPrefix,
      clientName: clients.name,
      total: invoices.total,
      currency: invoices.currency,
    };

    const [overdueRows, claimedRows, expiringRows] = await Promise.all([
      db
        .select({
          ...invoiceFields,
          daysLate: sql<number>`(current_date - ${invoices.dueDate})`.mapWith(
            Number,
          ),
        })
        .from(invoices)
        .innerJoin(clients, eq(clients.id, invoices.clientId))
        .where(
          and(
            myInvoices,
            eq(invoices.status, "sent"),
            sql`${invoices.dueDate} < current_date`,
          ),
        )
        .orderBy(asc(invoices.dueDate))
        .limit(PER_KIND_LIMIT),

      db
        .select(invoiceFields)
        .from(invoices)
        .innerJoin(clients, eq(clients.id, invoices.clientId))
        .where(
          and(
            myInvoices,
            eq(invoices.status, "sent"),
            isNotNull(invoices.paymentClaimedAt),
          ),
        )
        .orderBy(asc(invoices.paymentClaimedAt))
        .limit(PER_KIND_LIMIT),

      db
        .select({
          id: proposals.id,
          title: proposals.title,
          clientName: clients.name,
          daysLeft:
            sql<number>`ceil(extract(epoch from (${proposals.expiresAt} - now())) / 86400)::int`.mapWith(
              Number,
            ),
        })
        .from(proposals)
        .innerJoin(clients, eq(clients.id, proposals.clientId))
        .where(
          and(
            eq(proposals.userId, user.id),
            isNull(proposals.deletedAt),
            isNull(clients.deletedAt),
            inArray(proposals.status, ["sent", "viewed"]),
            gt(proposals.expiresAt, sql`now()`),
            sql`${proposals.expiresAt} <= now() + make_interval(days => ${EXPIRING_SOON_DAYS})`,
          ),
        )
        .orderBy(asc(proposals.expiresAt))
        .limit(PER_KIND_LIMIT),
    ]);

    return [
      ...claimedRows.map((row) => ({
        kind: "payment_claimed" as const,
        ...row,
      })),
      ...overdueRows.map((row) => ({ kind: "overdue" as const, ...row })),
      ...expiringRows.map((row) => ({ kind: "expiring" as const, ...row })),
    ];
  } catch (error) {
    unstable_rethrow(error);
    logError("getAttentionItems", error);
    return null;
  }
}
