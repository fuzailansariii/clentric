import Link from "next/link";
import {
  CheckIcon,
  MoreVerticalIcon,
  PencilIcon,
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type InvoiceActionsDropdownProps = {
  invoiceId: string;
  isPaid: boolean;
  isOutstanding: boolean;
  canUndoSend: boolean;
  isPending: boolean;
  onUndoSend: () => void;
  onMarkPaid: () => void;
  onDeleteClick: () => void;
  align?: "start" | "end";
};

export function InvoiceActionsDropdown({
  invoiceId,
  isPaid,
  isOutstanding,
  canUndoSend,
  isPending,
  onUndoSend,
  onMarkPaid,
  onDeleteClick,
  align = "end",
}: InvoiceActionsDropdownProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <CustomButton
              variant="ghost"
              size="sm"
              aria-label="More actions"
              disabled={isPending}
              className="w-8 px-0!"
            >
              <MoreVerticalIcon className="size-3.5" />
            </CustomButton>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>More actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align={align} className="w-60">
        {isPaid ? (
          <MenuRow
            icon={PencilIcon}
            label="Edit invoice"
            reason="Paid invoices can't be edited"
            disabled
          />
        ) : (
          <DropdownMenuItem asChild>
            <Link href={`/invoices/${invoiceId}/edit`} className="items-center">
              <PencilIcon className="size-3.5" />
              Edit invoice
            </Link>
          </DropdownMenuItem>
        )}

        {isOutstanding && (
          <>
            <DropdownMenuSeparator />

            <MenuRow
              icon={Undo2Icon}
              label="Undo send"
              reason={
                canUndoSend ? undefined : "The 5-minute undo window has passed"
              }
              disabled={isPending || !canUndoSend}
              onClick={onUndoSend}
            />

            <DropdownMenuItem
              disabled={isPending}
              onClick={onMarkPaid}
              className="items-center"
            >
              <CheckIcon className="size-3.5" />
              Mark as paid
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          onClick={onDeleteClick}
          className="items-center"
        >
          <Trash2Icon className="size-3.5" />
          Delete invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuRow({
  icon: Icon,
  label,
  reason,
  disabled,
  onClick,
}: {
  icon: typeof PencilIcon;
  label: string;
  reason?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <DropdownMenuItem
      disabled={disabled}
      onClick={onClick}
      className={reason ? "items-start" : "items-center"}
    >
      <Icon className={reason ? "mt-0.5 size-3.5" : "size-3.5"} />
      <div className="flex flex-col gap-0.5">
        <span>{label}</span>
        {reason && (
          <span className="text-muted-foreground text-xs leading-snug">
            {reason}
          </span>
        )}
      </div>
    </DropdownMenuItem>
  );
}
