import Link from "next/link";
import DashboardContainer from "@/components/dashboard/container";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { ProjectsHeader } from "./projects-header";
import { ProjectCard } from "./project-card";
import { getProjectBoard } from "./queries";

type ProjectPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Projects({ searchParams }: ProjectPageProps) {
  const params = await searchParams;
  const board = await getProjectBoard(params);
  const searching = typeof params.search === "string" && params.search !== "";

  const subtitle = board.tabCounts.all
    ? `${board.tabCounts.active} active · ${board.readyCount} ready to invoice`
    : "Track and manage all your client projects";

  return (
    <>
      <ProjectsHeader subtitle={subtitle} />

      <DashboardContainer>
        <div className="flex flex-col gap-5">
          {board.tabCounts.all === 0 && !searching ? (
            <div className="bg-card rounded-lg border shadow-xs">
              <div className="flex max-w-130 flex-col items-start gap-2.5 px-6 py-12">
                <h2 className="text-base font-semibold">No projects yet</h2>
                <p className="text-muted-foreground text-sm text-pretty">
                  Projects appear here when a client accepts a proposal, or you
                  can start one yourself and break it into milestones.
                </p>
                <Link
                  href="/projects/new"
                  className="bg-primary text-primary-foreground mt-1.5 inline-flex h-9 items-center rounded-lg px-3.5 text-sm font-medium hover:opacity-90"
                >
                  Add Project
                </Link>
              </div>
            </div>
          ) : (
            <>
              <DataTableToolbar
                searchPlaceholder="Search projects..."
                filters={[
                  {
                    key: "view",
                    label: "Filter projects",
                    allCount: board.tabCounts.all,
                    options: [
                      {
                        value: "active",
                        label: "Active",
                        count: board.tabCounts.active,
                      },
                      {
                        value: "completed",
                        label: "Completed",
                        count: board.tabCounts.completed,
                      },
                    ],
                  },
                ]}
              />

              {board.cards.length === 0 ? (
                <div className="bg-card text-muted-foreground rounded-lg border px-5 py-7 text-sm shadow-xs">
                  {searching
                    ? `No projects match "${params.search}".`
                    : "No projects in this view."}
                </div>
              ) : (
                // Columns follow the space the cards get, not the window: the sidebar takes real width.
                <div className="@container">
                  <div className="grid grid-cols-1 gap-4 @[540px]:grid-cols-2 @[1020px]:grid-cols-3">
                    {board.cards.map((project) => (
                      <ProjectCard key={project.id} project={project} />
                    ))}
                  </div>
                </div>
              )}

              {board.totalPages > 1 && (
                <DataTablePagination
                  page={board.page}
                  pageSize={board.pageSize}
                  total={board.total}
                  totalPages={board.totalPages}
                />
              )}
            </>
          )}
        </div>
      </DashboardContainer>
    </>
  );
}
