"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/current-user";
import { AppError, logError } from "@/lib/errors";
import { isRateLimited } from "@/lib/rate-limit";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { proposalItems } from "@/src/db/schema/proposal-items";
import { proposalMilestones } from "@/src/db/schema/proposal-milestones";
import { proposals } from "@/src/db/schema/proposals";
import {
  createProposalSchema,
  revokeProposalSchema,
  sendProposalSchema,
} from "./schema";

export type PublicProposal = {
  id: string;
  title: string;
  content: string | null;
  currency: string;
  subtotal: string;
  tax: string;
  total: string;
  status: "sent" | "viewed" | "accepted" | "rejected";
  expiresAt: Date | null;
  createdAt: Date;
  clientName: string;
  clientCompany: string | null;
  items: {
    id: string;
    description: string;
    quantity: string;
    rate: string;
    amount: string;
  }[];
};

const viewableStatuses = ["sent", "viewed", "accepted", "rejected"] as const;

function isViewable(
  status: (typeof proposals.$inferSelect)["status"],
): status is (typeof viewableStatuses)[number] {
  return (viewableStatuses as readonly string[]).includes(status);
}

export async function getProposalByToken(
  token: string,
): Promise<ActionResult<PublicProposal>> {
  if (isRateLimited(`proposal:read:${token}`, { max: 30, windowMs: 60_000 })) {
    return {
      success: false as const,
      error: "Too many requests. Try again shortly.",
    };
  }

  if (!token || token.length < 20) {
    return { success: false as const, error: "Invalid link" };
  }

  try {
    const proposal = await db.query.proposals.findFirst({
      where: and(eq(proposals.token, token), isNull(proposals.deletedAt)),
      columns: {
        id: true,
        title: true,
        content: true,
        currency: true,
        subtotal: true,
        tax: true,
        total: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      with: {
        client: { columns: { name: true, company: true } },
        items: {
          columns: {
            id: true,
            description: true,
            quantity: true,
            rate: true,
            amount: true,
          },
          orderBy: [asc(proposalItems.sortOrder), asc(proposalItems.id)],
        },
      },
    });

    // One message for "gone", "never shared", and "revoked" — a public endpoint
    // shouldn't let a guesser tell those apart.
    if (
      !proposal ||
      !isViewable(proposal.status) ||
      (proposal.expiresAt && proposal.expiresAt.getTime() <= Date.now())
    ) {
      return {
        success: false as const,
        error: "This proposal is no longer available.",
      };
    }

    const { client, ...rest } = proposal;

    return {
      success: true as const,
      data: {
        ...rest,
        status: proposal.status,
        clientName: client.name,
        clientCompany: client.company,
      },
    };
  } catch (error) {
    logError("getProposalByToken", error);
    return {
      success: false as const,
      error: "Could not load this proposal.",
    };
  }
}

// Every page that renders a proposal: the list, its detail page, and the
// client it belongs to.
function revalidateProposalPaths(proposalId: string, clientId?: string) {
  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
  if (clientId) revalidatePath(`/clients/${clientId}`);
}

/**
 * 32 random bytes, base64url encoded. Never derived from the row id: the link
 * is the only thing standing between a public URL and someone else's pricing,
 * so it has to be unguessable rather than merely opaque.
 */
function generateProposalToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createProposalAction(
  input: unknown,
): Promise<ActionResult<{ proposalId: string }>> {
  try {
    const parsed = createProposalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    // Money is computed here and only here — a client-sent total is never
    // trusted. Rounded per line first so the stored figures add up exactly
    // the way the line items read on screen.
    const milestonesWithAmounts = parsed.data.milestones.map((milestone) => ({
      ...milestone,
      items: milestone.items.map((item) => ({
        ...item,
        amount: Math.round(item.quantity * item.rate * 100) / 100,
      })),
    }));

    const subtotal =
      Math.round(
        milestonesWithAmounts.reduce(
          (sum, milestone) =>
            sum + milestone.items.reduce((s, item) => s + item.amount, 0),
          0,
        ) * 100,
      ) / 100;
    const taxAmount =
      Math.round(subtotal * (parsed.data.taxRate / 100) * 100) / 100;
    const total = Math.round((subtotal + taxAmount) * 100) / 100;

    // 0 days means the link never expires. Set now so a draft shows the
    // intended date; sending re-bases it off the same window.
    const expiresAt =
      parsed.data.expiresInDays > 0
        ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000)
        : null;

    // Proposal, milestones and items have to land together — a proposal with
    // no items would show an empty quote at a public URL.
    const created = await db.transaction(async (tx) => {
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

      const [row] = await tx
        .insert(proposals)
        .values({
          userId: user.id,
          clientId: parsed.data.clientId,
          title: parsed.data.title,
          content: parsed.data.content,
          currency: parsed.data.currency,
          subtotal: subtotal.toFixed(2),
          tax: taxAmount.toFixed(2),
          taxRate: parsed.data.taxRate.toFixed(2),
          total: total.toFixed(2),
          depositPercent: parsed.data.depositPercent.toFixed(2),
          token: generateProposalToken(),
          expiresAt,
        })
        .returning({ proposalId: proposals.id });

      if (!row) {
        throw new AppError("INSERT_FAILED", "Failed to create proposal");
      }

      // One insert for every milestone, then one for every line across all
      // of them — two round trips regardless of how many stages there are.
      const milestoneRows = await tx
        .insert(proposalMilestones)
        .values(
          milestonesWithAmounts.map((milestone, index) => ({
            proposalId: row.proposalId,
            name: milestone.name,
            description: milestone.description,
            sortOrder: index,
          })),
        )
        .returning({
          id: proposalMilestones.id,
          sortOrder: proposalMilestones.sortOrder,
        });

      const bySortOrder = new Map(
        milestoneRows.map((milestone) => [milestone.sortOrder, milestone.id]),
      );

      await tx.insert(proposalItems).values(
        milestonesWithAmounts.flatMap((milestone, milestoneIndex) =>
          milestone.items.map((item, itemIndex) => ({
            proposalId: row.proposalId,
            milestoneId: bySortOrder.get(milestoneIndex),
            description: item.description,
            quantity: item.quantity.toFixed(2),
            rate: item.rate.toFixed(2),
            amount: item.amount.toFixed(2),
            // Kept unique across the whole proposal so a flat ordering still
            // reads correctly if milestones are ever collapsed away.
            sortOrder: milestoneIndex * 1000 + itemIndex,
          })),
        ),
      );

      return row;
    });

    revalidateProposalPaths(created.proposalId, parsed.data.clientId);

    return { success: true, data: { proposalId: created.proposalId } };
  } catch (error) {
    logError("createProposalAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not create proposal. Try again.",
    };
  }
}

