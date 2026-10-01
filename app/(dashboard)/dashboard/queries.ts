import "server-only";
import { unstable_rethrow } from "next/navigation";
import { and, count, eq, isNull, sql } from "drizzle-orm";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";

// Same split as the invoices page: sent and not yet due vs past due.
const isOutstanding = sql`${invoices.status} = 'sent' and ${invoices.dueDate} >= current_date`;
const isOverdue = sql`${invoices.status} = 'sent' and ${invoices.dueDate} < current_date`;

/** Setup progress and money owed, for the dashboard. */
export async function getDashboardOverview() {
  try {
    const user = await requireUser();

    const [clientRows, proposalRows, invoiceRows] = await Promise.all([
      db
        .select({ count: count() })
        .from(clients)
        .where(and(eq(clients.userId, user.id), isNull(clients.deletedAt))),
      db
        .select({ count: count() })
        .from(proposals)
        .where(and(eq(proposals.userId, user.id), isNull(proposals.deletedAt))),
      db
        .select({
          count: count(),
          outstanding: sql<string>`coalesce(sum(${invoices.total}) filter (where ${isOutstanding}), 0)::text`,
          overdueCount:
            sql<number>`count(*) filter (where ${isOverdue})`.mapWith(Number),
          overdue: sql<string>`coalesce(sum(${invoices.total}) filter (where ${isOverdue}), 0)::text`,
        })
        .from(invoices)
        .where(and(eq(invoices.userId, user.id), isNull(invoices.deletedAt))),
    ]);

    const [invoiceRow] = invoiceRows;

    return {
      clientCount: clientRows[0]?.count ?? 0,
      proposalCount: proposalRows[0]?.count ?? 0,
      invoiceCount: invoiceRow?.count ?? 0,
      outstanding: invoiceRow?.outstanding ?? "0",
      overdueCount: invoiceRow?.overdueCount ?? 0,
      overdue: invoiceRow?.overdue ?? "0",
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getDashboardOverview", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load the dashboard.");
  }
}
