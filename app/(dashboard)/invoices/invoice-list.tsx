"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  BellIcon,
  CheckCheckIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  SendIcon,
} from "lucide-react";

import {
  LedgerCell,
  LedgerTable,
  type LedgerColumn,
  type LedgerGroup,
} from "@/components/dashboard/ledger-table";
import { RowIconAction } from "@/components/dashboard/row-icon-action";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { invoiceSendDescription } from "@/lib/send-confirm";
import { DeleteDialog } from "@/components/delete-dialog";
import { CustomButton } from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/ui/status-badge";
import { useUndoableAction } from "@/hooks/use-undoable-action";
import { warnNotEmailed } from "@/lib/email/warn-not-emailed";
import { formatCurrency } from "@/lib/format-currency";
import { formatDayValue } from "@/lib/format-due";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { REMINDER_SEND_DELAY_MS } from "@/lib/reminder-send-delay";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import { UPGRADE_HREF } from "@/components/dashboard/plan-limit-page";
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  sendInvoiceAction,
  sendReminderAction,
} from "./actions";
import { invoiceNote, invoiceStateConfig } from "./invoice-state";
import type { InvoiceListRow } from "./queries";

const number = (invoice: InvoiceListRow) =>
  formatInvoiceNumber(invoice.invoiceNumber, invoice.numberPrefix);

const COLUMNS: LedgerColumn<InvoiceListRow>[] = [
  {
    key: "number",
    header: "Number",
    cell: (invoice) => (
      <LedgerCell
        main={number(invoice)}
        mainClassName="font-mono text-[13px]"
      />
    ),
  },
  {
    key: "client",
    header: "Client",
    fill: true,
    phone: "title",
    cell: (invoice) => (
      <LedgerCell
        main={invoice.clientName ?? "No client"}
        mainClassName="font-medium"
        sub={
          <>
            {/* The number has no column on phone, so it leads this line. */}
            <span className="font-mono @[700px]:hidden">
              {number(invoice)} ·{" "}
            </span>
            {invoice.projectTitle ?? "No project"}
          </>
        }
      />
    ),
  },
  {
    key: "issued",
    header: "Issued",
    show: "lg",
    cell: (invoice) => (
      <LedgerCell
        main={
          invoice.status === "draft" ? "-" : formatDayValue(invoice.issueDate)
        }
        mainClassName="text-[13px]"
      />
    ),
  },
  {
    key: "due",
    header: "Due",
    maxWidth: "13rem",
    phone: "detail",
    cell: (invoice) => (
      <LedgerCell
        main={formatDayValue(invoice.dueDate)}
        mainClassName="text-[13px]"
        sub={invoiceNote(invoice.state, invoice)}
        subClassName={cn(invoice.state === "overdue" && "text-danger-600")}
      />
    ),
  },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    phone: "money",
    cell: (invoice) => (
      <LedgerCell
        main={formatCurrency(invoice.total, invoice.currency)}
        mainClassName="font-space font-medium tabular-nums"
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    phone: "status",
    cell: (invoice) => {
      const config = invoiceStateConfig[invoice.state];
      return (
        <StatusBadge status={config.tone} variant="soft">
          {config.label}
        </StatusBadge>
      );
    },
  },
];

export const PDF_NEEDS_PRO = "Downloading PDFs is part of Pro";

export function InvoiceList({
  invoices,
  groups,
  canDownloadPdf,
}: {
  invoices: InvoiceListRow[];
  groups: LedgerGroup[];
  canDownloadPdf: boolean;
}) {
  return (
    <LedgerTable
      rows={invoices}
      columns={COLUMNS}
      groups={groups}
      getGroup={(invoice) => invoice.state}
      getAccent={(invoice) =>
        invoice.state === "overdue"
          ? "danger"
          : invoice.state === "claimed"
            ? "warning"
            : null
      }
      getKey={(invoice) => invoice.id}
      getHref={(invoice) => `/invoices/${invoice.id}`}
      getLabel={(invoice) => `Open ${number(invoice)}`}
      actions={(invoice) => (
        <InvoiceRowActions invoice={invoice} canDownloadPdf={canDownloadPdf} />
      )}
    />
  );
}

