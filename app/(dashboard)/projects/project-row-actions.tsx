"use client";

import { deleteProjectAction } from "@/app/(dashboard)/projects/actions";
import type { ProjectListItem } from "@/app/(dashboard)/projects/queries";
import { TableRowActions } from "@/components/data-table/table-row-actions";

type ProjectRowActionsProps = {
  project: Pick<ProjectListItem, "id" | "title">;
  className?: string;
};

export function ProjectRowActions({
  project,
  className,
}: ProjectRowActionsProps) {
  return (
    <TableRowActions
      entityName={project.title}
      detailHref={`/projects/${project.id}`}
      onDelete={() => deleteProjectAction(project.id)}
      deleteLoadingMessage="Deleting project..."
      deleteSuccessMessage="Project deleted."
      deleteTitle="Delete project"
      className={className}
    />
  );
}
