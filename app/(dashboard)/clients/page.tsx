import DashboardContainer from "@/components/dashboard/container";
import { ListEmpty, ListNoResults } from "@/components/dashboard/list-states";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { formatCurrency } from "@/lib/format-currency";
import { ClientList } from "./client-list";
import { ClientStatusFilter } from "./client-status-filter";
import { ClientsHeader } from "./clients-header";
import { getClientList } from "./queries";

type ClientsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const params = await searchParams;
  const list = await getClientList(params);
  const search = typeof params.search === "string" ? params.search : "";
  const { counts } = list;
  const filtered = Boolean(search || list.status);
  const isEmpty = counts.all === 0 && !filtered;

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
              actions={<ClientStatusFilter value={list.status} />}
              filters={[
                {
                  key: "view",
                  label: "Filter clients",
                  allCount: counts.all,
                  options: [
                    { value: "owes", label: "Owes you", count: counts.owes },
                    {
                      value: "active",
                      label: "Active work",
                      count: counts.active,
                    },
                    {
                      value: "idle",
                      label: "No active work",
                      count: counts.idle,
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
