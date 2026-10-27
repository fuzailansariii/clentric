import { notFound, redirect } from "next/navigation";
import {
  getInvoicesForProject,
  getMilestonesByProjectId,
  getProjectById,
  getProposalForProject,
} from "../../queries";
import { ProjectDetail } from "../../project-details";

type ProjectDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectDetailProps) {
  const { id } = await params;
  // Old links opened the inline editor; editing has its own page now.
  if ((await searchParams).edit === "true") redirect(`/projects/${id}/edit`);

  // Independent reads - each checks ownership itself.
  const [project, milestones, invoices] = await Promise.all([
    getProjectById(id),
    getMilestonesByProjectId(id),
    getInvoicesForProject(id),
  ]);

  if (!project) {
    notFound();
  }

  // Only looked up when the project actually came from one.
  const fromProposal = project.proposalId
    ? await getProposalForProject(project.proposalId)
    : null;

  return (
    <ProjectDetail
      project={project}
      milestones={milestones}
      invoices={invoices}
      fromProposal={fromProposal}
    />
  );
}