function InvoiceRowActions({
  invoice,
  canDownloadPdf,
}: {
  invoice: InvoiceListRow;
  canDownloadPdf: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // Mounted on first open only: most rows are never deleted.
  const [hasOpenedDelete, setHasOpenedDelete] = useState(false);
  const no = number(invoice);
  const state = invoice.state;
  const pdfHref = `/api/invoices/${invoice.id}/pdf`;
  const outstanding =
    state === "pending" || state === "overdue" || state === "claimed";
  const sendReason = !invoice.sendReady
    ? "Add a description and an amount first"
    : !invoice.clientHasEmail
      ? "Add an email address to this client first"
      : null;

  const { trigger: sendReminder, isQueued } = useUndoableAction(
    () => sendReminderAction(invoice.id),
    {
      queued: "Reminder will be sent shortly.",
      loading: "Sending reminder...",
      success: "Reminder sent.",
    },
    REMINDER_SEND_DELAY_MS,
    { onSuccess: () => router.refresh() },
  );

  // An email can't be recalled, so Send asks first and names the recipient.
  const [confirmSend, setConfirmSend] = useState(false);
  const send = () => setConfirmSend(true);
  const sendNow = () =>
    runActionWithToast(sendInvoiceAction(invoice.id), {
      loading: "Sending invoice...",
      success: ({ emailError }) =>
        emailError ? `${no} marked as sent` : `${no} emailed`,
      onSuccess: ({ emailError }) => {
        warnNotEmailed(emailError, "invoice");
        router.refresh();
      },
    });

  const markPaid = () =>
    startTransition(async () => {
      await runActionWithToast(markInvoicePaidAction(invoice.id), {
        loading: "Marking as paid...",
        success: `${no} marked as paid`,
        onSuccess: () => router.refresh(),
      });
    });

  const busy = isPending || isQueued;
  const working = busy ? "Working..." : null;

  // One icon per row: the next step, or the PDF when nothing waits on you.
  let next: ReactNode;
  if (state === "draft") {
    next = (
      <RowIconAction
        icon={SendIcon}
        label="Send"
        ariaLabel={`Send ${no}`}
        onClick={send}
        disabledReason={working ?? sendReason}
        tone="attention"
      />
    );
  } else if (state === "overdue") {
    next = (
      <RowIconAction
        icon={BellIcon}
        label="Send reminder"
        ariaLabel={`Send a reminder for ${no}`}
        onClick={sendReminder}
        disabledReason={working}
        tone="attention"
      />
    );
  } else if (state === "claimed") {
    next = (
      <RowIconAction
        icon={CheckCheckIcon}
        label="Confirm received"
        ariaLabel={`Confirm payment received for ${no}`}
        onClick={markPaid}
        disabledReason={working}
        tone="attention"
      />
    );
  } else {
    next = (
      <RowIconAction
        icon={DownloadIcon}
        label="Download PDF"
        ariaLabel={`Download ${no} PDF`}
        href={pdfHref}
        download
        disabledReason={canDownloadPdf ? null : PDF_NEEDS_PRO}
      />
    );
  }

  return (
    <>
      {next}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`More actions for ${no}`}
            disabled={busy}
            className="w-8 px-0!"
          >
            <MoreHorizontalIcon className="size-4" />
          </CustomButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {state === "draft" && (
            <DropdownMenuItem onClick={send} disabled={Boolean(sendReason)}>
              Send
            </DropdownMenuItem>
          )}
          {state === "claimed" && (
            <DropdownMenuItem onClick={markPaid}>
              Confirm received
            </DropdownMenuItem>
          )}
          {outstanding && (
            <DropdownMenuItem onClick={sendReminder}>
              Send reminder
            </DropdownMenuItem>
          )}
          {(state === "pending" || state === "overdue") && (
            <DropdownMenuItem onClick={markPaid}>Mark as paid</DropdownMenuItem>
          )}
          {state !== "paid" && (
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            {canDownloadPdf ? (
              <a href={pdfHref} download>
                Download PDF
              </a>
            ) : (
              <Link href={UPGRADE_HREF}>Download PDF (Pro)</Link>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setHasOpenedDelete(true);
              setIsDeleteOpen(true);
            }}
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmSend}
        onOpenChange={setConfirmSend}
        title={`Send ${no}?`}
        description={invoiceSendDescription(invoice.clientEmail, invoice.clientName)}
        confirmLabel="Send invoice"
        pendingLabel="Sending..."
        onConfirm={sendNow}
      />

      {hasOpenedDelete && (
        <DeleteDialog
          title={`Delete ${no}?`}
          description="The invoice is removed for good. Milestones it billed go back to not invoiced."
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onDelete={async () => {
            await runActionWithToast(deleteInvoiceAction(invoice.id), {
              loading: "Deleting invoice...",
              success: `${no} deleted`,
              onSuccess: () => router.refresh(),
            });
          }}
        />
      )}
    </>
  );
}
