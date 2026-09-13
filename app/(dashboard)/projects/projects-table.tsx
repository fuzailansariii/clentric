"use client";
import type { ReactNode } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { projectColumns } from "./projects-columns";
import { useRouter } from "next/navigation";
import { renderProjectMobileCard } from "./render-client-mobile-card";
import { ProjectListItem } from "./queries";

export default function ProjectTable({
  data,
  toolbar,
  footer,
  className,
}: {
  data: ProjectListItem[];
  toolbar?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <DataTable
      data={data}
      columns={projectColumns}
      renderMobileCard={renderProjectMobileCard}
      getRowId={(row) => row.id}
      getRowAriaLabel={(row) => `View ${row.title}`}
      onRowClick={(row) => router.push(`/projects/${row.id}`)}
      emptyMessage="No projects found."
      toolbar={toolbar}
      footer={footer}
      className={className}
    />
  );
}
