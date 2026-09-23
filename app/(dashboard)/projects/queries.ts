import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import {
  getDisplayStatus,
  type InvoiceDisplayStatus,
} from "@/lib/get-invoice-display-status";
import { sumStatusCounts, toStatusCounts } from "@/lib/status-counts";
import {
  projectClientIdSchema,
  projectIdSchema,
  projectSearchParamsSchema,
} from "./schema";
import { db } from "@/src/db";
import { and, asc, count, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { projects, projectStatusEnum } from "@/src/db/schema/projects";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";
import { milestones } from "@/src/db/schema/milestones";

export type ProjectListItem = {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "on_hold" | "completed";
  budget: string;
  /** Matches proposals.currency; existing projects default to USD. */
  currency: string;
  /** Set when this project was created by accepting a proposal. */
  proposalId: string | null;
  /** Optional default for hour lines on this project's invoices. */
  hourlyRate: string | null;
  deadline: string | null;
  /** Whole days until the deadline (negative once it's passed); null when
   * there's no deadline. Computed in SQL so rendering doesn't read the clock. */
  daysUntilDeadline: number | null;
  /** Whole days from the day the project was created to its deadline — the
   * full length of the deadline bar. Null when there's no deadline. */
  deadlineSpanDays: number | null;
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
  clientName: string | null;
  totalMilestones: number;
  completedMilestones: number;
  progress: number; // 0-100
};

export type MilestoneItem = {
  id: string;
  title: string;
  status: "pending" | "completed";
  dueDate: string | null;
  /** Whole days until the due date (negative once it's passed); null when
   * there's no due date. */
  daysUntilDue: number | null;
  createdAt: Date;
};

const daysUntilDeadline =
  sql<number>`(${projects.deadline} - current_date)`.mapWith(Number);

const deadlineSpanDays =
  sql<number>`(${projects.deadline} - (${projects.createdAt})::date)`.mapWith(
    Number,
  );

const totalMilestones =
  sql<number>`(select count(*)::int from ${milestones} where ${milestones.projectId} = ${projects.id})`.mapWith(
    Number,
  );

const completedMilestones =
  sql<number>`(select count(*)::int from ${milestones} where ${milestones.projectId} = ${projects.id} and ${milestones.status} = 'completed')`.mapWith(
    Number,
  );

const projectListFields = {
  id: projects.id,
  title: projects.title,
  description: projects.description,
  status: projects.status,
  budget: projects.budget,
  currency: projects.currency,
  proposalId: projects.proposalId,
  hourlyRate: projects.hourlyRate,
  deadline: projects.deadline,
  daysUntilDeadline,
  deadlineSpanDays,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
  clientId: projects.clientId,
  clientName: clients.name,
  totalMilestones,
  completedMilestones,
};

function withProgress<
  T extends { totalMilestones: number; completedMilestones: number },
>(row: T): T & { progress: number } {
  return {
    ...row,
    progress:
      row.totalMilestones === 0
        ? 0
        : Math.round((row.completedMilestones / row.totalMilestones) * 100),
  };
}

// get all projects (optionally scoped to one client, for its detail page)
export async function getAllProjects(
  rawParam: unknown,
  scope: { clientId?: string } = {},
) {
  try {
    const user = await requireUser();
    const { page, pageSize, search, status } = projectSearchParamsSchema.parse(
      rawParam ?? {},
    );

    const offset = (page - 1) * pageSize;

    // Tab counts and the budget total ignore the status filter but honor the
    // search, so each tab's count matches what clicking it would list.
    const baseConditions = [
      eq(projects.userId, user.id),
      isNull(projects.deletedAt),
    ];

    if (scope.clientId) {
      const parsedClientId = projectClientIdSchema.safeParse(scope.clientId);
      if (!parsedClientId.success) {
        throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
      }
      baseConditions.push(eq(projects.clientId, parsedClientId.data));
    }

    if (search) baseConditions.push(ilike(projects.title, `%${search}%`));

    const listConditions = status
      ? [...baseConditions, eq(projects.status, status)]
      : baseConditions;

    // Two queries: the page of rows, and one ROLLUP giving the count per
    // status plus a grand-total row (status null) carrying the budget sum.
    // The list's total comes from those counts — no separate COUNT(*).
    const [rows, summaryRows] = await Promise.all([
      db
        .select(projectListFields)
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(and(...listConditions))
        .orderBy(desc(projects.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          status: sql<ProjectListItem["status"] | null>`${projects.status}`,
          value: count(),
          budget: sql<string>`coalesce(sum(${projects.budget}), 0)::text`,
        })
        .from(projects)
        .where(and(...baseConditions))
        .groupBy(sql`rollup(${projects.status})`),
    ]);

    const statusCounts = toStatusCounts(
      projectStatusEnum.enumValues,
      summaryRows.flatMap((row) =>
        row.status === null ? [] : [{ status: row.status, value: row.value }],
      ),
    );
    const allCount = sumStatusCounts(statusCounts);
    const total = status ? statusCounts[status] : allCount;

    return {
      projects: rows.map(withProgress),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusCounts,
      allCount,
      summary: {
        budgetTotal:
          summaryRows.find((row) => row.status === null)?.budget ?? "0",
      },
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getAllProjects", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}

export type ProjectListResult = Awaited<ReturnType<typeof getAllProjects>>;

// get projects by projectId
export async function getProjectById(
  projectId: string,
): Promise<ProjectListItem | null> {
  try {
    const parsed = projectIdSchema.safeParse(projectId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid project ID.");
    }

    const user = await requireUser();

    const [row] = await db
      .select(projectListFields)
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        and(
          eq(projects.id, parsed.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;

    return withProgress(row);
  } catch (error) {
    unstable_rethrow(error);
    logError("getProjectById", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load project.");
  }
}

/** Badge count for a client's Projects tab. */
export async function countProjectsByClientId(
  clientId: string,
): Promise<number> {
  try {
    const parsed = projectClientIdSchema.safeParse(clientId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
    }

    const user = await requireUser();

    const [row] = await db
      .select({ value: count() })
      .from(projects)
      .where(
        and(
          eq(projects.userId, user.id),
          eq(projects.clientId, parsed.data),
          isNull(projects.deletedAt),
        ),
      );

    return row?.value ?? 0;
  } catch (error) {
    unstable_rethrow(error);
    logError("countProjectsByClientId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}

// get projects options to create invoice(project picker)
export async function getProjectOptionsByUserId() {
  try {
    const user = await requireUser();
    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        clientId: projects.clientId,
        // Prefills hour lines in the invoice builder.
        hourlyRate: projects.hourlyRate,
        currency: projects.currency,
      })
      .from(projects)
      .where(and(eq(projects.userId, user.id), isNull(projects.deletedAt)))
      .orderBy(desc(projects.createdAt));
    return rows;
  } catch (error) {
    unstable_rethrow(error);
    logError("getProjectOptionsByUserId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}

// get milestones by projectId
export async function getMilestonesByProjectId(
  projectId: string,
): Promise<MilestoneItem[]> {
  try {
    const parsed = projectIdSchema.safeParse(projectId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid project ID.");
    }

    const user = await requireUser();

    // The project row is fetched only to prove ownership; its milestones come
    // back on the same query, so an unowned project yields nothing.
    const project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, parsed.data),
        eq(projects.userId, user.id),
        isNull(projects.deletedAt),
      ),
      columns: { id: true },
      with: {
        milestones: {
          columns: {
            id: true,
            title: true,
            status: true,
            dueDate: true,
            createdAt: true,
          },
          extras: {
            daysUntilDue: sql`(${milestones.dueDate} - current_date)`
              .mapWith(Number)
              .as("days_until_due"),
          },
          // sortOrder first: milestones written in one statement share an
          // identical createdAt, so timestamp alone fell through to a random
          // uuid tiebreak and scrambled stages copied from a proposal.
          // createdAt still orders anything added by hand afterwards.
          orderBy: [
            asc(milestones.sortOrder),
            asc(milestones.createdAt),
            asc(milestones.id),
          ],
        },
      },
    });

    return project?.milestones ?? [];
  } catch (error) {
    unstable_rethrow(error);
    logError("getMilestonesByProjectId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load milestones.");
  }
}

export type ProjectInvoiceRow = {
  id: string;
  invoiceNumber: number;
  status: InvoiceDisplayStatus;
  total: string;
  currency: string;
  issueDate: string;
  dueDate: string;
};

/**
 * Invoices raised against a project, for the panel on its detail page.
 *
 * Each carries its own currency: a project can hold invoices in more than
 * one, so they are formatted individually rather than summed.
 */
export async function getInvoicesForProject(
  projectId: string,
): Promise<ProjectInvoiceRow[]> {
  try {
    const parsed = projectIdSchema.safeParse(projectId);
    if (!parsed.success) return [];

    const user = await requireUser();

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.projectId, parsed.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
      .orderBy(desc(invoices.createdAt));

    // Same derived status the invoice list uses, so "Overdue" means the same
    // thing on both screens.
    return rows.map((row) => ({ ...row, status: getDisplayStatus(row) }));
  } catch (error) {
    unstable_rethrow(error);
    logError("getInvoicesForProject", error);
    return [];
  }
}

/** The proposal a project came from, for the "From proposal" link. */
export async function getProposalForProject(proposalId: string) {
  try {
    const user = await requireUser();

    const [row] = await db
      .select({ id: proposals.id, title: proposals.title })
      .from(proposals)
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.userId, user.id),
          isNull(proposals.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  } catch (error) {
    unstable_rethrow(error);
    logError("getProposalForProject", error);
    return null;
  }
}
