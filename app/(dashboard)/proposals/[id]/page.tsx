import { notFound } from "next/navigation";
import { getProjectForProposal, getProposalById } from "../queries";
import { ProposalDetailView } from "./proposal-detail";

type ProposalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProposalPage({ params }: ProposalPageProps) {
  const { id } = await params;

  // null means the proposal doesn't exist (or isn't yours). A failed query
  // throws instead, so it reaches the error page rather than a 404.
  const proposal = await getProposalById(id);

  if (!proposal) {
    notFound();
  }

  // Only accepted proposals can have a project, so the lookup is skipped
  // entirely for the rest.
  const project =
    proposal.status === "accepted" ? await getProjectForProposal(id) : null;

  return <ProposalDetailView proposal={proposal} project={project} />;
}
