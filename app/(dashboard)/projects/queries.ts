// Rethrows Next's own control-flow errors (dynamic rendering bail-out,
// redirect, notFound) so the catch blocks below only handle real failures.
import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
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
import { milestones } from "@/src/db/schema/milestones";

export type ProjectListItem = {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "on_hold" | "completed";
  budget: string;
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
  progress: number; // 0–100
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

const daysUntilDeadline = sql<number>`(${projects.deadline} - current_date)`.mapWith(
  Number,
);

const deadlineSpanDays = sql<number>`(${projects.deadline} - (${projects.createdAt})::date)`.mapWith(
  Number,
);

// Correlated subqueries instead of LEFT JOIN milestones + GROUP BY: the join
// version aggregated milestones for every one of the user's matching projects
// before the LIMIT picked a page. As plain target-list subqueries, Postgres
// can defer them past the sort + LIMIT, so only the rows on the page are
// counted — each an index lookup on idx_milestones_project_id.
const totalMilestones = sql<number>`(select count(*)::int from ${milestones} where ${milestones.projectId} = ${projects.id})`.mapWith(
  Number,
);

const completedMilestones = sql<number>`(select count(*)::int from ${milestones} where ${milestones.projectId} = ${projects.id} and ${milestones.status} = 'completed')`.mapWith(
  Number,
);

const projectListFields = {
  id: projects.id,
  title: projects.title,
  description: projects.description,
  status: projects.status,
  budget: projects.budget,
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

    const rows = await db
      .select({
        id: milestones.id,
        title: milestones.title,
        status: milestones.status,
        dueDate: milestones.dueDate,
        daysUntilDue:
          sql<number>`(${milestones.dueDate} - current_date)`.mapWith(Number),
        createdAt: milestones.createdAt,
      })
      .from(milestones)
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .where(
        and(
          eq(milestones.projectId, parsed.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      // Creation order is the plan order people typed; id breaks ties so the
      // list never reshuffles between renders.
      .orderBy(asc(milestones.createdAt), asc(milestones.id));

    return rows;
  } catch (error) {
    unstable_rethrow(error);
    logError("getMilestonesByProjectId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load milestones.");
  }
}
