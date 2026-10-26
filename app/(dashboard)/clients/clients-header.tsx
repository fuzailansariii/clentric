import Link from "next/link";
import { PlusIcon, UsersIcon } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function ClientsHeader({
  subtitle = "Manage your clients",
  showNew = true,
}: {
  subtitle?: string;
  /** Off on an empty list: its empty state already offers the button. */
  showNew?: boolean;
}) {
  return (
    <PageHeader
      title="Clients"
      subtitle={subtitle}
      icon={<UsersIcon className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Clients" },
      ]}
      // Phones create from the top bar's + button.
      mobileActions="none"
      actions={
        showNew ? (
          <Link
            href="/clients/new"
            className={customButtonClasses("primary", "md", "gap-1 text-xs")}
          >
            <PlusIcon className="h-4 w-4" />
            New client
          </Link>
        ) : undefined
      }
    />
  );
}
