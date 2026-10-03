"use client";
import { useState, useTransition } from "react";
import { BellIcon, SendIcon } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  sendInvoiceAction,
  sendReminderAction,
} from "./actions";
import type { ActionResult } from "@/lib/action-result";
import type { InvoiceListItem } from "./queries";
import { DeleteDialog } from "@/components/delete-dialog";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { useUndoableAction } from "@/hooks/use-undoable-action";
import { warnNotEmailed } from "@/lib/email/warn-not-emailed";
import { REMINDER_SEND_DELAY_MS } from "@/lib/reminder-send-delay";
import { useRouter } from "next/navigation";
import { InvoiceActionsDropdown } from "./invoice-actions-dropdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InvoiceRowActions({
  invoice,
  compact = false,
}: {
  invoice: InvoiceListItem;
  /** Only the ⋮ menu — for mobile rows, where amount and status already fill
   * the trailing space. Send and remind stay on the detail page. */
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // The dialog mounts on first open only: every row renders these actions
  // twice (table + mobile list), and most rows are never deleted.
  const [hasOpenedDelete, setHasOpenedDelete] = useState(false);
  const router = useRouter();

  const isDraft = invoice.status === "draft";
  const isOutstanding =
    invoice.status === "sent" || invoice.status === "overdue";
  const isPaid = invoice.status === "paid";

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

  const { trigger: sendReminder, isQueued: isReminderQueued } =
    useUndoableAction(
      () => sendReminderAction(invoice.id),
      {
        queued: "Reminder will be sent shortly.",
        loading: "Sending reminder...",
        success: "Reminder sent.",
      },
      REMINDER_SEND_DELAY_MS,
      { onSuccess: () => router.refresh() },
    );

  return (
    <>
      <div
        className="flex items-center justify-end gap-1"
        onClick={(event) => event.stopPropagation()}
      >
        {!compact && isDraft && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CustomButton
                variant="ghost"
                size="sm"
                aria-label="Send invoice"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await runActionWithToast(sendInvoiceAction(invoice.id), {
                      loading: "Sending invoice...",
                      success: ({ emailError }) =>
                        emailError
                          ? "Invoice marked as sent."
                          : "Invoice sent to your client.",
                      onSuccess: ({ emailError }) => {
                        warnNotEmailed(emailError, "invoice");
                        router.refresh();
                      },
                    });
                  })
                }
              >
                <SendIcon className="h-3.5 w-3.5" />
              </CustomButton>
            </TooltipTrigger>
            <TooltipContent>Send invoice</TooltipContent>
          </Tooltip>
        )}

        {!compact && isOutstanding && (
          <Tooltip>
            <TooltipTrigger asChild>
              <CustomButton
                variant="ghost"
                size="sm"
                aria-label="Send reminder"
                disabled={isPending || isReminderQueued}
                onClick={sendReminder}
              >
                <BellIcon className="h-3.5 w-3.5" />
              </CustomButton>
            </TooltipTrigger>
            <TooltipContent>
              {isReminderQueued
                ? "Reminder queued — click the toast to undo"
                : "Send reminder"}
            </TooltipContent>
          </Tooltip>
        )}

        <InvoiceActionsDropdown
          invoiceId={invoice.id}
          isPaid={isPaid}
          isOutstanding={isOutstanding}
          isPending={isPending}
          onMarkPaid={() =>
            run(() => markInvoicePaidAction(invoice.id), {
              loading: "Marking as paid...",
              success: "Invoice marked as paid.",
            })
          }
          onDeleteClick={() => {
            setHasOpenedDelete(true);
            setIsDeleteOpen(true);
          }}
        />

        {/* Inside the stopPropagation wrapper: the dialog is portaled, but
            React still bubbles its clicks up to the row otherwise. */}
        {hasOpenedDelete && (
          <DeleteDialog
            title="Delete Invoice"
            description={`Are you sure you want to delete "${invoice.clientName}'s invoice"? This can't be undone.`}
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            onDelete={async () => {
              await runActionWithToast(deleteInvoiceAction(invoice.id), {
                loading: "Deleting Invoice",
                success: "Invoice deleted",
                onSuccess: () => router.refresh(),
              });
            }}
          />
        )}
      </div>
    </>
  );
}
