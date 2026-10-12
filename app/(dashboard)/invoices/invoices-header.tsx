import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import PageHeader from "@/components/dashboard/page-header";

/** Shared by the page and its loading screen, so the header never jumps. */
export function InvoicesHeader({ total }: { total?: number }) {
  return (
    <PageHeader
      title="Invoices"
      subtitle="Track billing status and payments across all clients"
      icon={<Receipt className="h-5 w-5" />}
      badge={
        total !== undefined && (
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {total}
          </span>
        )
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Invoices" },
      ]}
      mobileActions="inline"
      actions={
        <Link href={"/invoices/new"}>
          <CustomButton className="mx-auto flex items-center gap-1 text-xs">
            <Plus className="h-4 w-4" />
            <span>Create Invoice</span>
          </CustomButton>
        </Link>
      }
    />
  );
}
