"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  BellIcon,
  CheckIcon,
  EyeIcon,
  MoreVerticalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteInvoiceAction,
  markInvoicePaidAction,
  sendInvoiceAction,
  sendReminderAction,
  updateInvoiceStatusAction,
} from "./actions";
import type { ActionResult } from "@/lib/action-result";
import type { InvoiceListItem } from "./queries";
import { DeleteDialog } from "@/components/delete-dialog";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { useRouter } from "next/navigation";

export function InvoiceRowActions({ invoice }: { invoice: InvoiceListItem }) {
  const [isPending, startTransition] = useTransition();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const router = useRouter();

  const isDraft = invoice.status === "draft";
  // sent or overdue — sendReminderAction itself allows both, only draft/paid
  // are rejected, so the bell shouldn't be limited to "overdue" alone.
  const isOutstanding =
    invoice.status === "sent" || invoice.status === "overdue";

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        // TODO: surface result.error via your toast
        console.error(result.error);
      }
    });

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        {/* Quick actions stay as single-click icons — send/undo-send and
            reminder are the ones people reach for on every row, so they
            don't belong buried in a menu. */}
        {isDraft && (
          <CustomButton
            variant="ghost"
            size="sm"
            title="Send invoice"
            aria-label="Send invoice"
            disabled={isPending}
            onClick={() => run(() => sendInvoiceAction(invoice.id))}
          >
            <SendIcon className="h-3.5 w-3.5" />
          </CustomButton>
        )}

        {isOutstanding && (
          <CustomButton
            variant="ghost"
            size="sm"
            title="Undo send"
            aria-label="Undo send"
            disabled={isPending}
            onClick={() =>
              run(() =>
                updateInvoiceStatusAction({
                  invoiceId: invoice.id,
                  status: "draft",
                }),
              )
            }
          >
            <Undo2Icon className="h-3.5 w-3.5" />
          </CustomButton>
        )}

        {isOutstanding && (
          <CustomButton
            variant="ghost"
            size="sm"
            title="Send reminder"
            aria-label="Send reminder"
            disabled={isPending}
            onClick={() => run(() => sendReminderAction(invoice.id))}
          >
            <BellIcon className="h-3.5 w-3.5" />
          </CustomButton>
        )}

        {/* Everything else lives behind the three-dot menu, labeled —
            these are looked-up-not-repeated actions, so a label beats
            memorizing another icon. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <CustomButton
              variant="ghost"
              size="sm"
              title="More actions"
              aria-label="More actions"
              disabled={isPending}
            >
              <MoreVerticalIcon className="h-3.5 w-3.5" />
            </CustomButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}`}>
                <EyeIcon className="h-3.5 w-3.5" />
                View invoice
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>
                <PencilIcon className="h-3.5 w-3.5" />
                Edit invoice
              </Link>
            </DropdownMenuItem>

            {isOutstanding && (
              <DropdownMenuItem
                disabled={isPending}
                onClick={() => run(() => markInvoicePaidAction(invoice.id))}
              >
                <CheckIcon className="h-3.5 w-3.5" />
                Mark as paid
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              disabled={isPending}
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2Icon className="h-3.5 w-3.5" />
              Delete invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
    </>
  );
}
