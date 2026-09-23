"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/current-user";
import { AppError, isUniqueViolation, logError } from "@/lib/errors";
import { isRateLimited } from "@/lib/rate-limit";
import { db } from "@/src/db";
import { clients } from "@/src/db/schema/clients";
import { proposalItems } from "@/src/db/schema/proposal-items";
import { proposalMilestones } from "@/src/db/schema/proposal-milestones";
import { projects } from "@/src/db/schema/projects";
import { proposals } from "@/src/db/schema/proposals";
import { createProjectFromProposal } from "@/lib/create-project-from-proposal";
import {
  createProposalSchema,
  duplicateProposalSchema,
  revokeProposalSchema,
  deleteProposalSchema,
  sendProposalSchema,
  startProjectSchema,
  updateProposalSchema,
} from "./schema";

export type PublicProposalItem = {
  id: string;
  milestoneId: string | null;
  description: string;
  quantity: string;
  rate: string;
  amount: string;
};

export type PublicProposal = {
  id: string;
  title: string;
  content: string | null;
  currency: string;
  subtotal: string;
  tax: string;
  taxRate: string;
  total: string;
  depositPercent: string;
  status: "sent" | "viewed" | "accepted" | "rejected";
  expiresAt: Date | null;
  viewedAt: Date | null;
  createdAt: Date;
  clientName: string;
  clientCompany: string | null;
  /** The freelancer, as the client sees them on the page. */
  owner: {
    name: string | null;
    email: string;
    avatar: string | null;
    brandColor: string | null;
    paymentDetails: string | null;
    testimonialQuote: string | null;
    testimonialAuthor: string | null;
  };
  milestones: {
    id: string;
    name: string;
    description: string | null;
  }[];
  items: PublicProposalItem[];
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
        taxRate: true,
        total: true,
        depositPercent: true,
        status: true,
        expiresAt: true,
        viewedAt: true,
        createdAt: true,
      },
      with: {
        client: { columns: { name: true, company: true } },
        // Branding and payment details belong to the freelancer, not the
        // proposal, so they are read through the owner rather than copied
        // onto every row.
        user: {
          columns: {
            name: true,
            email: true,
            avatar: true,
            brandColor: true,
            paymentDetails: true,
            testimonialQuote: true,
            testimonialAuthor: true,
          },
        },
        milestones: {
          columns: { id: true, name: true, description: true },
          orderBy: [
            asc(proposalMilestones.sortOrder),
            asc(proposalMilestones.id),
          ],
        },
        items: {
          columns: {
            id: true,
            milestoneId: true,
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

    const { client, user, ...rest } = proposal;

    return {
      success: true as const,
      data: {
        ...rest,
        status: proposal.status,
        clientName: client.name,
        clientCompany: client.company,
        owner: user,
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

      // Only named stages become rows. An unnamed one is not a nameless
      // milestone, it is no milestone — its lines hang off the proposal with
      // milestoneId null, which is exactly what that nullable column is for
      // and what every surface already renders.
      const named = milestonesWithAmounts
        .map((milestone, index) => ({ milestone, index }))
        .filter(({ milestone }) => milestone.name?.trim());

      const idByIndex = new Map<number, string>();

      if (named.length > 0) {
        const inserted = await tx
          .insert(proposalMilestones)
          .values(
            named.map(({ milestone, index }) => ({
              proposalId: row.proposalId,
              name: milestone.name!.trim(),
              description: milestone.description,
              sortOrder: index,
            })),
          )
          .returning({
            id: proposalMilestones.id,
            sortOrder: proposalMilestones.sortOrder,
          });

        for (const milestone of inserted) {
          idByIndex.set(milestone.sortOrder, milestone.id);
        }
      }

      await tx.insert(proposalItems).values(
        milestonesWithAmounts.flatMap((milestone, milestoneIndex) =>
          milestone.items.map((item, itemIndex) => ({
            proposalId: row.proposalId,
            milestoneId: idByIndex.get(milestoneIndex) ?? null,
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

/**
 * Copies a proposal back to a fresh draft — its stages, its lines and its
 * pricing, but none of its history.
 *
 * The copy gets its own token, because reusing the original's would let
 * anyone holding the old link read the new proposal. Lifecycle timestamps,
 * the decline reason and the deposit invoice link are all dropped: they
 * describe what happened to the original, not the copy.
 */
export async function duplicateProposalAction(
  input: unknown,
): Promise<ActionResult<{ proposalId: string }>> {
  try {
    const parsed = duplicateProposalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const created = await db.transaction(async (tx) => {
      const source = await tx.query.proposals.findFirst({
        where: and(
          eq(proposals.id, parsed.data.proposalId),
          eq(proposals.userId, user.id),
          isNull(proposals.deletedAt),
        ),
        with: {
          milestones: { orderBy: [asc(proposalMilestones.sortOrder)] },
          items: { orderBy: [asc(proposalItems.sortOrder)] },
        },
      });

      if (!source) {
        throw new AppError("NOT_FOUND", "Proposal not found");
      }

      const [row] = await tx
        .insert(proposals)
        .values({
          userId: user.id,
          clientId: source.clientId,
          title: `Copy of ${source.title}`.slice(0, 200),
          content: source.content,
          currency: source.currency,
          subtotal: source.subtotal,
          tax: source.tax,
          taxRate: source.taxRate,
          total: source.total,
          depositPercent: source.depositPercent,
          token: generateProposalToken(),
          // Re-based from today rather than copied, so a duplicate of an old
          // proposal does not arrive already expired.
          expiresAt: source.expiresAt
            ? new Date(
                Date.now() +
                  (source.expiresAt.getTime() - source.createdAt.getTime()),
              )
            : null,
        })
        .returning({ proposalId: proposals.id });

      if (!row) {
        throw new AppError("INSERT_FAILED", "Failed to duplicate proposal");
      }

      // Milestone ids change, so the copied items have to be re-pointed at
      // the new rows rather than carrying the originals' ids across.
      const idBySortOrder = new Map<number, string>();

      if (source.milestones.length > 0) {
        const inserted = await tx
          .insert(proposalMilestones)
          .values(
            source.milestones.map((milestone) => ({
              proposalId: row.proposalId,
              name: milestone.name,
              description: milestone.description,
              sortOrder: milestone.sortOrder,
            })),
          )
          .returning({
            id: proposalMilestones.id,
            sortOrder: proposalMilestones.sortOrder,
          });

        for (const milestone of inserted) {
          idBySortOrder.set(milestone.sortOrder, milestone.id);
        }
      }

      const sortOrderById = new Map(
        source.milestones.map((milestone) => [
          milestone.id,
          milestone.sortOrder,
        ]),
      );

      if (source.items.length > 0) {
        await tx.insert(proposalItems).values(
          source.items.map((item) => {
            const sortOrder = item.milestoneId
              ? sortOrderById.get(item.milestoneId)
              : undefined;
            return {
              proposalId: row.proposalId,
              milestoneId:
                sortOrder === undefined
                  ? null
                  : (idBySortOrder.get(sortOrder) ?? null),
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              amount: item.amount,
              sortOrder: item.sortOrder,
            };
          }),
        );
      }

      return row;
    });

    revalidateProposalPaths(created.proposalId, undefined);

    return { success: true, data: { proposalId: created.proposalId } };
  } catch (error) {
    logError("duplicateProposalAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not duplicate proposal. Try again.",
    };
  }
}

/**
 * Creates the project for a proposal that was accepted before acceptance
 * started doing it automatically — and as a retry if that project was later
 * deleted.
 *
 * Accepting already creates the project, so this exists only for those two
 * cases and is surfaced as a "Start project" button.
 */
export async function createProjectFromProposalAction(
  input: unknown,
): Promise<ActionResult<{ projectId: string }>> {
  try {
    const parsed = startProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const projectId = await db.transaction(async (tx) => {
      const [proposal] = await tx
        .select({
          id: proposals.id,
          userId: proposals.userId,
          clientId: proposals.clientId,
          title: proposals.title,
          content: proposals.content,
          total: proposals.total,
          currency: proposals.currency,
          depositInvoiceId: proposals.depositInvoiceId,
        })
        .from(proposals)
        .where(
          and(
            eq(proposals.id, parsed.data.proposalId),
            eq(proposals.userId, user.id),
            eq(proposals.status, "accepted"),
            isNull(proposals.deletedAt),
          ),
        )
        .limit(1);

      if (!proposal) {
        throw new AppError(
          "NOT_FOUND",
          "Only an accepted proposal can start a project.",
        );
      }

      // Checked here for a friendly message; the partial unique index is the
      // real guard against two clicks racing each other.
      const [existing] = await tx
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(eq(projects.proposalId, proposal.id), isNull(projects.deletedAt)),
        )
        .limit(1);

      if (existing) {
        throw new AppError(
          "ALREADY_EXISTS",
          "A project already exists for this proposal.",
        );
      }

      return createProjectFromProposal(tx, proposal);
    });

    revalidatePath("/proposals");
    revalidatePath(`/proposals/${parsed.data.proposalId}`);
    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);

    return { success: true, data: { projectId } };
  } catch (error) {
    // The unique index fires when two clicks land together; both callers
    // should see the same sentence as the pre-check above.
    if (isUniqueViolation(error)) {
      return {
        success: false,
        error: "A project already exists for this proposal.",
      };
    }
    logError("createProjectFromProposalAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not start the project. Try again.",
    };
  }
}

/**
 * Rewrites a draft proposal.
 *
 * Drafts only, and deliberately so: a sent proposal is already open at a link
 * the client may be reading, and an accepted one is the record of what was
 * agreed. Silently rewriting either would be worse than making someone
 * duplicate it. The status guard lives in the update's own WHERE, so a
 * proposal sent in another tab mid-edit cannot be overwritten.
 */
export async function updateProposalAction(
  input: unknown,
): Promise<ActionResult<{ proposalId: string }>> {
  try {
    const parsed = updateProposalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    // Same money rules as create: computed here, never trusted from input.
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

    await db.transaction(async (tx) => {
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

      if (!client) throw new AppError("NOT_FOUND", "Client not found");

      const [row] = await tx
        .update(proposals)
        .set({
          clientId: parsed.data.clientId,
          title: parsed.data.title,
          content: parsed.data.content,
          subtotal: subtotal.toFixed(2),
          tax: taxAmount.toFixed(2),
          taxRate: parsed.data.taxRate.toFixed(2),
          total: total.toFixed(2),
          depositPercent: parsed.data.depositPercent.toFixed(2),
          // Re-based from now, the same way sending does, so an edited draft
          // does not inherit a window that has already been running.
          expiresAt:
            parsed.data.expiresInDays > 0
              ? new Date(Date.now() + parsed.data.expiresInDays * 86_400_000)
              : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(proposals.id, parsed.data.proposalId),
            eq(proposals.userId, user.id),
            eq(proposals.status, "draft"),
            isNull(proposals.deletedAt),
          ),
        )
        .returning({ id: proposals.id });

      if (!row) {
        throw new AppError(
          "NOT_EDITABLE",
          "Only a draft proposal can be edited.",
        );
      }

      // Replace rather than reconcile. Items are deleted explicitly as well
      // as by the milestone cascade, because items with no milestone hang
      // off the proposal directly and nothing would cascade to them.
      await tx
        .delete(proposalItems)
        .where(eq(proposalItems.proposalId, row.id));
      await tx
        .delete(proposalMilestones)
        .where(eq(proposalMilestones.proposalId, row.id));

      const named = milestonesWithAmounts
        .map((milestone, index) => ({ milestone, index }))
        .filter(({ milestone }) => milestone.name?.trim());

      const idByIndex = new Map<number, string>();

      if (named.length > 0) {
        const inserted = await tx
          .insert(proposalMilestones)
          .values(
            named.map(({ milestone, index }) => ({
              proposalId: row.id,
              name: milestone.name!.trim(),
              description: milestone.description,
              sortOrder: index,
            })),
          )
          .returning({
            id: proposalMilestones.id,
            sortOrder: proposalMilestones.sortOrder,
          });

        for (const milestone of inserted) {
          idByIndex.set(milestone.sortOrder, milestone.id);
        }
      }

      await tx.insert(proposalItems).values(
        milestonesWithAmounts.flatMap((milestone, milestoneIndex) =>
          milestone.items.map((item, itemIndex) => ({
            proposalId: row.id,
            milestoneId: idByIndex.get(milestoneIndex) ?? null,
            description: item.description,
            quantity: item.quantity.toFixed(2),
            rate: item.rate.toFixed(2),
            amount: item.amount.toFixed(2),
            sortOrder: milestoneIndex * 1000 + itemIndex,
          })),
        ),
      );
    });

    revalidateProposalPaths(parsed.data.proposalId, parsed.data.clientId);

    return { success: true, data: { proposalId: parsed.data.proposalId } };
  } catch (error) {
    logError("updateProposalAction", error);
    return {
      success: false,
      error:
        error instanceof AppError
          ? error.message
          : "Could not save the proposal. Try again.",
    };
  }
}

/**
 * Soft-deletes a proposal. Every query filters on deletedAt, so it disappears
 * from the app without taking its history with it.
 *
 * Allowed from any status: it is the freelancer's own record to remove. A
 * project created from it keeps working — the "From proposal" link simply
 * stops rendering, because that lookup filters deleted rows too.
 */
export async function deleteProposalAction(
  input: unknown,
): Promise<ActionResult> {
  try {
    const parsed = deleteProposalSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const user = await requireUser();

    const [row] = await db
      .update(proposals)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(proposals.id, parsed.data.proposalId),
          eq(proposals.userId, user.id),
          isNull(proposals.deletedAt),
        ),
      )
      .returning({ id: proposals.id, clientId: proposals.clientId });

    if (!row) {
      return { success: false, error: "That proposal is already gone." };
    }

    revalidateProposalPaths(row.id, row.clientId);
    return { success: true };
  } catch (error) {
    logError("deleteProposalAction", error);
    return { success: false, error: "Could not delete proposal. Try again." };
  }
}
