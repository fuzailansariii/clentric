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
import { revalidatePath } from "next/cache";
import { invoiceItems } from "@/src/db/schema/invoice-items";
import { clients } from "@/src/db/schema/clients";
import { and, eq, gt, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { projects } from "@/src/db/schema/projects";
import { getDisplayStatus } from "@/lib/get-invoice-display-status";
import {
  isReminderOnCooldown,
  REMINDER_COOLDOWN_MS,
} from "@/lib/is-reminder-on-cooldown";
import {
  isWithinUndoSendWindow,
  UNDO_SEND_WINDOW_MS,
} from "@/lib/is-within-undo-send-window";

// Every page that renders an invoice: the list, its detail page, and its
// client's page.
function revalidateInvoicePaths(invoiceId: string, clientId: string) {
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/clients/${clientId}`);
}

// `now() - <ms>` for SQL guards, built from the same millisecond constants
// the UI uses, so the database check and the button state can't drift apart.
function msAgo(ms: number) {
  return sql`now() - make_interval(secs => ${ms / 1000})`;
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
      .select({
        id: invoices.id,
        status: invoices.status,
        sentAt: invoices.sentAt,
      })
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

    const { status: currentStatus } = existingInvoice;
    const targetStatus = parsed.data.status;

    const isValidRevert =
      (currentStatus === "sent" && targetStatus === "draft") ||
      (currentStatus === "paid" && targetStatus === "sent");

    if (!isValidRevert) {
      throw new AppError(
        "BAD_REQUEST",
        `Cannot change status from ${currentStatus} to ${targetStatus}`,
      );
    }

    // "Undo send" (sent -> draft) only within the 5-minute grace window —
    // past that the client may already have seen it, so silently reverting
    // the status would misrepresent what actually happened.
    const isUndoSend = currentStatus === "sent" && targetStatus === "draft";

    if (isUndoSend && !isWithinUndoSendWindow(existingInvoice.sentAt)) {
      throw new AppError(
        "BAD_REQUEST",
        "The 5-minute undo window for this invoice has passed.",
      );
    }

    const clearedTimestamp =
      currentStatus === "sent" ? { sentAt: null } : { paidAt: null };

    // The checks above give a clear error message; this WHERE is what actually
    // enforces them. It only matches if the status is still what we read and,
    // for undo-send, the window is still open — so two requests racing each
    // other (or the window closing mid-request) can't both succeed.
    const [updated] = await db
      .update(invoices)
      .set({
        status: targetStatus,
        updatedAt: new Date(),
        ...clearedTimestamp,
      })
      .where(
        and(
          eq(invoices.id, parsed.data.invoiceId),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          eq(invoices.status, currentStatus),
          isUndoSend
            ? gt(invoices.sentAt, msAgo(UNDO_SEND_WINDOW_MS))
            : undefined,
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError(
        "CONFLICT",
        isUndoSend
          ? "The 5-minute undo window for this invoice has passed."
          : "This invoice changed in the meantime. Refresh and try again.",
      );
    }

    revalidateInvoicePaths(updated.id, updated.clientId);
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

export async function sendInvoiceAction(
  invoiceId: string,
): Promise<ActionResult> {
  try {
    const parsedId = invoiceIdSchema.safeParse(invoiceId);
    if (!parsedId.success) {
      return { success: false, error: "Invalid invoice ID." };
    }

    const user = await requireUser();

    const [invoice] = await db
      .select({ id: invoices.id, status: invoices.status })
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
      .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, parsedId.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          // Enforced in the write: it may have been paid since the read.
          ne(invoices.status, "paid"),
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError("BAD_REQUEST", "Invoice is already paid");
    }

    revalidateInvoicePaths(updated.id, updated.clientId);

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
        lastReminderSentAt: invoices.lastReminderSentAt,
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

    const cooldownMessage =
      "A reminder was already sent for this invoice in the last 24 hours.";

    // Cap reminders at once per rolling 24h window so a client isn't
    // bombarded if someone clicks the bell repeatedly.
    if (isReminderOnCooldown(invoice.lastReminderSentAt)) {
      throw new AppError("BAD_REQUEST", cooldownMessage);
    }

    // The check above is for a friendly message; this WHERE enforces it.
    // Two sends at the same moment (two tabs, list + detail page) both pass
    // the read, but only one of them still matches here.
    const [updated] = await db
      .update(invoices)
      .set({ lastReminderSentAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, parsedId.data),
          eq(invoices.userId, user.id),
          isNull(invoices.deletedAt),
          inArray(invoices.status, ["sent", "overdue"]),
          or(
            isNull(invoices.lastReminderSentAt),
            lt(invoices.lastReminderSentAt, msAgo(REMINDER_COOLDOWN_MS)),
          ),
        ),
      )
      .returning({ id: invoices.id, clientId: invoices.clientId });

    if (!updated) {
      throw new AppError("BAD_REQUEST", cooldownMessage);
    }

    // TODO: send the actual email here

    revalidateInvoicePaths(updated.id, updated.clientId);

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
