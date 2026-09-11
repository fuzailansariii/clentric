import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { CustomButton } from "@/components/ui/custom-button";
import { StatsCards } from "@/components/ui/stats-cards";
import { Plus, Receipt } from "lucide-react";
import Link from "next/link";
import { getInvoicesByUserId } from "./queries";
import { computeInvoiceStats } from "./invoice-stats";
import { formatCurrency } from "@/lib/format-currency";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { invoiceStatusConfig } from "./invoice-status-config";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { InvoicesTable } from "./invoices-table";

type InvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;
  const { invoices, total, page, pageSize, totalPages } =
    await getInvoicesByUserId(params);
  const stats = computeInvoiceStats(invoices);

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
          <StatsCards
            items={[
              {
                label: "Total Billed",
                value: formatCurrency(stats.total.toFixed(2)),
                hint: `${stats.totalCount} invoices`,
              },
              {
                label: "Paid",
                value: formatCurrency(stats.paid.toFixed(2)),
                hint: `${stats.paidCount} invoices`,
                valueColor: "text-emerald-600",
              },
              {
                label: "Outstanding",
                value: formatCurrency(stats.outstanding.toFixed(2)),
                hint: `${stats.outstandingCount} invoices`,
                valueColor: "text-blue-600",
              },
              {
                label: "Overdue",
                value: formatCurrency(stats.overdue.toFixed(2)),
                hint: `${stats.overdueCount} invoices`,
                valueColor: "text-rose-500",
              },
            ]}
          />

          <DataTableToolbar
            searchPlaceholder="Search invoices..."
            filters={[
              {
                key: "status",
                label: "Status",
                options: Object.entries(invoiceStatusConfig).map(
                  ([value, config]) => ({
                    label: config.label,
                    value,
                    dotColor: config.dotColor,
                  }),
                ),
              },
            ]}
          />

          <InvoicesTable data={invoices} />

          <DataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
          />
        </div>
      </DashboardContainer>
    </>
  );
}
