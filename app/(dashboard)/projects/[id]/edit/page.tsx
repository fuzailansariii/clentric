import { notFound } from "next/navigation";
import { getMilestonesByProjectId, getProjectById } from "../../queries";
import { ProjectForm } from "../../project-form";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, milestones] = await Promise.all([
    getProjectById(id),
    getMilestonesByProjectId(id),
  ]);

  if (!project) notFound();

  return (
    <ProjectForm
      clients={[]}
      project={{
        id: project.id,
        title: project.title,
        clientName: project.clientName,
        values: {
          clientId: project.clientId,
          title: project.title,
          description: project.description ?? "",
          pricing: project.pricing,
          // An hourly project without an estimate shows an empty field, not 0.00.
          budget:
            project.pricing === "hourly" && Number(project.budget) === 0
              ? ""
              : project.budget,
          hourlyRate: project.hourlyRate ?? "",
          billing: project.billing,
          startDate: project.startDate ?? "",
          deadline: project.deadline ?? "",
          status: project.status,
          milestones: milestones.map((m) => ({
            id: m.id,
            title: m.title,
            dueDate: m.dueDate ?? "",
            amount: m.amount ?? "",
          })),
        },
      }}
    />
  );
}
