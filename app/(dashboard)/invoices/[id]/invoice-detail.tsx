"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellIcon, SendIcon } from "lucide-react";
import PageHeader from "@/components/dashboard/page-header";
import DashboardContainer from "@/components/dashboard/container";
import { CustomButton } from "@/components/ui/custom-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { DeleteDialog } from "@/components/delete-dialog";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { getDisplayStatus } from "@/lib/get-invoice-display-status";
import { isReminderOnCooldown } from "@/lib/is-reminder-on-cooldown";
import { useWithinWindow } from "@/hooks/use-within-window";
import { useUndoableAction } from "@/hooks/use-undoable-action";
import { UNDO_SEND_WINDOW_MS } from "@/lib/is-within-undo-send-window";
import { REMINDER_SEND_DELAY_MS } from "@/lib/reminder-send-delay";
import { invoiceStatusConfig } from "../invoice-status-config";
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  sendInvoiceAction,
  sendReminderAction,
  updateInvoiceStatusAction,
} from "../actions";
import { InvoiceActionsDropdown } from "../invoice-actions-dropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActionResult } from "@/lib/action-result";
import type { ClientRow } from "@/src/db/schema/clients";
import type { invoices } from "@/src/db/schema/invoices";
import type { invoiceItems } from "@/src/db/schema/invoice-items";
import type { ProjectListItem } from "../../projects/queries";

type InvoiceRow = typeof invoices.$inferSelect;
type InvoiceItemRow = typeof invoiceItems.$inferSelect;

type InvoiceDetailProps = {
  invoice: InvoiceRow & { lineItems: InvoiceItemRow[] };
  client: ClientRow | null;
  project: ProjectListItem | null;
};

