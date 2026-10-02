import "server-only";
import { unstable_rethrow } from "next/navigation";
import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type {
  ActivityAction,
  ActivityEntityType,
  ActivityMetadata,
} from "@/lib/activity";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { db } from "@/src/db";
import { activityLog } from "@/src/db/schema/activity-logs";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { milestones } from "@/src/db/schema/milestones";
import { projects } from "@/src/db/schema/projects";
import { proposals } from "@/src/db/schema/proposals";

// Same split as the invoices page: sent and not yet due vs past due.
const isOutstanding = sql`${invoices.status} = 'sent' and ${invoices.dueDate} >= current_date`;
const isOverdue = sql`${invoices.status} = 'sent' and ${invoices.dueDate} < current_date`;

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

export type ActivityItem = {
  id: string;
  action: ActivityAction;
  entityId: string;
  metadata: ActivityMetadata[keyof ActivityMetadata] | null;
  createdAt: Date;
  clientName: string | null;
  invoiceNumber: number | null;
  numberPrefix: string | null;
  invoiceTotal: string | null;
  invoiceCurrency: string | null;
  proposalTitle: string | null;
  projectId: string | null;
  projectTitle: string | null;
  milestoneTitle: string | null;
};

/** Latest feed events, or null on failure so the dashboard still renders. */
export async function getRecentActivity(
  limit = 8,
): Promise<ActivityItem[] | null> {
  try {
    const user = await requireUser();

    const isEntity = (type: ActivityEntityType, id: AnyPgColumn) =>
      and(eq(activityLog.entityType, type), eq(id, activityLog.entityId));

    const rows = await db
      .select({
        id: activityLog.id,
        action: activityLog.action,
        entityId: activityLog.entityId,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
        clientName: clients.name,
        invoiceNumber: invoices.invoiceNumber,
        numberPrefix: invoices.numberPrefix,
        invoiceTotal: invoices.total,
        invoiceCurrency: invoices.currency,
        proposalTitle: proposals.title,
        projectId: projects.id,
        projectTitle: projects.title,
        milestoneTitle: milestones.title,
      })
      .from(activityLog)
      .leftJoin(
        invoices,
        and(
          isEntity("invoice", invoices.id),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
      .leftJoin(
        proposals,
        and(
          isEntity("proposal", proposals.id),
          eq(proposals.userId, user.id),
          isNull(proposals.deletedAt),
        ),
      )
      .leftJoin(milestones, isEntity("milestone", milestones.id))
      // A milestone event shows its project too.
      .leftJoin(
        projects,
        and(
          or(
            isEntity("project", projects.id),
            and(
              eq(activityLog.entityType, "milestone"),
              eq(projects.id, milestones.projectId),
            ),
          ),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .leftJoin(
        clients,
        and(
          eq(
            clients.id,
            sql`coalesce(${invoices.clientId}, ${proposals.clientId}, ${projects.clientId}, case when ${activityLog.entityType} = 'client' then ${activityLog.entityId} end)`,
          ),
          eq(clients.userId, user.id),
          isNull(clients.deletedAt),
        ),
      )
      .where(
        and(
          eq(activityLog.userId, user.id),
          // Every event needs its client; that also covers clients themselves.
          sql`${clients.id} is not null`,
          or(
            sql`${invoices.id} is not null`,
            sql`${proposals.id} is not null`,
            sql`${projects.id} is not null`,
            eq(activityLog.entityType, "client"),
          ),
        ),
      )
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      ...row,
      action: row.action as ActivityAction,
      // Every logged event has one; the column is only nullable in the schema.
      entityId: row.entityId!,
      metadata: row.metadata as ActivityItem["metadata"],
    }));
  } catch (error) {
    unstable_rethrow(error);
    logError("getRecentActivity", error);
    return null;
  }
}
