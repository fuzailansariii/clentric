import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { invoices } from "@/src/db/schema/invoices";
import { and, asc, count, desc, eq, ilike, isNull, lt, sql } from "drizzle-orm";
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
  createdAt: string | Date;
};

export async function getInvoicesByUserId(rawParams: unknown) {
  try {
    const user = await requireUser();

    const { page, pageSize, search, status } = invoiceSearchParamsSchema.parse(
      rawParams ?? {},
    );

    const conditions = [
      eq(invoices.userId, user.id),
      isNull(invoices.deletedAt),
    ];

    if (status === "overdue") {
      conditions.push(eq(invoices.status, "sent"));
      conditions.push(lt(invoices.dueDate, sql`now()`));
    } else if (status) {
      conditions.push(eq(invoices.status, status));
    }

    if (search) {
      conditions.push(ilike(clients.name, `%${search}%`));
    }

    const offset = (page - 1) * pageSize;

    const [rows, [{ value: total }]] = await Promise.all([
      db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          total: invoices.total,
          clientName: clients.name,
          projectTitle: projects.title,
          createdAt: invoices.createdAt,
        })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .leftJoin(projects, eq(invoices.projectId, projects.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(pageSize)
        .offset(offset),

      db
        .select({ value: count() })
        .from(invoices)
        .innerJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(...conditions)),
    ]);

    return {
      invoices: rows.map((row) => ({
        ...row,
        status: getDisplayStatus(row),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  } catch (error) {
    logError("getInvoicesByUserId", error);
    if (error instanceof AppError) throw error;
    throw new AppError("FETCH_FAILED", "Could not load invoices.");
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

export async function getInvoicesByClientId(clientId: string) {
  try {
    const parsed = clientIdSchema.safeParse(clientId);

    if (!parsed.success) {
      throw new AppError("VALIDATION_ERROR", "Invalid Client ID.");
    }

    const user = await requireUser();

    const rows = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        clientName: clients.name,
        projectTitle: projects.title,
        total: invoices.total,
        status: invoices.status,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(
        and(
          eq(invoices.userId, user.id),
          eq(invoices.clientId, parsed.data),
          isNull(invoices.deletedAt),
        ),
      )
      .orderBy(desc(invoices.createdAt));

    return rows.map((invoice) => ({
      ...invoice,
      status: getDisplayStatus(invoice),
    }));
  } catch (error) {
    logError("getInvoicesByClientId", error);

    return [];
  }
}
