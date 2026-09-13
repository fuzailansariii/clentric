import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { sumStatusCounts, toStatusCounts } from "@/lib/status-counts";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { invoices, invoiceStatusEnum } from "@/src/db/schema/invoices";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { invoiceIdSchema, invoiceSearchParamsSchema } from "./schema";
import { invoiceItems } from "@/src/db/schema/invoice-items";
import { clientIdSchema } from "../clients/schema";
import {
  getDisplayStatus,
  InvoiceDisplayStatus,
} from "@/lib/get-invoice-display-status";
import { projects } from "@/src/db/schema/projects";

export type InvoiceListItem = {
  id: string;
  invoiceNumber: number;
  clientName: string | null;
  projectTitle: string | null; // from the linked project, for the description line
  total: string; // decimal(12,2) comes back as string from drizzle
  status: InvoiceDisplayStatus;
  issueDate: string; // drizzle `date` returns "yyyy-mm-dd" string
  dueDate: string;
  /** Whole days until the due date, negative once it's passed. Computed in
   * SQL so rendering doesn't read the clock. */
  daysUntilDue: number;
  createdAt: string | Date;
  sentAt: Date | null;
  paidAt: Date | null;
  lastReminderSentAt: Date | null;
};

/** Stat-card figures. Amounts are decimal strings summed in Postgres — money
 * never goes through JS floats. */
export type InvoiceSummary = {
  totalCount: number;
  total: string;
  paidCount: number;
  paid: string;
  outstandingCount: number;
  outstanding: string;
  overdueCount: number;
  overdue: string;
};

const daysUntilDue = sql<number>`(${invoices.dueDate} - current_date)`.mapWith(
  Number,
);

// Same rule as getDisplayStatus(), in SQL: a "sent" invoice past its due
// date counts as overdue. Filtering, tab counts and stat totals all use this,
// so the "Pending" tab never includes invoices the list shows as overdue.
const displayStatus = sql<InvoiceDisplayStatus>`case when ${invoices.status} = 'sent' and ${invoices.dueDate} < current_date then 'overdue' else ${invoices.status}::text end`;

export async function getInvoicesByUserId(
  rawParams: unknown,
  scope: { clientId?: string } = {},
) {
  try {
    const user = await requireUser();

    const { page, pageSize, search, status } = invoiceSearchParamsSchema.parse(
      rawParams ?? {},
    );

    // Tab counts and stat totals ignore the status filter but honor the
    // search, so each tab's count matches what clicking it would list.
    const baseConditions = [
      eq(invoices.userId, user.id),
      isNull(invoices.deletedAt),
    ];

    if (scope.clientId) {
      const parsedClientId = clientIdSchema.safeParse(scope.clientId);
      if (!parsedClientId.success) {
        throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
      }
      baseConditions.push(eq(invoices.clientId, parsedClientId.data));
    }

    if (search) {
      // Client, project, or invoice number — "INV-1042" matches on its digits.
      const pattern = `%${search}%`;
      const digits = search.replace(/\D/g, "");
      baseConditions.push(
        digits
          ? sql`(${clients.name} ilike ${pattern} or ${projects.title} ilike ${pattern} or ${invoices.invoiceNumber}::text like ${`%${digits}%`})`
          : sql`(${clients.name} ilike ${pattern} or ${projects.title} ilike ${pattern})`,
      );
    }

    const listConditions = status
      ? [...baseConditions, sql`${displayStatus} = ${status}`]
      : baseConditions;

    const offset = (page - 1) * pageSize;

    // Two queries: the page of rows, and one ROLLUP giving count + sum per
    // status plus a grand-total row (status null). The list's total comes
    // from those counts, so there's no separate COUNT(*).
    const [rows, summaryRows] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          daysUntilDue,
          total: invoices.total,
          clientName: clients.name,
          projectTitle: projects.title,
          createdAt: invoices.createdAt,
          sentAt: invoices.sentAt,
          paidAt: invoices.paidAt,
          lastReminderSentAt: invoices.lastReminderSentAt,
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(and(...listConditions))
        .orderBy(desc(invoices.createdAt))
        .limit(pageSize)
        .offset(offset),

      db
        .select({
          status: sql<InvoiceDisplayStatus | null>`${displayStatus}`,
          value: count(),
          amount: sql<string>`coalesce(sum(${invoices.total}), 0)::text`,
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(and(...baseConditions))
        .groupBy(sql`rollup(${displayStatus})`),
    ]);

    const perStatus = summaryRows.flatMap((row) =>
      row.status === null
        ? []
        : [{ status: row.status, value: row.value, amount: row.amount }],
    );
    const amountFor = (key: InvoiceDisplayStatus) =>
      perStatus.find((row) => row.status === key)?.amount ?? "0";

    const statusCounts = toStatusCounts(invoiceStatusEnum.enumValues, perStatus);
    const allCount = sumStatusCounts(statusCounts);
    const total = status ? statusCounts[status] : allCount;

    const summary: InvoiceSummary = {
      totalCount: allCount,
      total: summaryRows.find((row) => row.status === null)?.amount ?? "0",
      paidCount: statusCounts.paid,
      paid: amountFor("paid"),
      outstandingCount: statusCounts.sent,
      outstanding: amountFor("sent"),
      overdueCount: statusCounts.overdue,
      overdue: amountFor("overdue"),
    };

    return {
      invoices: rows.map((row) => ({
        ...row,
        status: getDisplayStatus(row),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      statusCounts,
      allCount,
      summary,
    };
  } catch (error) {
    logError("getInvoicesByUserId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoices.");
  }
}

export type InvoiceListResult = Awaited<ReturnType<typeof getInvoicesByUserId>>;

/**
 * The invoice with its line items, or null when it doesn't exist / isn't the
 * current user's. A failed query throws instead of returning null, so the
 * page shows its error state rather than a misleading 404.
 */
export async function getInvoiceById(invoiceId: string) {
  try {
    const parsed = invoiceIdSchema.safeParse(invoiceId);
    // A malformed id can't match anything — same as any missing invoice.
    if (!parsed.success) return null;

    const user = await requireUser();

    const [invoiceRows, items] = await Promise.all([
      db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, user.id),
            eq(invoices.id, parsed.data),
            isNull(invoices.deletedAt),
          ),
        )
        .limit(1),

      db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, parsed.data))
        .orderBy(asc(invoiceItems.sortOrder)),
    ]);

    const [invoice] = invoiceRows;

    // Items are only returned alongside an invoice that passed the ownership
    // check above.
    if (!invoice) return null;

    return { ...invoice, lineItems: items };
  } catch (error) {
    logError("getInvoiceById", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoice.");
  }
}

/** Badge count for a client's Invoices tab. */
export async function countInvoicesByClientId(
  clientId: string,
): Promise<number> {
  try {
    const parsed = clientIdSchema.safeParse(clientId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid client ID.");
    }

    const user = await requireUser();

    const [row] = await db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, user.id),
          eq(invoices.clientId, parsed.data),
          isNull(invoices.deletedAt),
        ),
      );

    return row?.value ?? 0;
  } catch (error) {
    logError("countInvoicesByClientId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoices.");
  }
}
