"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  invoiceIdSchema,
  invoiceSchema,
  updateInvoiceSchema,
  updateInvoiceStatusSchema,
} from "./schema";
import { AppError, logError } from "@/lib/errors";
import { requireUser } from "@/lib/current-user";
import { db } from "@/src/db";
import { getNextInvoiceNumber } from "@/lib/get-next-invoice-number";
import { invoices } from "@/src/db/schema/invoices";
import { users } from "@/src/db/schema/users";
import { revalidatePath } from "next/cache";
import { logActivity, removeActivity } from "@/lib/activity";
import { invoiceItems } from "@/src/db/schema/invoice-items";
import { clients } from "@/src/db/schema/clients";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { getDisplayStatus } from "@/lib/get-invoice-display-status";
import { issuerSnapshotSql } from "@/lib/issuer-snapshot";
import { emailInvoice } from "@/lib/email/document-emails";

// Every page that renders an invoice: the list, its detail page, and its
// client's page.
function revalidateInvoicePaths(invoiceId: string, clientId: string) {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/dashboard");
}

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
            isNull(clients.deletedAt),
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
              isNull(projects.deletedAt),
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
          currency: parsed.data.currency,
          taxRate: parsed.data.taxRate.toFixed(2),
          invoiceNumber,
          numberPrefix: sql`(select ${users.invoicePrefix} from ${users} where ${users.id} = ${user.id})`,
          notes: parsed.data.notes || null,
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
          unit: item.unit,
          sortOrder: idx,
        })),
      );

      return created;
    });

    revalidateInvoicePaths(newInvoice.invoiceId, parsed.data.clientId);
    logActivity({
      userId: user.id,
      action: "invoice.created",
      entityId: newInvoice.invoiceId,
    });

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

export async function updateInvoiceAction(
  input: unknown,
): Promise<ActionResult<{ invoiceId: string }>> {
  try {
    const parsed = updateInvoiceSchema.safeParse(input);
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

    const update = await db.transaction(async (tx) => {
      // client ownership
      const [client] = await tx
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.userId, user.id),
            eq(clients.id, parsed.data.clientId),
            isNull(clients.deletedAt),
          ),
        );

      if (!client) {
        throw new AppError("NOT_FOUND", "Client not found");
      }

      // project ownership (only if a project is attached)
      if (parsed.data.projectId) {
        const [project] = await tx
          .select({ id: projects.id })
          .from(projects)
          .where(
            and(
              eq(projects.id, parsed.data.projectId),
              eq(projects.userId, user.id),
              eq(projects.clientId, parsed.data.clientId),
              isNull(projects.deletedAt),
            ),
          );

        if (!project) {
          throw new AppError("NOT_FOUND", "Project not found");
        }
      }

      // invoice ownership — confirms THIS invoice is actually yours
      const [existingInvoice] = await tx
        .select({
          id: invoices.id,
          status: invoices.status,
          clientId: invoices.clientId,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.userId, user.id),
            eq(invoices.id, parsed.data.invoiceId),
            isNull(invoices.deletedAt),
          ),
        );

      if (!existingInvoice) {
        throw new AppError("NOT_FOUND", "Invoice not found");
      }

      // Paid invoices are a closed record (the UI disables Edit for them).
      if (existingInvoice.status === "paid") {
        throw new AppError("BAD_REQUEST", "Paid invoices can't be edited.");
      }

      // update invoice — note: invoiceNumber is NOT touched, it's assigned once at creation
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({
          clientId: parsed.data.clientId,
          projectId: parsed.data.projectId ?? null,
          issueDate: parsed.data.issueDate,
          dueDate: parsed.data.dueDate,
          currency: parsed.data.currency,
          taxRate: parsed.data.taxRate.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          subTotal: subTotal.toFixed(2),
          total: total.toFixed(2),
          notes: parsed.data.notes || null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invoices.id, parsed.data.invoiceId),
            eq(invoices.userId, user.id),
            isNull(invoices.deletedAt),
            // Re-checked in the write itself: it may have been marked paid
            // between the read above and this update.
            ne(invoices.status, "paid"),
          ),
        )
        .returning({ id: invoices.id, clientId: invoices.clientId });

      if (!updatedInvoice) {
        throw new AppError("BAD_REQUEST", "Paid invoices can't be edited.");
      }

      // wholesale replace line items: delete all, reinsert fresh
      await tx
        .delete(invoiceItems)
        .where(eq(invoiceItems.invoiceId, parsed.data.invoiceId));

      await tx.insert(invoiceItems).values(
        itemsWithAmounts.map((item, idx) => ({
          invoiceId: parsed.data.invoiceId,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          rate: item.rate.toFixed(2),
          amount: item.amount.toFixed(2),
          unit: item.unit,
          sortOrder: idx,
        })),
      );

      return { ...updatedInvoice, previousClientId: existingInvoice.clientId };
    });

    revalidateInvoicePaths(update.id, update.clientId);
    // Moved to another client: the old client's page still lists it.
    if (update.previousClientId !== update.clientId) {
      revalidatePath(`/clients/${update.previousClientId}`);
    }

    return { success: true, data: { invoiceId: update.id } };
  } catch (error) {
    logError("updateInvoiceAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not update invoice. Try again.",
    };
  }
}

