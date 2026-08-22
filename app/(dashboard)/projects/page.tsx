import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { CustomButton } from "@/components/ui/custom-button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import React from "react";
import { projectStatusConfig } from "./project-status-config";
import { getAllProjects } from "./queries";
import ProjectTable from "./projects-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";

type ProjectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Projects({ searchParams }: ProjectPageProps) {
  const params = await searchParams;

  const { projects, total, page, pageSize, totalPages } =
    await getAllProjects(params);

  return (
    <DashboardContainer>
      <PageHeader
        title="Projects"
        description="Track and manage all your client projects"
        actions={
          <CustomButton variant="primary">
            <Link href={"/projects/new"} className="flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Add Project
            </Link>
          </CustomButton>
        }
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects" },
        ]}
      />

      <div className="mt-6 flex flex-col gap-4">
        <DataTableToolbar
          searchPlaceholder="Search Projects..."
          filters={[
            {
              key: "status",
              label: "All Status",
              options: Object.entries(projectStatusConfig).map(
                ([value, config]) => ({
                  value,
                  label: config.label,
                }),
              ),
            },
          ]}
        />

        <ProjectTable data={projects} />

        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
        />
      </div>
    </DashboardContainer>
  );
}
