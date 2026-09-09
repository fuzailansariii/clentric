"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  BellIcon,
  CheckIcon,
  MoreHorizontalIcon,
  SendIcon,
  Trash2Icon,
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
        {isDraft && (
          <CustomButton
            variant="ghost"
            size="sm"
            className="gap-1.5"
            disabled={isPending}
            onClick={() => run(() => sendInvoiceAction(invoice.id))}
          >
            <SendIcon className="h-3.5 w-3.5" />
          </CustomButton>
        )}

        {invoice.status === "overdue" && (
          <CustomButton
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={isPending}
            onClick={() => run(() => sendReminderAction(invoice.id))}
          >
            <BellIcon className="h-3.5 w-3.5" />
            Send reminder
          </CustomButton>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <CustomButton
              variant="ghost"
              size="sm"
              aria-label="Actions"
              disabled={isPending}
            >
              <MoreHorizontalIcon className="h-4 w-4" />
            </CustomButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}`}>View</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/invoices/${invoice.id}/edit`}>Edit</Link>
            </DropdownMenuItem>

            {isOutstanding && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => run(() => markInvoicePaidAction(invoice.id))}
                >
                  <CheckIcon className="mr-2 h-3.5 w-3.5" />
                  Mark as paid
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2Icon className="mr-2 h-3.5 w-3.5" />
              Delete
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
