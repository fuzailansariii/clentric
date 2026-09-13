"use client";

import { clientStatusConfig } from "@/app/(dashboard)/clients/client-status-config";
import { ClientRowActions } from "@/app/(dashboard)/clients/client-row-actions";
import type { ClientRow } from "@/src/db/schema/clients";
import { AvatarInitials } from "../ui/avatar-initials";
import { StatusBadge } from "../ui/status-badge";
import { MobileListRow } from "./row-parts";

// Mobile shows: name, company (email when there's no company), status.
// Phone and date added are left for the detail page — you open a client to
// call them, you don't pick one from a list by their number.
export function renderClientMobileCard(row: ClientRow) {
  const config = clientStatusConfig[row.status];

  return (
    <MobileListRow
      leading={
        <AvatarInitials
          name={row.name}
          variant="colored"
          shape="square"
          className="rounded-[10px]"
        />
      }
      title={row.name}
      subtitle={row.company ?? row.email ?? "No company"}
      trailing={
        <StatusBadge
          status={config.variant}
          variant="soft"
          size="sm"
          className={config.dim ? "opacity-60" : undefined}
        >
          {config.label}
        </StatusBadge>
      }
      actions={<ClientRowActions client={row} />}
    />
  );
}
