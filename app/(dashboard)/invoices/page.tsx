import DashboardContainer from "@/components/dashboard/container";
import { ListEmpty, ListNoResults } from "@/components/dashboard/list-states";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { MetricStrip } from "@/components/ui/metric-strip";
import { formatCurrency } from "@/lib/format-currency";
import { InvoiceList } from "./invoice-list";
import { InvoicesHeader } from "./invoices-header";
import { getInvoiceList } from "./queries";
import { getPlanFeatures } from "@/lib/billing";
import { requireUser } from "@/lib/current-user";

type InvoicesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;
  const user = await requireUser();
  const [list, features] = await Promise.all([
    getInvoiceList(params),
    getPlanFeatures(user.id),
  ]);
  const search = typeof params.search === "string" ? params.search : "";
  const { strip, counts } = list;
  const isEmpty = counts.all === 0 && !search;

  return (
    <>
      <InvoicesHeader
        showNew={!isEmpty}
        subtitle={
          isEmpty
            ? "Nothing here yet"
            : `${plural(counts.all, "invoice")} · USD`
        }
      />

      <DashboardContainer>
        {isEmpty ? (
          <ListEmpty
            title="No invoices yet"
            body="Send your first invoice in USD. It's emailed with a PDF, and you'll see when it's paid or overdue."
            href="/invoices/new"
            label="New invoice"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <MetricStrip
              items={[
                {
                  label: "Outstanding",
                  value: formatCurrency(strip.open.sum),
                  sub: plural(strip.open.count, "invoice"),
                },
                {
                  label: "Overdue",
                  value: formatCurrency(strip.overdue.sum),
                  sub: strip.overdue.count
                    ? plural(strip.overdue.count, "invoice")
                    : "Nothing late",
                  tone: strip.overdue.count ? "danger" : "default",
                },
                {
                  label: "Paid this month",
                  value: formatCurrency(strip.paidMonth.sum),
                  sub: plural(strip.paidMonth.count, "invoice"),
                },
                {
                  label: "Drafts",
                  value: formatCurrency(strip.draft.sum),
                  sub: strip.draft.count
                    ? `${strip.draft.count} not sent`
                    : "None",
                },
              ]}
            />

            <DataTableToolbar
              searchPlaceholder="Search invoices..."
              filters={[
                {
                  key: "view",
                  label: "Filter invoices",
                  allCount: counts.all,
                  options: [
                    { value: "draft", label: "Drafts", count: counts.draft },
                    { value: "open", label: "Outstanding", count: counts.open },
                    {
                      value: "overdue",
                      label: "Overdue",
                      count: counts.overdue,
                    },
                    { value: "paid", label: "Paid", count: counts.paid },
                  ],
                },
              ]}
            />

            {list.invoices.length === 0 ? (
              <ListNoResults
                noun="invoices"
                search={search}
                clearHref="/invoices"
              />
            ) : (
              <InvoiceList
                invoices={list.invoices}
                groups={list.groups}
                canDownloadPdf={features.pdfDownload}
              />
            )}

            <DataTablePagination
              page={list.page}
              pageSize={list.pageSize}
              total={list.total}
              totalPages={list.totalPages}
            />
          </div>
        )}
      </DashboardContainer>
    </>
  );
}
