import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function ProposalsHeader({
  subtitle = "Send quotes and track what clients accept or decline",
  showNew = true,
}: {
  subtitle?: string;
  /** Off on an empty list: its empty state already offers the button. */
  showNew?: boolean;
}) {
  return (
    <PageHeader
      title="Proposals"
      subtitle={subtitle}
      icon={<FileSignature className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Proposals" },
      ]}
      // Phones create from the top bar's + button.
      mobileActions="none"
      actions={
        showNew ? (
          <Link
            href="/proposals/new"
            className={customButtonClasses("primary", "md", "gap-1 text-xs")}
          >
            <Plus className="h-4 w-4" />
            New proposal
          </Link>
        ) : undefined
      }
    />
  );
}
