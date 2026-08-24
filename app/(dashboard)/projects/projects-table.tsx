"use client";
import React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { projectColumns } from "./projects-columns";
import { useRouter } from "next/navigation";
import { renderProjectMobileCard } from "./render-client-mobile-card";
import { ProjectListItem } from "./queries";
import { StatsCards } from "@/components/ui/stats-cards";

export default function ProjectTable({ data }: { data: ProjectListItem[] }) {
  const router = useRouter();
  return (
    <>
      <DataTable
        data={data}
        columns={projectColumns}
        renderMobileCard={renderProjectMobileCard}
        getRowId={(row) => row.id}
        getRowAriaLabel={(row) => `View ${row.title}`}
        onRowClick={(row) => router.push(`/projects/${row.id}`)}
      />
    </>
  );
}
