"use client";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table/data-table";
import { renderClientMobileCard } from "@/components/data-table/data-table-mobile";
import type { ClientRow } from "@/src/db/schema/clients";
import { clientColumns } from "./client-columns";

export function ClientsTable({
  data,
  toolbar,
  footer,
}: {
  data: ClientRow[];
  toolbar?: ReactNode;
  footer?: ReactNode;
}) {
  const router = useRouter();
  return (
    <DataTable
      data={data}
      columns={clientColumns}
      renderMobileCard={renderClientMobileCard}
      getRowId={(row) => row.id}
      getRowAriaLabel={(row) => `View ${row.name}`}
      onRowClick={(row) => router.push(`/clients/${row.id}`)}
      emptyMessage="No clients found."
      toolbar={toolbar}
      footer={footer}
    />
  );
}
