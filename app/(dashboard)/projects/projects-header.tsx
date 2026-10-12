import Link from "next/link";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function ProjectsHeader() {
  return (
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
  );
}
