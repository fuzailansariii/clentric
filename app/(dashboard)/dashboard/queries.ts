import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
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

export const getDashboardOverview = cache(async () => {
  try {
    const user = await requireUser();

    // One query, not three: the dashboard fires many at once and the pool holds 10.
    const rows = await db.execute<{
      client_count: number;
      proposal_count: number;
      invoice_count: number;
    }>(sql`
      select
        (select count(*) from ${clients} where ${clients.userId} = ${user.id} and ${clients.deletedAt} is null)::int as client_count,
        (select count(*) from ${proposals} where ${proposals.userId} = ${user.id} and ${proposals.deletedAt} is null)::int as proposal_count,
        (select count(*) from ${invoices} where ${invoices.userId} = ${user.id} and ${invoices.deletedAt} is null)::int as invoice_count
    `);
    const [row] = rows;

    return {
      clientCount: row?.client_count ?? 0,
      proposalCount: row?.proposal_count ?? 0,
      invoiceCount: row?.invoice_count ?? 0,
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getDashboardOverview", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load the dashboard.");
  }
});

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

const DASHBOARD_LIST_LIMIT = 5;

export type ActiveProject = {
  id: string;
  title: string;
  status: "in_progress" | "not_started";
  clientName: string;
  daysUntilDeadline: number | null;
  totalMilestones: number;
  completedMilestones: number;
  /** First unfinished milestone in project order. */
  nextMilestone: { title: string; dueDate: string | null } | null;
};

/** In-progress first, then nearest deadline; null on failure. */
export async function getActiveProjects(): Promise<{
  items: ActiveProject[];
  total: number;
} | null> {
  try {
    const user = await requireUser();

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        status: projects.status,
        clientName: clients.name,
        daysUntilDeadline: sql<
          number | null
        >`(${projects.deadline} - current_date)`,
        totalMilestones: sql<number>`(select count(*)::int from ${milestones} where ${milestones.projectId} = ${projects.id})`,
        completedMilestones: sql<number>`(select count(*)::int from ${milestones} where ${milestones.projectId} = ${projects.id} and ${milestones.status} = 'completed')`,
        nextMilestone: sql<{
          title: string;
          dueDate: string | null;
        } | null>`(select json_build_object('title', ${milestones.title}, 'dueDate', ${milestones.dueDate}) from ${milestones} where ${milestones.projectId} = ${projects.id} and ${milestones.status} = 'pending' order by ${milestones.sortOrder}, ${milestones.createdAt} limit 1)`,
        total: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(projects)
      .innerJoin(clients, eq(clients.id, projects.clientId))
      .where(
        and(
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
          isNull(clients.deletedAt),
          inArray(projects.status, ["in_progress", "not_started"]),
        ),
      )
      .orderBy(
        sql`${projects.status} = 'in_progress' desc`,
        sql`${projects.deadline} asc nulls last`,
        desc(projects.updatedAt),
      )
      .limit(DASHBOARD_LIST_LIMIT);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status as ActiveProject["status"],
        clientName: row.clientName,
        daysUntilDeadline:
          row.daysUntilDeadline === null ? null : Number(row.daysUntilDeadline),
        totalMilestones: Number(row.totalMilestones),
        completedMilestones: Number(row.completedMilestones),
        nextMilestone: row.nextMilestone,
      })),
      total: rows[0]?.total ?? 0,
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getActiveProjects", error);
    return null;
  }
}

export type OpenProposal = {
  id: string;
  title: string;
  status: "sent" | "viewed";
  clientName: string;
  total: string;
  currency: string;
  expiresAt: Date | null;
  daysUntilExpiry: number | null;
};

/** Sent or viewed and not yet expired, soonest expiry first; null on failure. */
export async function getOpenProposals(): Promise<{
  items: OpenProposal[];
  total: number;
} | null> {
  try {
    const user = await requireUser();

    const rows = await db
      .select({
        id: proposals.id,
        title: proposals.title,
        status: proposals.status,
        clientName: clients.name,
        total: proposals.total,
        currency: proposals.currency,
        expiresAt: proposals.expiresAt,
        daysUntilExpiry: sql<
          number | null
        >`ceil(extract(epoch from (${proposals.expiresAt} - now())) / 86400)::int`,
        count: sql<number>`count(*) over ()`.mapWith(Number),
      })
      .from(proposals)
      .innerJoin(clients, eq(clients.id, proposals.clientId))
      .where(
        and(
          eq(proposals.userId, user.id),
          isNull(proposals.deletedAt),
          isNull(clients.deletedAt),
          inArray(proposals.status, ["sent", "viewed"]),
          or(isNull(proposals.expiresAt), gt(proposals.expiresAt, sql`now()`)),
        ),
      )
      .orderBy(
        sql`${proposals.expiresAt} asc nulls last`,
        asc(proposals.createdAt),
      )
      .limit(DASHBOARD_LIST_LIMIT);

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        status: row.status as OpenProposal["status"],
        clientName: row.clientName,
        total: row.total,
        currency: row.currency,
        expiresAt: row.expiresAt,
        daysUntilExpiry:
          row.daysUntilExpiry === null ? null : Number(row.daysUntilExpiry),
      })),
      total: rows[0]?.count ?? 0,
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getOpenProposals", error);
    return null;
  }
}