export async function updateInvoiceStatusAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = updateInvoiceStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const user = await requireUser();

    const [existingInvoice] = await db
      .select({ status: invoices.status })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, parsed.data.invoiceId),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
      .limit(1);

    if (!existingInvoice) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    // The only revert left is paid -> sent. Sent invoices can't go back to
    // draft: the client may already have the email.
    if (existingInvoice.status !== "paid") {
      throw new AppError(
        "BAD_REQUEST",
        `Cannot change status from ${existingInvoice.status} to ${parsed.data.status}`,
      );
    }

    const [updated] = await db
      .update(invoices)
      .set({ status: "sent", paidAt: null, updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, parsed.data.invoiceId),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          eq(invoices.status, "paid"),
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError(
        "CONFLICT",
        "This invoice changed in the meantime. Refresh and try again.",
      );
    }

    revalidateInvoicePaths(updated.id, updated.clientId);
    await removeActivity({
      userId: user.id,
      action: "invoice.paid",
      entityId: updated.id,
    });
    return { success: true };
  } catch (error) {
    logError("updateInvoiceStatusAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not update invoice status. Try again.",
    };
  }
}

/**
 * Marks the invoice sent and, the first time, emails it to the client. The
 * email can fail (no client email, daily limit, Resend down) without undoing
 * the send: `emailError` says why, so the freelancer can deliver it by hand.
 */
export async function sendInvoiceAction(
  invoiceId: string,
): Promise<ActionResult<{ emailError: string | null }>> {
  try {
    const parsedId = invoiceIdSchema.safeParse(invoiceId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid invoice ID." };
    }

    const user = await requireUser();

    const [invoice] = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        sentAt: invoices.sentAt,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, parsedId.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
      .limit(1);

    if (!invoice) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    if (invoice.status === "paid") {
      throw new AppError("BAD_REQUEST", "Invoice is already paid");
    }

    const [updated] = await db
      .update(invoices)
      .set({
        status: "sent",
        sentAt: sql`coalesce(${invoices.sentAt}, now())`,
        issuerSnapshot: sql`coalesce(${invoices.issuerSnapshot}, ${issuerSnapshotSql(user.id)})`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoices.id, parsedId.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          ne(invoices.status, "paid"),
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError("BAD_REQUEST", "Invoice is already paid");
    }

    revalidateInvoicePaths(updated.id, updated.clientId);
    if (invoice.sentAt) return { success: true, data: { emailError: null } };

    logActivity({
      userId: user.id,
      action: "invoice.sent",
      entityId: updated.id,
    });

    let emailError: string | null = null;
    try {
      await emailInvoice({
        userId: user.id,
        invoiceId: updated.id,
        kind: "invoice",
      });
    } catch (error) {
      logError("sendInvoiceAction.email", error);
      emailError =
        error instanceof AppError
          ? error.message
          : "The email couldn't be sent just now.";
    }

    return { success: true, data: { emailError } };
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
    const parsedId = invoiceIdSchema.safeParse(invoiceId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid invoice ID." };
    }

    const user = await requireUser();

    const [invoice] = await db
      .select({
        id: invoices.id,
        status: invoices.status,
        dueDate: invoices.dueDate,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, parsedId.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
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

    // Limits (3 per invoice a day, 10 minutes apart) are enforced inside.
    await emailInvoice({
      userId: user.id,
      invoiceId: invoice.id,
      kind: "reminder",
    });

    const [updated] = await db
      .update(invoices)
      .set({ lastReminderSentAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, invoice.id),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    revalidateInvoicePaths(updated.id, updated.clientId);
    logActivity({
      userId: user.id,
      action: "invoice.reminder_sent",
      entityId: updated.id,
    });

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
    const parsedId = invoiceIdSchema.safeParse(invoiceId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid invoice ID." };
    }

    const user = await requireUser();

    const [updated] = await db
      .update(invoices)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, parsedId.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          // Only invoices that are actually awaiting payment — same rule the
          // UI uses for showing "Mark as paid".
          inArray(invoices.status, ["sent", "overdue"]),
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError(
        "NOT_FOUND",
        "Invoice not found, or it isn't awaiting payment.",
      );
    }

    revalidateInvoicePaths(updated.id, updated.clientId);
    logActivity({
      userId: user.id,
      action: "invoice.paid",
      entityId: updated.id,
    });

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
    const parsedId = invoiceIdSchema.safeParse(invoiceId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid invoice ID." };
    }

    const user = await requireUser();

    const [updated] = await db
      .update(invoices)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, parsedId.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError("NOT_FOUND", "Invoice not found");
    }

    revalidateInvoicePaths(updated.id, updated.clientId);

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
