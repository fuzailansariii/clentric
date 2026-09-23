import { notFound, redirect } from "next/navigation";

import { getClientOptions } from "../../../clients/queries";
import { getProposalById } from "../../queries";
import ProposalBuilder, { type EditableProposal } from "../../proposal-builder";

type EditProposalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditProposalPage({
  params,
}: EditProposalPageProps) {
  const { id } = await params;

  const [proposal, clients] = await Promise.all([
    getProposalById(id),
    getClientOptions(),
  ]);

  if (!proposal) {
    notFound();
  }

  // Drafts only. Someone arriving here from a stale tab, or by typing the
  // URL, is sent back to the proposal rather than shown a form whose save
  // the action would refuse anyway.
  if (proposal.status !== "draft") {
    redirect(`/proposals/${id}`);
  }

  // Stages back into the shape the form uses. Items carry their milestone id,
  // so they are grouped here rather than in a second query — and anything
  // without a stage becomes one unnamed group so nothing is silently dropped.
  const grouped = proposal.milestones.map((milestone) => ({
    name: milestone.name,
    description: milestone.description ?? "",
    items: proposal.items
      .filter((item) => item.milestoneId === milestone.id)
      .map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
      })),
  }));

  const ungrouped = proposal.items.filter((item) => !item.milestoneId);
  if (ungrouped.length > 0) {
    grouped.push({
      name: "",
      description: "",
      items: ungrouped.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
      })),
    });
  }

  // The stored expiry is an absolute date; the form works in windows. Rounding
  // up keeps "14 days" reading as 14 rather than 13 on the day after.
  const expiresInDays = proposal.expiresAt
    ? Math.max(
        0,
        Math.ceil(
          (proposal.expiresAt.getTime() - proposal.createdAt.getTime()) /
            86_400_000,
        ),
      )
    : 0;

  const editable: EditableProposal = {
    id: proposal.id,
    clientId: proposal.clientId,
    title: proposal.title,
    content: proposal.content ?? "",
    taxRate: Number(proposal.taxRate),
    depositPercent: Number(proposal.depositPercent),
    expiresInDays,
    milestones:
      grouped.length > 0
        ? grouped
        : [
            {
              name: "",
              description: "",
              items: [{ description: "", quantity: 1, rate: 0 }],
            },
          ],
  };

  return <ProposalBuilder clients={clients} proposal={editable} />;
}
