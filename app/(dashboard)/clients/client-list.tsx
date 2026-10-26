"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MailIcon, MoreHorizontalIcon } from "lucide-react";

import {
  LedgerCell,
  LedgerTable,
  type LedgerColumn,
  type LedgerGroup,
} from "@/components/dashboard/ledger-table";
import { RowIconAction } from "@/components/dashboard/row-icon-action";
import { DeleteDialog } from "@/components/delete-dialog";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { CustomButton } from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/format-currency";
import { formatShortDate } from "@/lib/format-due";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import { deleteClientAction } from "./actions";
import { setClientArchived } from "./archive-client";
import { clientActivity, clientStateConfig } from "./client-state";
import type { ClientListRow } from "./queries";

const COLUMNS: LedgerColumn<ClientListRow>[] = [
  {
    key: "client",
    header: "Client",
    fill: true,
    phone: "title",
    cell: (c) => (
      <span className="flex min-w-0 items-center gap-2.5">
        <AvatarInitials
          name={c.name}
          size="sm"
          shape="square"
          className="shrink-0"
        />
        <span className="min-w-0">
          <LedgerCell
            main={c.name}
            mainClassName="font-medium"
            sub={[c.company, c.email || "No email"].filter(Boolean).join(" · ")}
          />
        </span>
      </span>
    ),
  },
  {
    key: "activity",
    header: "Activity",
    maxWidth: "14rem",
    phone: "detail",
    cell: (c) => (
      <LedgerCell
        main={clientActivity(c.state, c)}
        mainClassName={cn(
          "text-[13px]",
          c.state === "overdue"
            ? "text-danger-600"
            : (c.state === "new" ||
                c.state === "quiet" ||
                c.state === "archived") &&
                "text-muted-foreground",
        )}
      />
    ),
  },
  {
    key: "phone",
    header: "Phone",
    show: "xl",
    cell: (c) => (
      <LedgerCell
        main={c.phone || "-"}
        mainClassName="text-muted-foreground text-[13px]"
      />
    ),
  },
  {
    key: "added",
    header: "Added",
    show: "xl",
    cell: (c) => (
      <LedgerCell
        main={formatShortDate(c.createdAt)}
        mainClassName="text-muted-foreground text-[13px]"
      />
    ),
  },
  {
    key: "lifetime",
    header: "Lifetime billed",
    align: "right",
    show: "lg",
    cell: (c) => (
      <LedgerCell
        main={formatCurrency(c.lifetime)}
        mainClassName="font-space tabular-nums"
      />
    ),
  },
  {
    key: "owes",
    header: "Outstanding",
    align: "right",
    phone: "money",
    cell: (c) => (
      <LedgerCell
        main={formatCurrency(c.owes)}
        mainClassName={cn(
          "font-space font-medium tabular-nums",
          c.overdueInvoices
            ? "text-danger-600"
            : Number(c.owes)
              ? "text-foreground"
              : "text-muted-foreground",
        )}
        sub={
          c.overdueInvoices ? (
            "Overdue"
          ) : (
            // "Settled" only once something was billed; never-billed shows nothing.
            <span className="@[700px]:hidden">
              {Number(c.owes)
                ? "Owes you"
                : Number(c.lifetime)
                  ? "Settled"
                  : null}
            </span>
          )
        }
        subClassName={cn(c.overdueInvoices > 0 && "text-danger-600")}
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    phone: "status",
    cell: (c) => {
      const config = clientStateConfig[c.state];
      return (
        <StatusBadge status={config.tone} variant="soft">
          {config.label}
        </StatusBadge>
      );
    },
  },
];

export function ClientList({
  clients,
  groups,
}: {
  clients: ClientListRow[];
  groups: LedgerGroup[];
}) {
  return (
    <LedgerTable
      rows={clients}
      columns={COLUMNS}
      groups={groups}
      getGroup={(c) => c.state}
      getAccent={(c) => (c.state === "overdue" ? "danger" : null)}
      getKey={(c) => c.id}
      getHref={(c) => `/clients/${c.id}`}
      getLabel={(c) => `Open ${c.name}`}
      actions={(c) => <ClientRowActions client={c} />}
    />
  );
}

function ClientRowActions({ client }: { client: ClientListRow }) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [hasOpenedDelete, setHasOpenedDelete] = useState(false);

  return (
    <>
      <RowIconAction
        icon={MailIcon}
        label="Email"
        ariaLabel={`Email ${client.name}`}
        href={client.email ? `mailto:${client.email}` : undefined}
        disabledReason={client.email ? null : "No email on file"}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`More actions for ${client.name}`}
            className="w-8 px-0!"
          >
            <MoreHorizontalIcon className="size-4" />
          </CustomButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem asChild>
            <Link href={`/invoices/new?clientId=${client.id}`}>
              New invoice
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/proposals/new?clientId=${client.id}`}>
              New proposal
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/clients/${client.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              void setClientArchived(client, client.state !== "archived")
            }
          >
            {client.state === "archived" ? "Restore client" : "Archive client"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setHasOpenedDelete(true);
              setIsDeleteOpen(true);
            }}
          >
            Delete client
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {hasOpenedDelete && (
        <DeleteDialog
          title={`Delete ${client.name}?`}
          description="Finished work stays. A client with open projects, unpaid invoices or live proposals can't be deleted."
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onDelete={async () => {
            await runActionWithToast(deleteClientAction(client.id), {
              loading: "Deleting client...",
              success: `${client.name} deleted`,
              onSuccess: () => router.refresh(),
            });
          }}
        />
      )}
    </>
  );
}
