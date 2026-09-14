import Link from "next/link";
import { ReceiptText } from "lucide-react";
import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";
import { CustomButton } from "@/components/ui/custom-button";

// Rendered when getInvoiceById() returns null — the invoice doesn't exist,
// was deleted, or belongs to someone else. Same shell as the real page
// (PageHeader + DashboardContainer) so a dead link doesn't look like it left
// the app.
export default function InvoiceNotFound() {
  return (
    <>
      <PageHeader
        title="Invoice not found"
        backHref="/invoices"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Invoices", href: "/invoices" },
          { label: "Not found" },
        ]}
      />
      <DashboardContainer>
        <div className="border-border flex flex-col items-center justify-center gap-3 rounded-xl border px-6 py-16 text-center">
          <ReceiptText className="text-muted-foreground h-8 w-8" />
          <p className="text-sm font-medium">
            This invoice doesn&apos;t exist, or you don&apos;t have access to
            it.
          </p>
          <p className="text-muted-foreground text-xs">
            It may have been deleted, or the link may be wrong.
          </p>
          <Link href="/invoices">
            <CustomButton variant="secondary" className="mt-2">
              Back to invoices
            </CustomButton>
          </Link>
        </div>
      </DashboardContainer>
    </>
  );
}
