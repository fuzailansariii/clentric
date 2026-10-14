import { unstable_rethrow } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import {
  getDisplayStatus,
  type InvoiceDisplayStatus,
} from "@/lib/get-invoice-display-status";

import {
  milestoneIdSchema,
  projectBoardParamsSchema,
  projectClientIdSchema,
  projectIdSchema,
} from "./schema";
import { boardProject, type BoardMilestone } from "@/lib/project-progress";
import { db } from "@/src/db";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { BILLED_STATUSES } from "@/lib/project-ledger";
import { invoiceIdSchema } from "../invoices/schema";
import { projects } from "@/src/db/schema/projects";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";
import { milestones } from "@/src/db/schema/milestones";

export type ProjectListItem = {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "on_hold" | "completed";
  /** fixed: budget is the agreed price. hourly: budget is an estimate, "0" = none. */
  pricing: "fixed" | "hourly";
  billing: "per_milestone" | "end";
  budget: string;
  /** Matches proposals.currency; existing projects default to USD. */
  currency: string;
  /** Set when this project was created by accepting a proposal. */
  proposalId: string | null;
  /** Optional default for hour lines on this project's invoices. */
  hourlyRate: string | null;
  startDate: string | null;
  deadline: string | null;
  /** Set when the status moves to completed. */
  completedAt: Date | null;
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
  /** The stage price; null when the stage isn't billed on its own. */
  amount: string | null;
  /** The latest invoice that billed this milestone, if any. */
  invoice: MilestoneInvoice | null;
  createdAt: Date;
};

export type MilestoneInvoice = {
  id: string;
  number: string;
  status: InvoiceDisplayStatus;
};

