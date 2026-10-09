import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function ClientsHeader({ total }: { total?: number }) {
  return (
    <PageHeader
      title="Clients"
      subtitle="Manage your clients"
      icon={<UsersIcon className="h-5 w-5" />}
      badge={
        total !== undefined && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {total}
          </span>
        )
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clients" },
      ]}
      mobileActions="inline"
      actions={
        <CustomButton variant="primary">
          <Link
            href="/clients/new"
            className="mx-auto flex items-center gap-1 text-xs"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Client</span>
          </Link>
        </CustomButton>
      }
    />
  );
}