/**
 * Moves a draft to `sent`, which is what makes its public link openable.
 *
 * The expiry window the user picked is re-based off `now()` here rather than
 * being left at whatever was stored on creation. A draft written a month ago
 * would otherwise go out already expired. The original window is recoverable
 * as `expiresAt - createdAt`, so no extra column is needed to remember it.
 */
export async function sendProposalAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = sendProposalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const [row] = await db
      .update(proposals)
      .set({
        status: "sent",
        expiresAt: sql`case when ${proposals.expiresAt} is null then null else now() + (${proposals.expiresAt} - ${proposals.createdAt}) end`,
        updatedAt: new Date(),
      })
      // Ownership lives in the write's own WHERE, not in an earlier read.
      .where(
        and(
          eq(proposals.id, parsed.data.proposalId),
          eq(proposals.userId, user.id),
          eq(proposals.status, "draft"),
          isNull(proposals.deletedAt),
        ),
      )
      .returning({ id: proposals.id, clientId: proposals.clientId });

    if (!row) {
      return {
        success: false,
        error: "This proposal can no longer be sent.",
      };
    }

    revalidateProposalPaths(row.id, row.clientId);
    return { success: true };
  } catch (error) {
    logError("sendProposalAction", error);
    return { success: false, error: "Could not send proposal. Try again." };
  }
}

/**
 * Kills the public link. Only a proposal still out with the client can be
 * revoked — once it has been accepted or declined the answer is a record,
 * not something to withdraw.
 */
export async function revokeProposalAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = revokeProposalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const [row] = await db
      .update(proposals)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(proposals.id, parsed.data.proposalId),
          eq(proposals.userId, user.id),
          inArray(proposals.status, ["sent", "viewed"]),
          isNull(proposals.deletedAt),
        ),
      )
      .returning({ id: proposals.id, clientId: proposals.clientId });

    if (!row) {
      return {
        success: false,
        error: "Only a proposal still awaiting a reply can be revoked.",
      };
    }

    revalidateProposalPaths(row.id, row.clientId);
    return { success: true };
  } catch (error) {
    logError("revokeProposalAction", error);
    return { success: false, error: "Could not revoke proposal. Try again." };
  }
}