type MilestoneInvoiceRow = {
  id: string;
  number: number;
  prefix: string;
  status: "draft" | "sent" | "paid";
  dueDate: string;
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
  pricing: projects.pricing,
  billing: projects.billing,
  budget: projects.budget,
  currency: projects.currency,
  proposalId: projects.proposalId,
  hourlyRate: projects.hourlyRate,
  startDate: projects.startDate,
  deadline: projects.deadline,
  completedAt: projects.completedAt,
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

// get projects options to create invoice(project picker)
/** `excludeInvoiceId`: the invoice being edited, so it isn't counted twice. */
export async function getProjectOptionsByUserId(excludeInvoiceId?: string) {
  try {
    const user = await requireUser();
    const exclude = invoiceIdSchema.safeParse(excludeInvoiceId);
    const deposits = alias(invoices, "deposit_invoice");

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        clientId: projects.clientId,
        // Prefills hour lines in the invoice builder.
        hourlyRate: projects.hourlyRate,
        currency: projects.currency,
        pricing: projects.pricing,
        budget: projects.budget,
        // The budget line in the invoice builder (lib/project-ledger.ts).
        billed: sql<string>`(
          select coalesce(sum(${invoices.total}), 0)::text from ${invoices}
          where ${invoices.projectId} = ${projects.id}
            and ${invoices.userId} = ${user.id}
            and ${invoices.deletedAt} is null
            and ${inArray(invoices.status, [...BILLED_STATUSES])}
            ${exclude.success ? sql`and ${invoices.id} <> ${exclude.data}` : sql``}
        )`,
        depositInvoiceId: deposits.id,
        depositNumber: deposits.invoiceNumber,
        depositPrefix: deposits.numberPrefix,
      })
      .from(projects)
      .leftJoin(
        proposals,
        and(
          eq(proposals.id, projects.proposalId),
          eq(proposals.userId, user.id),
        ),
      )
      .leftJoin(
        deposits,
        and(
          eq(deposits.id, proposals.depositInvoiceId),
          eq(deposits.userId, user.id),
          isNull(deposits.deletedAt),
        ),
      )
      .where(and(eq(projects.userId, user.id), isNull(projects.deletedAt)))
      .orderBy(desc(projects.createdAt));

    return rows.map(
      ({ depositInvoiceId, depositNumber, depositPrefix, ...project }) => ({
        ...project,
        deposit:
          depositInvoiceId && depositNumber !== null
            ? {
                invoiceId: depositInvoiceId,
                label: formatInvoiceNumber(depositNumber, depositPrefix ?? ""),
              }
            : null,
      }),
    );
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
            amount: true,
            createdAt: true,
          },
          extras: {
            daysUntilDue: sql`(${milestones.dueDate} - current_date)`
              .mapWith(Number)
              .as("days_until_due"),
            invoiceRow: sql<MilestoneInvoiceRow | null>`(
              select json_build_object(
                'id', i.id, 'number', i.invoice_number, 'prefix', i.number_prefix,
                'status', i.status, 'dueDate', i.due_date
              )
              from invoice_items ii
              join invoices i on i.id = ii.invoice_id
              where ii.milestone_id = ${milestones.id}
                and i.user_id = ${user.id}
                and i.deleted_at is null
              order by i.created_at desc
              limit 1
            )`.as("invoice_row"),
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

    return (project?.milestones ?? []).map(({ invoiceRow, ...m }) => ({
      ...m,
      invoice: invoiceRow
        ? {
            id: invoiceRow.id,
            number: formatInvoiceNumber(invoiceRow.number, invoiceRow.prefix),
            status: getDisplayStatus(invoiceRow),
          }
        : null,
    }));
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
  numberPrefix: string;
  status: InvoiceDisplayStatus;
  total: string;
  currency: string;
  issueDate: string;
  dueDate: string;
  /** Whole days until the due date, negative once late. */
  daysUntilDue: number;
  paidAt: Date | null;
  /** The first line, as the row's subtitle. */
  firstLine: string | null;
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
        numberPrefix: invoices.numberPrefix,
        status: invoices.status,
        total: invoices.total,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        daysUntilDue: sql<number>`(${invoices.dueDate} - current_date)`.mapWith(
          Number,
        ),
        paidAt: invoices.paidAt,
        firstLine: sql<string | null>`(
          select ii.description from invoice_items ii
          where ii.invoice_id = "invoices"."id"
          order by ii.sort_order, ii.id limit 1
        )`,
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
      .select({
        id: proposals.id,
        title: proposals.title,
        // The deposit the project is waiting on, if any.
        depositInvoiceId: invoices.id,
        depositNumber: invoices.invoiceNumber,
        depositPrefix: invoices.numberPrefix,
        depositStatus: invoices.status,
        depositTotal: invoices.total,
        depositDaysUntilDue: sql<
          number | null
        >`(${invoices.dueDate} - current_date)`,
      })
      .from(proposals)
      .leftJoin(
        invoices,
        and(
          eq(invoices.id, proposals.depositInvoiceId),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
      .where(
        and(
          eq(proposals.id, proposalId),
          eq(proposals.userId, user.id),
          isNull(proposals.deletedAt),
        ),
      )
      .limit(1);

    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      deposit:
        row.depositInvoiceId && row.depositNumber !== null
          ? {
              id: row.depositInvoiceId,
              number: formatInvoiceNumber(
                row.depositNumber,
                row.depositPrefix ?? "INV-",
              ),
              paid: row.depositStatus === "paid",
              sent: row.depositStatus !== "draft",
              total: row.depositTotal ?? "0",
              daysUntilDue:
                row.depositDaysUntilDue === null
                  ? null
                  : Number(row.depositDaysUntilDue),
            }
          : null,
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getProposalForProject", error);
    return null;
  }
}

/**
 * The projects board: one card per project with its milestones (and whether
 * each is invoiced), what's billed, and tab counts. Two queries in parallel.
 */
export async function getProjectBoard(
  rawParams: unknown,
  scope: { clientId?: string } = {},
) {
  try {
    const user = await requireUser();
    const { search, view, page, pageSize } = projectBoardParamsSchema.parse(
      rawParams ?? {},
    );

    const base = [eq(projects.userId, user.id), isNull(projects.deletedAt)];
    if (scope.clientId) {
      const parsedClientId = projectClientIdSchema.safeParse(scope.clientId);
      if (!parsedClientId.success) {
        throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
      }
      base.push(eq(projects.clientId, parsedClientId.data));
    }
    if (search) base.push(ilike(projects.title, `%${search}%`));
    const listWhere =
      view === "active"
        ? [...base, sql`${projects.status} <> 'completed'`]
        : view === "completed"
          ? [...base, eq(projects.status, "completed")]
          : base;

    const [rows, [counts]] = await Promise.all([
      db
        .select({
          id: projects.id,
          title: projects.title,
          status: projects.status,
          pricing: projects.pricing,
          billing: projects.billing,
          budget: projects.budget,
          currency: projects.currency,
          clientId: projects.clientId,
          clientName: clients.name,
          updatedAt: projects.updatedAt,
          completedAt: projects.completedAt,
          daysUntilDeadline,
          milestones: sql<BoardMilestoneRow[]>`(
            select coalesce(json_agg(json_build_object(
              'id', m.id,
              'title', m.title,
              'done', m.status = 'completed',
              'dueDate', m.due_date,
              'daysUntilDue', m.due_date - current_date,
              'amount', m.amount,
              'invoiced', exists(
                select 1 from invoice_items ii
                join invoices i on i.id = ii.invoice_id
                where ii.milestone_id = m.id and i.deleted_at is null
              )
            ) order by m.sort_order, m.id), '[]'::json)
            from milestones m where m.project_id = ${projects.id}
          )`,
          billed: sql<string>`(
            select coalesce(sum(i.total), 0)::text from invoices i
            where i.project_id = ${projects.id}
              and i.user_id = ${user.id}
              and i.deleted_at is null
              and i.status in ('sent', 'paid', 'overdue')
          )`,
        })
        .from(projects)
        .leftJoin(clients, eq(projects.clientId, clients.id))
        .where(and(...listWhere))
        .orderBy(desc(projects.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({
          all: count(),
          active:
            sql<number>`count(*) filter (where ${projects.status} <> 'completed')`.mapWith(
              Number,
            ),
          completed:
            sql<number>`count(*) filter (where ${projects.status} = 'completed')`.mapWith(
              Number,
            ),
          budgetSum: sql<string>`coalesce(sum(${projects.budget}), 0)::text`,
          // Spelled out: single-table selects leave column names unqualified.
          billedSum: sql<string>`coalesce(sum((
            select coalesce(sum(i.total), 0) from invoices i
            where i.project_id = "projects"."id" and i.deleted_at is null
              and i.status in ('sent', 'paid', 'overdue')
          )), 0)::text`,
        })
        .from(projects)
        .where(and(...base)),
    ]);

    const tabCounts = {
      all: counts?.all ?? 0,
      active: counts?.active ?? 0,
      completed: counts?.completed ?? 0,
    };
    const total = view ? tabCounts[view] : tabCounts.all;

    const cards = rows.map((row) => {
      const milestones: BoardMilestone[] = row.milestones.map((m) => ({
        ...m,
        amount: m.amount === null ? null : Number(m.amount),
      }));
      const budget = Number(row.budget);
      const billed = Number(row.billed);
      return {
        ...row,
        budget,
        billed,
        board: boardProject({
          status: row.status,
          pricing: row.pricing,
          billing: row.billing,
          budget,
          billed,
          daysUntilDeadline: row.daysUntilDeadline,
          milestones,
        }),
      };
    });

    return {
      cards,
      tabCounts,
      sums: {
        budget: counts?.budgetSum ?? "0",
        billed: counts?.billedSum ?? "0",
      },
      view: view ?? null,
      readyCount: cards.filter(
        (c) => c.status === "in_progress" && c.board.ready,
      ).length,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    unstable_rethrow(error);
    logError("getProjectBoard", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load projects.");
  }
}

type BoardMilestoneRow = Omit<BoardMilestone, "amount"> & {
  amount: number | string | null;
};

export type ProjectBoardCard = Awaited<
  ReturnType<typeof getProjectBoard>
>["cards"][number];

/** The milestone behind "Invoice stage N", only if it's on this user's project. */
export async function getMilestoneForInvoice(
  milestoneId: string | undefined,
  projectId: string | undefined,
) {
  try {
    const parsedMilestone = milestoneIdSchema.safeParse(milestoneId);
    const parsedProject = projectIdSchema.safeParse(projectId);
    if (!parsedMilestone.success || !parsedProject.success) return null;

    const user = await requireUser();
    const [row] = await db
      .select({
        id: milestones.id,
        title: milestones.title,
        amount: milestones.amount,
      })
      .from(milestones)
      .innerJoin(projects, eq(projects.id, milestones.projectId))
      .where(
        and(
          eq(milestones.id, parsedMilestone.data),
          eq(milestones.projectId, parsedProject.data),
          eq(projects.userId, user.id),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  } catch (error) {
    unstable_rethrow(error);
    logError("getMilestoneForInvoice", error);
    return null;
  }
}

/** A client's projects, for "Link a project" on an invoice. */
export async function getClientProjectOptions(clientId: string) {
  try {
    const parsed = projectClientIdSchema.safeParse(clientId);
    if (!parsed.success) return [];

    const user = await requireUser();
    return await db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(
        and(
          eq(projects.userId, user.id),
          eq(projects.clientId, parsed.data),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(desc(projects.createdAt));
  } catch (error) {
    unstable_rethrow(error);
    logError("getClientProjectOptions", error);
    return [];
  }
}
