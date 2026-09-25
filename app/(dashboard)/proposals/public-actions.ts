"use server";

import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { AppError, logError } from "@/lib/errors";
import { getNextInvoiceNumber } from "@/lib/get-next-invoice-number";
import { issuerSnapshotSql, resolvePayment } from "@/lib/issuer-snapshot";
import type { PaymentDetails } from "@/lib/payment-methods";
import { isRateLimited } from "@/lib/rate-limit";
import { db, type Transaction } from "@/src/db";
import { createProjectFromProposal } from "@/lib/create-project-from-proposal";
import { invoiceItems } from "@/src/db/schema/invoice-items";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";
import { users } from "@/src/db/schema/users";

const tokenSchema = z.string().trim().min(20, "Invalid link").max(200);

const respondSchema = z.object({
  token: tokenSchema,
  response: z.enum(["accepted", "declined"]),
  /** Only meaningful on a decline; ignored otherwise. */
  declineReason: z.string().trim().max(2000).optional(),
});

const markPaymentSentSchema = z.object({
  token: tokenSchema,
  note: z.string().trim().max(1000).optional(),
});

/** Statuses a link is still allowed to act on. */
const OPEN_STATUSES = ["sent", "viewed"] as const;

const GONE = "This proposal is no longer available.";

const ownerIsActive = sql`not exists (
  select 1 from ${users}
  where ${users.id} = ${proposals.userId}
    and ${users.deletionRequestedAt} is not null
)`;

export async function viewProposalAction(token: string): Promise<ActionResult> {
  try {
    const parsed = tokenSchema.safeParse(token);
    if (!parsed.success) return { success: false, error: GONE };

    if (
      isRateLimited(`proposal:view:${parsed.data}`, {
        max: 30,
        windowMs: 60_000,
      })
    ) {
      return { success: false, error: "Too many requests. Try again shortly." };
    }

    await db
      .update(proposals)
      .set({ status: "viewed", viewedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(proposals.token, parsed.data),
          eq(proposals.status, "sent"),
          isNull(proposals.viewedAt),
          isNull(proposals.deletedAt),
          ownerIsActive,
        ),
      );

    // Success either way: a second open is not an error, it just changes
    // nothing.
    return { success: true };
  } catch (error) {
    logError("viewProposalAction", error);
    return { success: false, error: "Could not record the view." };
  }
}

async function createDepositInvoice(
  tx: Transaction,
  proposal: {
    id: string;
    userId: string;
    clientId: string;
    title: string;
    total: string;
    currency: string;
    depositPercent: string;
  },
): Promise<string | null> {
  const percent = Number(proposal.depositPercent);
  if (!(percent > 0)) return null;

  const amount =
    Math.round(Number(proposal.total) * (percent / 100) * 100) / 100;
  if (!(amount > 0)) return null;

  const [owner] = await tx
    .select({
      paymentDetails: users.paymentDetails,
      // Numbered and noted like any other new invoice.
      invoicePrefix: users.invoicePrefix,
      defaultInvoiceNotes: users.defaultInvoiceNotes,
    })
    .from(users)
    .where(eq(users.id, proposal.userId))
    .limit(1);

  const invoiceNumber = await getNextInvoiceNumber(tx, proposal.userId);

  const issueDate = new Date();
  // The proposal itself carries no payment terms, so the deposit falls due a
  // week out. Freelancers can edit the invoice afterwards.
  const dueDate = new Date(issueDate.getTime() + 7 * 86_400_000);
  const asDateString = (date: Date) => date.toISOString().slice(0, 10);

  const [invoice] = await tx
    .insert(invoices)
    .values({
      userId: proposal.userId,
      clientId: proposal.clientId,
      invoiceNumber,
      currency: proposal.currency,
      subTotal: amount.toFixed(2),
      taxRate: "0",
      taxAmount: "0",
      total: amount.toFixed(2),
      issueDate: asDateString(issueDate),
      dueDate: asDateString(dueDate),
      status: "sent",
      sentAt: issueDate,
      paymentDetails: owner?.paymentDetails ?? null,
      numberPrefix: owner?.invoicePrefix ?? "INV-",
      notes: owner?.defaultInvoiceNotes ?? null,
      issuerSnapshot: sql`coalesce(
        (select ${proposals.issuerSnapshot} from ${proposals} where ${proposals.id} = ${proposal.id}),
        ${issuerSnapshotSql(proposal.userId)}
      )`,
    })
    .returning({ id: invoices.id });

  if (!invoice) {
    throw new AppError("INSERT_FAILED", "Could not raise the deposit invoice");
  }

  await tx.insert(invoiceItems).values({
    invoiceId: invoice.id,
    description: `Deposit (${percent}%) — ${proposal.title}`,
    quantity: "1",
    rate: amount.toFixed(2),
    amount: amount.toFixed(2),
    sortOrder: 0,
  });

  return invoice.id;
}

