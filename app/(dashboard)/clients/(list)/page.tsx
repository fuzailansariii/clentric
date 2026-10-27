import DashboardContainer from "@/components/dashboard/container";
import { ListEmpty, ListNoResults } from "@/components/dashboard/list-states";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { formatCurrency } from "@/lib/format-currency";
import { ClientList } from "../client-list";
import { ClientsHeader } from "../clients-header";
import { getClientList } from "../queries";

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const EMPTY_VIEW = {
  owes: "No one owes you right now.",
  in_progress: "No client has work in progress right now.",
  quiet: "Every client has something open.",
  archived: "No archived clients. Archive one from its ⋯ menu to tidy your list.",
} as const;

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const list = await getClientList(params);
  const search = typeof params.search === "string" ? params.search : "";
  const { counts } = list;
  // Archived clients still count: the Archived tab must stay reachable.
  const isEmpty = counts.all + counts.archived === 0 && !search;

  return (
    <>
      <ClientsHeader
        showNew={!isEmpty}
        subtitle={
          isEmpty
            ? "Nothing here yet"
            : `${counts.all} client${counts.all === 1 ? "" : "s"} · ${formatCurrency(list.owesSum)} outstanding`
        }
      />

      <DashboardContainer>
        {isEmpty ? (
          <ListEmpty
            title="No clients yet"
            body="Add a client once and reuse them on every proposal and invoice."
            href="/clients/new"
            label="New client"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <DataTableToolbar
              searchPlaceholder="Search clients..."
              filters={[
                {
                  key: "view",
                  label: "Filter clients",
                  allCount: counts.all,
                  options: [
                    { value: "owes", label: "Owes you", count: counts.owes },
                    {
                      value: "in_progress",
                      label: "In progress",
                      count: counts.in_progress,
                    },
                    { value: "quiet", label: "Quiet", count: counts.quiet },
                    {
                      value: "archived",
                      label: "Archived",
                      count: counts.archived,
                    },
                  ],
                },
              ]}
            />

            {list.clients.length === 0 ? (
              <ListNoResults
                noun="clients"
                search={search}
                clearHref="/clients"
                emptyView={list.view ? EMPTY_VIEW[list.view] : undefined}
              />
            ) : (
              <ClientList clients={list.clients} groups={list.groups} />
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
