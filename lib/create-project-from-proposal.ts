import "server-only";
import { and, asc, eq } from "drizzle-orm";

import type { Transaction } from "@/src/db";
import { invoices } from "@/src/db/schema/invoices";
import { milestones } from "@/src/db/schema/milestones";
import { projects } from "@/src/db/schema/projects";
import { proposalMilestones } from "@/src/db/schema/proposal-milestones";

/** The proposal fields this needs, all read from the database row. */
export type ProposalForProject = {
  id: string;
  userId: string;
  clientId: string;
  title: string;
  content: string | null;
  total: string;
  currency: string;
  depositInvoiceId: string | null;
};

/**
 * Turns an accepted proposal into a project, inside the caller's transaction.
 *
 * The single place that maps a proposal onto a project — both the public
 * accept path and the freelancer's "Start project" button call this, so the
 * two can never drift apart.
 *
 * Copies, never shares: a proposal's stages are written as new milestone rows.
 * Editing one afterwards has no effect on the other, which is what lets the
 * proposal stay a record of what was agreed while the project moves on.
 *
 * `userId` comes from the proposal row rather than from anything the caller
 * passed in. On the public path there is no signed-in user to trust.
 */
export async function createProjectFromProposal(
  tx: Transaction,
  proposal: ProposalForProject,
): Promise<string> {
  const [project] = await tx
    .insert(projects)
    .values({
      userId: proposal.userId,
      clientId: proposal.clientId,
      title: proposal.title,
      description: proposal.content,
      // budget is NOT NULL on this table; a proposal always carries a total.
      budget: proposal.total,
      currency: proposal.currency,
      status: "not_started",
      deadline: null,
      proposalId: proposal.id,
    })
    .returning({ id: projects.id });

  if (!project) {
    throw new Error("Failed to create project from proposal");
  }

  const stages = await tx
    .select({
      name: proposalMilestones.name,
      sortOrder: proposalMilestones.sortOrder,
    })
    .from(proposalMilestones)
    .where(eq(proposalMilestones.proposalId, proposal.id))
    .orderBy(asc(proposalMilestones.sortOrder), asc(proposalMilestones.id));

  // A proposal quoted as a flat list has no stages, and that is fine — the
  // project simply starts without milestones.
  if (stages.length > 0) {
    await tx.insert(milestones).values(
      stages.map((stage, index) => ({
        projectId: project.id,
        title: stage.name,
        status: "pending" as const,
        dueDate: null,
        // Re-indexed from the stage order rather than copying sortOrder,
        // so gaps left by deleted stages do not carry across.
        sortOrder: index,
      })),
    );
  }

  // The deposit invoice was raised against the client before the project
  // existed, so it is adopted here. Scoped by user id in the write's own
  // WHERE, not just by invoice id.
  if (proposal.depositInvoiceId) {
    await tx
      .update(invoices)
      .set({ projectId: project.id, updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, proposal.depositInvoiceId),
          eq(invoices.userId, proposal.userId),
        ),
      );
  }

  return project.id;
}
