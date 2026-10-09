import DashboardContainer from "@/components/dashboard/container";
import { ProjectsHeader } from "./projects-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import {
  projectStatusConfig,
  type ProjectStatus,
} from "./project-status-config";
import { getAllProjects } from "./queries";
import ProjectTable from "./projects-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

type ProjectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Projects({ searchParams }: ProjectPageProps) {
  const params = await searchParams;

  const {
    projects,
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
    allCount,
  } = await getAllProjects(params);

  return (
    <>
      <ProjectsHeader />

      <DashboardContainer>
        <div className="flex flex-col gap-4">
          {/* No summary strip here on purpose: every figure a project list
              could show - total, in progress, completed, on hold - is already
              in the status filter chips directly below, and projects carry no
              money column to add anything the chips cannot. */}
          <ProjectTable
            data={projects}
            toolbar={
              <DataTableToolbar
                searchPlaceholder="Search projects..."
                filters={[
                  {
                    key: "status",
                    label: "Filter projects by status",
                    allCount,
                    options: (
                      Object.keys(projectStatusConfig) as ProjectStatus[]
                    ).map((status) => ({
                      value: status,
                      label: projectStatusConfig[status].label,
                      count: statusCounts[status],
                    })),
                  },
                ]}
              />
            }
            footer={
              <DataTablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
              />
            }
          />
        </div>
      </DashboardContainer>
    </>
  );
}
