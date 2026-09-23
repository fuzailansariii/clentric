import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { CustomButton } from "@/components/ui/custom-button";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
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
      <PageHeader
        title="Projects"
        subtitle="Track and manage all your client projects"
        icon={<FolderKanbanIcon className="h-4 w-4" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects" },
        ]}
        mobileActions="inline"
        actions={
          <CustomButton variant="primary">
            <Link
              href="/projects/new"
              className="mx-auto flex items-center gap-1 text-xs"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Project</span>
            </Link>
          </CustomButton>
        }
      />

      <DashboardContainer>
        <div className="flex flex-col gap-4">
          {/* No summary strip here on purpose: every figure a project list
              could show — total, in progress, completed, on hold — is already
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
