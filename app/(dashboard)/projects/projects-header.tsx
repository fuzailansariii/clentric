import Link from "next/link";
import { FolderKanbanIcon, PlusIcon } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function ProjectsHeader({
  subtitle = "Track and manage all your client projects",
  showNew = true,
}: {
  subtitle?: string;
  /** Off on an empty list: its empty state already offers the button. */
  showNew?: boolean;
}) {
  return (
    <PageHeader
      title="Projects"
      subtitle={subtitle}
      icon={<FolderKanbanIcon className="h-4 w-4" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Projects" },
      ]}
      mobileActions="inline"
      actions={
        showNew ? (
          <Link
            href="/projects/new"
            className={customButtonClasses("primary", "md", "gap-1 text-xs")}
          >
            <PlusIcon className="h-4 w-4" />
            New project
          </Link>
        ) : undefined
      }
    />
  );
}
