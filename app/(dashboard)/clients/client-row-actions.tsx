"use client";

import type { ClientRow } from "@/src/db/schema/clients";
import { deleteClientAction } from "@/app/(dashboard)/clients/actions";
import { TableRowActions } from "@/components/data-table/table-row-actions";

type ClientRowActionsProps = {
  client: Pick<ClientRow, "id" | "name">;
  className?: string;
};

export function ClientRowActions({ client, className }: ClientRowActionsProps) {
  return (
    <TableRowActions
      entityName={client.name}
      detailHref={`/clients/${client.id}`}
      onDelete={() => deleteClientAction(client.id)}
      deleteLoadingMessage="Deleting client..."
      deleteSuccessMessage="Client deleted."
      deleteTitle="Delete client"
      className={className}
    />
  );
}
