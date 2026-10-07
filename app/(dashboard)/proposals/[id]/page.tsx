import { notFound } from "next/navigation";
import { getProjectForProposal, getProposalById } from "../queries";
import { getEmailStatus } from "@/lib/email/quota";
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

  // Only accepted proposals can have a project, and only ones still out
  // with the client can be emailed, so each lookup runs only when needed.
  const isOut = proposal.status === "sent" || proposal.status === "viewed";
  const [project, emailStatus] = await Promise.all([
    proposal.status === "accepted" ? getProjectForProposal(id) : null,
    isOut ? getEmailStatus(id, "proposal") : null,
  ]);

  return (
    <ProposalDetailView
      proposal={proposal}
      project={project}
      emailStatus={emailStatus}
    />
  );
}
