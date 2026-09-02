import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { and, asc, desc, eq, ilike, isNull, lt, sql } from "drizzle-orm";
import { invoiceIdSchema } from "./schema";
import { invoiceItems } from "@/src/db/schema/invoice-items";

export type InvoiceListFilters = {
  page: number;
  pageSize: number;
  statusFilter?: "draft" | "sent" | "paid" | "overdue";
  search?: string;
};

export async function getInvoicesByUserId(filters: InvoiceListFilters) {
  try {
    const user = await requireUser();

    const conditions = [
      eq(invoices.userId, user.id),
      isNull(invoices.deletedAt),
    ];

    if (filters.statusFilter === "overdue") {
      conditions.push(eq(invoices.status, "sent"));
      conditions.push(lt(invoices.dueDate, sql`now()`));
    } else if (filters.statusFilter) {
      conditions.push(eq(invoices.status, filters.statusFilter));
    }

    if (filters.search) {
      conditions.push(ilike(clients.name, `%${filters.search}%`));
    }

    const offset = (filters.page - 1) * filters.pageSize;

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          dueDate: invoices.dueDate,
          total: invoices.total,
          clientName: clients.name,
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(filters.pageSize)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(...conditions)),
    ]);

    const totalCount = Number(countRows[0]?.count ?? 0);

    return {
      success: true,
      data: { invoices: rows, totalCount },
    };
  } catch (error) {
    logError("getInvoicesByUserId", error);
    return {
      success: false,
      error:
        error instanceof AppError ? error.message : "Could not load invoices.",
    };
  }
}

export async function getInvoiceById(invoiceId: string) {
  try {
    const parsed = invoiceIdSchema.safeParse(invoiceId);
    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid invoice ID.");
    }

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

    if (!invoice) {
      throw new AppError("NOT_FOUND", "Invoice not found.");
    }

    return {
      success: true,
      data: { ...invoice, lineItems: items },
    };
  } catch (error) {
    logError("getInvoiceById", error);
    return {
      success: false,
      error:
        error instanceof AppError ? error.message : "Could not fetch Invoice",
    };
  }
}
