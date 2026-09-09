"use server";

import type { ActionResult } from "@/lib/action-result";
import { invoiceSchema } from "./schema";
import { AppError, logError } from "@/lib/errors";
import { requireUser } from "@/lib/current-user";
import { db } from "@/src/db";
import { getNextInvoiceNumber } from "@/lib/get-next-invoice-number";
import { invoices } from "@/src/db/schema/invoices";
import { revalidatePath } from "next/cache";
import { invoiceItems } from "@/src/db/schema/invoice-items";
import { clients } from "@/src/db/schema/clients";
import { and, eq } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { clientIdSchema } from "../clients/schema";
import { getInvoicesByClientId } from "./queries";
import { getDisplayStatus } from "@/lib/get-invoice-display-status";

export async function createInvoiceAction(
  input: unknown,
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const parsed = invoiceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const itemsWithAmounts = parsed.data.lineItems.map((item) => ({
      ...item,
      amount: Math.round(item.quantity * item.rate * 100) / 100,
    }));

    let subTotal = 0;
    let taxAmount = 0;
    let total = 0;

    subTotal =
      Math.round(
        itemsWithAmounts.reduce((sum, item) => sum + item.amount, 0) * 100,
      ) / 100;
    taxAmount = Math.round(subTotal * (parsed.data.taxRate / 100) * 100) / 100;
    total = Math.round((subTotal + taxAmount) * 100) / 100;

    const newInvoice = await db.transaction(async (tx) => {
      // ownership check
      const [client] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, parsed.data.clientId),
            eq(clients.userId, user.id),
          ),
        )
        .limit(1);

      if (!client) {
        throw new AppError("NOT_FOUND", "Client not found");
      }

      // check project ownership
      if (parsed.data.projectId) {
        const [project] = await tx
          .select({
            id: projects.id,
          })
          .from(projects)
          .where(
            and(
              eq(projects.id, parsed.data.projectId),
              eq(projects.userId, user.id),
              eq(projects.clientId, parsed.data.clientId),
            ),
          )
          .limit(1);

        if (!project) {
          throw new AppError("NOT_FOUND", "Project not found");
        }
      }

      // generate invoice number
      const invoiceNumber = await getNextInvoiceNumber(tx, user.id);

      // create invoice
      const [created] = await tx
        .insert(invoices)
        .values({
          userId: user.id,
          clientId: parsed.data.clientId,
          projectId: parsed.data.projectId,
          issueDate: parsed.data.issueDate,
          dueDate: parsed.data.dueDate,
          taxRate: parsed.data.taxRate.toFixed(2),
          invoiceNumber,
          taxAmount: taxAmount.toFixed(2),
          subTotal: subTotal.toFixed(2),
          total: total.toFixed(2),
        })
        .returning({ invoiceId: invoices.id });

      if (!created) {
        throw new AppError("INSERT_FAILED", "Failed to create invoice");
      }

      // insert invoice items
      await tx.insert(invoiceItems).values(
        itemsWithAmounts.map((item, idx) => ({
          invoiceId: created.invoiceId,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          rate: item.rate.toFixed(2),
          amount: item.amount.toFixed(2),
          sortOrder: idx,
        })),
      );

      return created;
    });

    revalidatePath("/invoices");
    revalidatePath(`/invoices/${newInvoice.invoiceId}`);

    return {
      success: true,
      data: {
        invoiceId: newInvoice.invoiceId,
      },
    };
  } catch (error) {
    logError("createInvoiceAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not create invoice. Try again.",
    };
  }
}

export async function sendInvoiceAction(
  invoiceId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const [invoice] = await db
      .select({ id: invoices.id, status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
      .limit(1);

    if (!invoice) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new AppError("BAD_REQUEST", "Invoice is already paid");
    }

    await db
      .update(invoices)
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    revalidatePath("/invoices");

    return { success: true };
  } catch (error) {
    logError("sendInvoiceAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not send invoice. Try again.",
    };
  }
}

export async function sendReminderAction(
  invoiceId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const [invoice] = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
      .limit(1);

    if (!invoice) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    const displayStatus = getDisplayStatus(invoice);

    if (displayStatus === "draft" || displayStatus === "paid") {
      throw new AppError(
        "BAD_REQUEST",
        "Reminders can only be sent for unpaid invoices",
      );
    }

    await db
      .update(invoices)
      .set({ lastReminderSentAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    // TODO: send the actual email here

    revalidatePath("/invoices");

    return { success: true };
  } catch (error) {
    logError("sendReminderAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not send reminder. Try again.",
    };
  }
}

export async function markInvoicePaidAction(
  invoiceId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const [invoice] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
      .limit(1);

    if (!invoice) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    await db
      .update(invoices)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    revalidatePath("/invoices");

    return { success: true };
  } catch (error) {
    logError("markInvoicePaidAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not mark invoice as paid. Try again.",
    };
  }
}

export async function deleteInvoiceAction(
  invoiceId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const [invoice] = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, user.id)))
      .limit(1);

    if (!invoice) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    // Soft delete — your schema has `deletedAt`
    await db
      .update(invoices)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    revalidatePath("/invoices");

    return { success: true };
  } catch (error) {
    logError("deleteInvoiceAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not delete invoice. Try again.",
    };
  }
}
