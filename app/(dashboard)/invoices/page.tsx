import DashboardContainer from "@/components/dashboard/container";
import { InvoicesHeader } from "./invoices-header";
import { StatsSummary } from "@/components/ui/stats-summary";
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
      <InvoicesHeader total={total} />

      <DashboardContainer>
        <div className="flex flex-col gap-4">
          {/* Totals come from the database across every matching invoice
              (search applied, status tab not) - not just the current page.
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
