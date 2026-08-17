"use client";
import { DataTable } from "@/components/data-table/data-table";
import { clientColumns } from "./client-columns";
import { useRouter } from "next/navigation";
import { renderClientMobileCard } from "@/components/data-table/data-table-mobile";
import type { ClientRow } from "@/src/db/schema/clients";

export function ClientsTable({ data }: { data: ClientRow[] }) {
  const router = useRouter();
  return (
    <DataTable
      data={data}
      columns={clientColumns}
      renderMobileCard={renderClientMobileCard}
      getRowId={(row) => row.id}
      getRowAriaLabel={(row) => `View ${row.name}`}
      onRowClick={(row) => router.push(`/clients/${row.id}`)}
    />
  );
}
