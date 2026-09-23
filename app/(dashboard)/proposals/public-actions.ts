"use server";

import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { z } from "zod";

import type { ActionResult } from "@/lib/action-result";
import { AppError, logError } from "@/lib/errors";
import { getNextInvoiceNumber } from "@/lib/get-next-invoice-number";
import { isRateLimited } from "@/lib/rate-limit";
import { db, type Transaction } from "@/src/db";
import { createProjectFromProposal } from "@/lib/create-project-from-proposal";
import { invoiceItems } from "@/src/db/schema/invoice-items";
import { invoices } from "@/src/db/schema/invoices";
import { proposals } from "@/src/db/schema/proposals";
import { users } from "@/src/db/schema/users";

/**
 * Actions reachable by a client holding a proposal link, with no account.
 *
 * Kept apart from actions.ts on purpose: nothing here calls requireUser(), so
 * every function must carry its own rate limit and prove the caller holds a
 * valid, still-open token. The token is the only credential.
 */

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

/**
 * One message for "never existed", "revoked" and "expired". A public endpoint
 * that distinguishes them lets someone probe tokens.
 */
const GONE = "This proposal is no longer available.";

/**
 * Records the first time a client opened the proposal.
 *
 * Only ever moves `sent` to `viewed` — an accepted or declined proposal keeps
 * the status the client gave it, and viewedAt is never overwritten, so it
 * stays the *first* view rather than the most recent.
 */
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

/**
 * Raises the deposit invoice for an accepted proposal.
 *
 * NOT a payment. It writes an invoice carrying the freelancer's own saved
 * payment details so the client can pay them directly, outside this app.
 * No gateway is involved and none may be added here.
 */
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
    .select({ paymentDetails: users.paymentDetails })
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
      // Inherited from the proposal: the deposit is a slice of that figure,
      // so it has to be in the same currency it was quoted in.
      currency: proposal.currency,
      // Tax was already applied when the proposal total was computed, so the
      // deposit is a straight slice of that figure and is not taxed again.
      subTotal: amount.toFixed(2),
      taxRate: "0",
      taxAmount: "0",
      total: amount.toFixed(2),
      issueDate: asDateString(issueDate),
      dueDate: asDateString(dueDate),
      status: "sent",
      sentAt: issueDate,
      paymentDetails: owner?.paymentDetails ?? null,
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
  /** Present only when accepting a proposal that asked for a deposit. */
  deposit: {
    amount: string;
    percent: number;
    paymentDetails: string | null;
  } | null;
};

/**
 * The client's answer. Accepting a proposal that asks for a deposit also
 * raises that invoice, in the same transaction, so an accepted proposal can
 * never exist without the invoice it promised.
 */
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

      // The status change is the claim. Guarding it here — rather than
      // reading first and writing after — is what makes two tabs accepting
      // at the same moment safe: exactly one UPDATE matches a row, and the
      // loser sees the same "no longer available" message as a stale link.
      const stillOpen = and(
        eq(proposals.token, token),
        inArray(proposals.status, [...OPEN_STATUSES]),
        isNull(proposals.deletedAt),
        or(isNull(proposals.expiresAt), gt(proposals.expiresAt, now)),
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

      const [owner] = await tx
        .select({ paymentDetails: users.paymentDetails })
        .from(users)
        .where(eq(users.id, accepted.userId))
        .limit(1);

      return {
        response,
        deposit: {
          amount: amount.toFixed(2),
          percent,
          paymentDetails: owner?.paymentDetails ?? null,
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

/**
 * A nudge, nothing more.
 *
 * Reached with the proposal's token rather than one of its own — the deposit
 * invoice hangs off the proposal, so there is no second public token to leak
 * or revoke. It sets paymentClaimedAt/Note and deliberately never touches
 * `status`: only the freelancer's own "Mark as paid" can do that.
 */
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
        depositInvoiceId: proposals.depositInvoiceId,
        status: proposals.status,
      })
      .from(proposals)
      .where(and(eq(proposals.token, token), isNull(proposals.deletedAt)))
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
      .where(eq(invoices.id, proposal.depositInvoiceId));

    return { success: true };
  } catch (error) {
    logError("markPaymentSentAction", error);
    return { success: false, error: "Could not record that. Try again." };
  }
}
