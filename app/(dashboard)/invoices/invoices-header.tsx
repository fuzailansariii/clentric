import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function InvoicesHeader({
  subtitle = "Track billing status and payments across all clients",
  showNew = true,
}: {
  subtitle?: string;
  /** Off on an empty list: its empty state already offers the button. */
  showNew?: boolean;
}) {
  return (
    <PageHeader
      title="Invoices"
      subtitle={subtitle}
      icon={<Receipt className="h-5 w-5" />}
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Invoices" },
      ]}
      mobileActions="inline"
      actions={
        showNew ? (
          <Link
            href="/invoices/new"
            className={customButtonClasses("primary", "md", "gap-1 text-xs")}
          >
            <Plus className="h-4 w-4" />
            New invoice
          </Link>
        ) : undefined
      }
    />
  );
}
