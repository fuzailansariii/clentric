import { notFound } from "next/navigation";
import { getMilestonesByProjectId, getProjectById } from "../queries";
import { ProjectDetail } from "../project-details";

type ProjectDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProjectPage({
  params,
  searchParams,
}: ProjectDetailProps) {
  const { id } = await params;
  const query = await searchParams;

  const [project, milestones] = await Promise.all([
    getProjectById(id),
    getMilestonesByProjectId(id),
  ]);

  if (!project) {
    notFound();
  }

  return (
    <ProjectDetail
      project={project}
      initialMilestones={milestones}
      initialEdit={query.edit === "true"}
    />
  );
}