export function InvoiceDetail({ invoice, client, project }: InvoiceDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const displayStatus = getDisplayStatus(invoice);
  const statusInfo = invoiceStatusConfig[displayStatus];

  const isDraft = invoice.status === "draft";
  // sent or overdue — same set the row actions treat as "outstanding".
  const isOutstanding = invoice.status === "sent" || displayStatus === "overdue";
  // Paid invoices are a closed record — editing is disabled, only Delete stays.
  const isPaid = invoice.status === "paid";
  const reminderOnCooldown = isReminderOnCooldown(invoice.lastReminderSentAt);
  const canUndoSend = useWithinWindow(invoice.sentAt, UNDO_SEND_WINDOW_MS);

  const run = (
    action: () => Promise<ActionResult>,
    messages: { loading: string; success: string },
  ) =>
    startTransition(async () => {
      await runActionWithToast(action(), {
        loading: messages.loading,
        success: messages.success,
        onSuccess: () => router.refresh(),
      });
    });

  // A reminder email can't be un-sent — give people a few seconds to catch a
  // mis-click before it actually goes out (same idea as Gmail's undo send).
  const { trigger: sendReminder, isQueued: isReminderQueued } =
    useUndoableAction(
      () => sendReminderAction(invoice.id),
      {
        queued: "Reminder will be sent shortly.",
        loading: "Sending reminder...",
        success: "Reminder sent.",
      },
      REMINDER_SEND_DELAY_MS,
      // Refresh so lastReminderSentAt updates and the button stays disabled
      // for the cooldown instead of re-enabling after the send.
      { onSuccess: () => router.refresh() },
    );

  return (
    <>
      <PageHeader
        title={`Invoice ${formatInvoiceNumber(invoice.invoiceNumber)}`}
        subtitle={client?.name ?? "Client"}
        badge={
          <StatusBadge
            status={statusInfo.variant}
            className={statusInfo.dim ? "opacity-60" : undefined}
          >
            {statusInfo.label}
          </StatusBadge>
        }
        backHref="/invoices"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Invoices", href: "/invoices" },
          { label: formatInvoiceNumber(invoice.invoiceNumber) },
        ]}
        actions={
          <>
            {/* Same grouping as the invoices list: one contextual action
                stays a one-click button, everything else — edit, undo send,
                mark as paid, delete — lives in the shared "more" dropdown. */}
            {isDraft && (
              <CustomButton
                variant="primary"
                disabled={isPending}
                className="flex items-center gap-1"
                onClick={() =>
                  run(() => sendInvoiceAction(invoice.id), {
                    loading: "Sending invoice...",
                    success: "Invoice sent.",
                  })
                }
              >
                <SendIcon className="h-3.5 w-3.5" /> Send Invoice
              </CustomButton>
            )}

            {isOutstanding &&
              (() => {
                const reminderButton = (
                  <CustomButton
                    variant="secondary"
                    disabled={
                      isPending || reminderOnCooldown || isReminderQueued
                    }
                    className="flex items-center gap-1"
                    onClick={sendReminder}
                  >
                    <BellIcon className="h-3.5 w-3.5" /> Send Reminder
                  </CustomButton>
                );

                // Only worth a tooltip when there's a reason to explain —
                // the label already says what a plain click does.
                const reason = reminderOnCooldown
                  ? "Reminder already sent today"
                  : isReminderQueued
                    ? "Reminder queued — click the toast to undo"
                    : null;

                if (!reason) return reminderButton;

                return (
                  <Tooltip>
                    <TooltipTrigger asChild>{reminderButton}</TooltipTrigger>
                    <TooltipContent>{reason}</TooltipContent>
                  </Tooltip>
                );
              })()}

            <InvoiceActionsDropdown
              invoiceId={invoice.id}
              isPaid={isPaid}
              isOutstanding={isOutstanding}
              canUndoSend={canUndoSend}
              isPending={isPending}
              onUndoSend={() =>
                run(
                  () =>
                    updateInvoiceStatusAction({
                      invoiceId: invoice.id,
                      status: "draft",
                    }),
                  {
                    loading: "Reverting to draft...",
                    success: "Invoice moved back to draft.",
                  },
                )
              }
              onMarkPaid={() =>
                run(() => markInvoicePaidAction(invoice.id), {
                  loading: "Marking as paid...",
                  success: "Invoice marked as paid.",
                })
              }
              onDeleteClick={() => setIsDeleteOpen(true)}
            />
          </>
        }
      />

      <DashboardContainer>
        <div className="mx-auto max-w-3xl">
          <div className="border-border rounded-xl border">
            {/* Header: issuer + invoice number/status */}
            <div className="flex flex-wrap items-start justify-between gap-6 px-6 py-6">
              <div className="flex items-center gap-3">
                <AvatarInitials
                  name="Clentric"
                  shape="square"
                  size="lg"
                  variant="neutral"
                  className="font-space rounded-lg font-medium"
                />
                <div>
                  <h2 className="font-space text-base font-medium">
                    Clentric Studio
                  </h2>
                  <p className="text-muted-foreground text-xs">Invoice</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-semibold">
                  {formatInvoiceNumber(invoice.invoiceNumber)}
                </p>
                <div className="mt-1 flex justify-end">
                  <StatusBadge
                    status={statusInfo.variant}
                    className={statusInfo.dim ? "opacity-60" : undefined}
                  >
                    {statusInfo.label}
                  </StatusBadge>
                </div>
              </div>
            </div>

            <div className="border-border border-t" />

            {/* Billed to + dates */}
            <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase">
                  Billed To
                </p>
                <p className="mt-1 text-sm font-medium">
                  {client?.name ?? "Unknown client"}
                </p>
                {client?.email && (
                  <p className="text-muted-foreground text-xs">
                    {client.email}
                  </p>
                )}
                {project && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {project.title}
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase">
                  Issue Date
                </p>
                <p className="mt-1 text-sm">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase">
                  Due Date
                </p>
                <p className="mt-1 text-sm">{formatDate(invoice.dueDate)}</p>
              </div>
            </div>

            <div className="border-border border-t" />

            {/* Line items */}
            <div className="overflow-x-auto px-6 py-5">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Rate</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">{item.description}</td>
                      <td className="py-3 text-right">
                        {formatNumber(Number(item.quantity))}
                      </td>
                      <td className="py-3 text-right">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="py-3 text-right font-medium">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-border border-t" />

            {/* Totals */}
            <div className="flex justify-end px-6 py-5">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Tax ({formatNumber(Number(invoice.taxRate))}%)
                  </span>
                  <span>{formatCurrency(invoice.taxAmount)}</span>
                </div>
                <div className="border-border flex justify-between border-t pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="text-primary">
                    {formatCurrency(invoice.total)}
                  </span>
                </div>
              </div>
            </div>

            {invoice.paymentDetails && (
              <>
                <div className="border-border border-t" />
                <div className="px-6 py-5">
                  <p className="text-muted-foreground text-[10px] font-medium tracking-[0.06em] uppercase">
                    Payment Details
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line">
                    {invoice.paymentDetails}
                  </p>
                </div>
              </>
            )}

            <div className="border-border border-t" />

            {/* Footer timestamps */}
            <div className="text-muted-foreground flex flex-wrap items-center gap-3 px-6 py-3.5 text-xs">
              <span>Created {formatDate(invoice.createdAt)}</span>
              {invoice.sentAt && (
                <>
                  <span>·</span>
                  <span>Sent {formatDate(invoice.sentAt)}</span>
                </>
              )}
              {invoice.paidAt && (
                <>
                  <span>·</span>
                  <span>Paid {formatDate(invoice.paidAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </DashboardContainer>

      <DeleteDialog
        title="Delete Invoice"
        description={`Are you sure you want to delete "${client?.name ?? "this"}'s invoice"? This can't be undone.`}
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onDelete={async () => {
          await runActionWithToast(deleteInvoiceAction(invoice.id), {
            loading: "Deleting Invoice",
            success: "Invoice deleted",
            onSuccess: () => router.push("/invoices"),
          });
        }}
      />
    </>
  );
}
