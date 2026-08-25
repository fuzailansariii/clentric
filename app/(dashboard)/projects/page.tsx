import React from "react";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { CustomButton } from "@/components/ui/custom-button";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { projectStatusConfig } from "./project-status-config";
import { getAllProjects } from "./queries";
import ProjectTable from "./projects-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { StatsCards } from "@/components/ui/stats-cards";

type ProjectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Projects({ searchParams }: ProjectPageProps) {
  const params = await searchParams;

  const { projects, total, page, pageSize, totalPages } =
    await getAllProjects(params);

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle="Track and manage all your client projects"
        icon={<FolderKanbanIcon className="h-4 w-4" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects" },
        ]}
        actions={
          <CustomButton variant="primary">
            <Link href="/projects/new" className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              <span>Add Project</span>
            </Link>
          </CustomButton>
        }
      />

      <DashboardContainer>
        <div className="flex flex-col gap-4">
          <StatsCards
            items={[
              {
                label: "Total",
                value: projects.length,
                hint: "All Projects",
              },
              {
                label: "In Progress",
                value: projects.filter((item) => item.status === "in_progress")
                  .length,
                hint: "Active Now",
              },
              {
                label: "Completed",
                value: projects.filter((item) => item.status === "completed")
                  .length,
                hint: "Delivered",
              },
              {
                label: "On Hold",
                value: projects.filter((item) => item.status === "on_hold")
                  .length,
                hint: "Paused",
              },
            ]}
          />
          <div className="border-border flex flex-col rounded-xl border">
            <DataTableToolbar
              className="p-3"
              searchPlaceholder="Search projects..."
              filters={[
                {
                  key: "status",
                  label: "Status",
                  options: Object.entries(projectStatusConfig).map(
                    ([value, config]) => ({
                      label: config.label,
                      value,
                      dotColor: config.dotColor,
                    }),
                  ),
                },
              ]}
            />

            <ProjectTable data={projects} />

            <DataTablePagination
              className="border-none"
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
            />
          </div>
        </div>
      </DashboardContainer>
    </>
  );
}