export type RespondResult = {
  response: "accepted" | "declined";
  deposit: {
    amount: string;
    percent: number;
    payment: PaymentDetails;
  } | null;
};

export async function respondProposalAction(
  input: unknown,
): Promise<ActionResult<RespondResult>> {
  try {
    const parsed = respondSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { token, response, declineReason } = parsed.data;

    if (
      isRateLimited(`proposal:respond:${token}`, { max: 10, windowMs: 60_000 })
    ) {
      return { success: false, error: "Too many attempts. Try again shortly." };
    }

    const result = await db.transaction(async (tx) => {
      const now = new Date();

      const stillOpen = and(
        eq(proposals.token, token),
        inArray(proposals.status, [...OPEN_STATUSES]),
        isNull(proposals.deletedAt),
        or(isNull(proposals.expiresAt), gt(proposals.expiresAt, now)),
        ownerIsActive,
      );

      if (response === "declined") {
        const [declined] = await tx
          .update(proposals)
          .set({
            status: "rejected",
            rejectedAt: now,
            declineReason: declineReason || null,
            updatedAt: now,
          })
          .where(stillOpen)
          .returning({ id: proposals.id });

        if (!declined) throw new AppError("GONE", GONE);

        // Declining creates nothing.
        return { response, deposit: null } satisfies RespondResult;
      }

      const [accepted] = await tx
        .update(proposals)
        .set({ status: "accepted", acceptedAt: now, updatedAt: now })
        .where(stillOpen)
        .returning({
          id: proposals.id,
          userId: proposals.userId,
          clientId: proposals.clientId,
          title: proposals.title,
          content: proposals.content,
          total: proposals.total,
          currency: proposals.currency,
          depositPercent: proposals.depositPercent,
        });

      if (!accepted) throw new AppError("GONE", GONE);

      const depositInvoiceId = await createDepositInvoice(tx, accepted);

      if (depositInvoiceId) {
        await tx
          .update(proposals)
          .set({ depositInvoiceId, updatedAt: now })
          .where(eq(proposals.id, accepted.id));
      }

      // Acceptance, deposit invoice and project succeed or fail together.
      await createProjectFromProposal(tx, { ...accepted, depositInvoiceId });

      if (!depositInvoiceId) {
        return { response, deposit: null } satisfies RespondResult;
      }

      const percent = Number(accepted.depositPercent);
      const amount =
        Math.round(Number(accepted.total) * (percent / 100) * 100) / 100;

      // Read back from the invoice just raised, so the page shows the same
      // methods the invoice (and its PDF) will print.
      const [deposit] = await tx
        .select({
          issuerSnapshot: invoices.issuerSnapshot,
          paymentDetails: invoices.paymentDetails,
        })
        .from(invoices)
        .where(eq(invoices.id, depositInvoiceId))
        .limit(1);

      return {
        response,
        deposit: {
          amount: amount.toFixed(2),
          percent,
          payment: resolvePayment(
            deposit?.issuerSnapshot,
            deposit?.paymentDetails ?? null,
            { methods: [], instructions: null },
          ),
        },
      } satisfies RespondResult;
    });

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      return { success: false, error: error.message };
    }
    logError("respondProposalAction", error);
    return { success: false, error: "Could not record your response." };
  }
}

export async function markPaymentSentAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = markPaymentSentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { token, note } = parsed.data;

    if (isRateLimited(`proposal:paid:${token}`, { max: 5, windowMs: 60_000 })) {
      return { success: false, error: "Too many attempts. Try again shortly." };
    }

    const [proposal] = await db
      .select({
        userId: proposals.userId,
        depositInvoiceId: proposals.depositInvoiceId,
        status: proposals.status,
      })
      .from(proposals)
      .where(
        and(
          eq(proposals.token, token),
          isNull(proposals.deletedAt),
          ownerIsActive,
        ),
      )
      .limit(1);

    // Only an accepted proposal has a deposit invoice to claim against.
    if (
      !proposal ||
      proposal.status !== "accepted" ||
      !proposal.depositInvoiceId
    ) {
      return { success: false, error: GONE };
    }

    await db
      .update(invoices)
      .set({
        paymentClaimedAt: new Date(),
        paymentClaimedNote: note || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoices.id, proposal.depositInvoiceId),
          eq(invoices.userId, proposal.userId),
          isNull(invoices.deletedAt),
        ),
      );

    return { success: true };
  } catch (error) {
    logError("markPaymentSentAction", error);
    return { success: false, error: "Could not record that. Try again." };
  }
}
