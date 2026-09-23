import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { CustomButton } from "@/components/ui/custom-button";
import { StatsSummary } from "@/components/ui/stats-summary";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { getInvoicesByUserId } from "./queries";
import { formatCurrency } from "@/lib/format-currency";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import {
  invoiceStatusConfig,
  type InvoiceStatus,
} from "./invoice-status-config";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { InvoicesTable } from "./invoices-table";

type InvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;
  const {
    invoices,
    total,
    page,
    pageSize,
    totalPages,
    statusCounts,
    allCount,
    summary,
  } = await getInvoicesByUserId(params);

  return (
    <>
      <PageHeader
        title="Invoices"
        subtitle="Track billing status and payments across all clients"
        icon={<Receipt className="h-5 w-5" />}
        badge={
          <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
            {total}
          </span>
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

      <DashboardContainer>
        <div className="flex flex-col gap-4">
          {/* Totals come from the database across every matching invoice
              (search applied, status tab not) — not just the current page.
              Per-status counts are left to the filter chips below. */}
          <StatsSummary
            items={[
              {
                label: "Total Billed",
                value: formatCurrency(summary.total),
              },
              {
                label: "Paid",
                value: formatCurrency(summary.paid),
                valueColor: "text-emerald-600",
              },
              {
                label: "Outstanding",
                value: formatCurrency(summary.outstanding),
                valueColor: "text-blue-600",
              },
              {
                label: "Overdue",
                value: formatCurrency(summary.overdue),
                valueColor: "text-rose-500",
              },
            ]}
          />

          <InvoicesTable
            data={invoices}
            toolbar={
              <DataTableToolbar
                searchPlaceholder="Search invoices..."
                filters={[
                  {
                    key: "status",
                    label: "Filter invoices by status",
                    allCount,
                    options: (
                      Object.keys(invoiceStatusConfig) as InvoiceStatus[]
                    ).map((status) => ({
                      value: status,
                      label: invoiceStatusConfig[status].label,
                      count: statusCounts[status],
                    })),
                  },
                ]}
              />
            }
            footer={
              <DataTablePagination
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
              />
            }
          />
        </div>
      </DashboardContainer>
    </>
  );
}
