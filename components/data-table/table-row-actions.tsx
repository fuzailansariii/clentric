"use client";

import { ReactNode, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import {
  MoreVerticalIcon,
  PencilIcon,
  SquareArrowOutUpRight,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/delete-dialog";
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
import { cn } from "@/lib/utils";

type ActionResult = { success: true } | { success: false; error: string };

export type TableRowActionsProps = {
  /** Display name used in aria-labels and the delete dialog. */
  entityName: string;
  /** Detail page path, e.g. `/projects/abc123`. */
  detailHref: string;
  /** Server action (or wrapper) that performs the delete. Must return `{ success, error? }`. */
  onDelete: () => Promise<ActionResult>;
  /** Toast + dialog copy — keep these explicit per entity for clear UX. */
  deleteLoadingMessage?: string;
  deleteSuccessMessage?: string;
  deleteTitle?: string;
  deleteDescription?: string;
  /** Override edit URL. Defaults to `${detailHref}?edit=true`. */
  editHref?: string;
  showEdit?: boolean;
  showView?: boolean;
  showDelete?: boolean;
  className?: string;
  align?: "start" | "end";
  customAction?: {
    label: string;
    icon: ReactNode;
    onClick: (event: MouseEvent) => void;
  };
};

export function TableRowActions({
  entityName,
  detailHref,
  onDelete,
  deleteLoadingMessage = "Deleting...",
  deleteSuccessMessage = "Deleted.",
  deleteTitle = "Delete record",
  deleteDescription,
  editHref,
  showEdit = true,
  showView = true,
  showDelete = true,
  className,
  align = "end",
  customAction,
}: TableRowActionsProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // The dialog mounts on first open only: every row renders these actions
  // twice (table + mobile list), and most rows are never deleted.
  const [hasOpenedDelete, setHasOpenedDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resolvedEditHref = editHref ?? `${detailHref}?edit=true`;
  const resolvedDeleteDescription =
    deleteDescription ??
    `Are you sure you want to delete "${entityName}"? This can't be undone.`;

  const stopPropagation = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const handleEdit = (event: MouseEvent) => {
    stopPropagation(event);
    router.push(resolvedEditHref);
  };

  const handleViewDetails = (event: MouseEvent) => {
    stopPropagation(event);
    router.push(detailHref);
  };

  const handleCustomAction = (event: MouseEvent) => {
    stopPropagation(event);
    customAction?.onClick(event);
  };

  const handleDeleteClick = (event: MouseEvent) => {
    stopPropagation(event);
    setHasOpenedDelete(true);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    const pending = toast.loading(deleteLoadingMessage);

    try {
      const result = await onDelete();

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success(deleteSuccessMessage, { id: pending });
      setIsDeleteOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete. Try again.",
        { id: pending },
      );
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActions = showEdit || showView || showDelete || customAction;

  if (!hasActions) {
    return null;
  }

  return (
    <>
      {/* One kebab trigger instead of a row of icon buttons — same pattern
          as the invoices dropdown. Keeps this compact enough for a mobile
          card (three separate CustomButtons crowd the row next to the
          status badge) and gives mobile a single, unmistakable tap target
          for "more actions" instead of a cluster of small icons. */}
      <div
        className={cn("flex items-center justify-end", className)}
        onClick={stopPropagation}
      >
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <CustomButton
                  variant="ghost"
                  size="sm"
                  aria-label={`Actions for ${entityName}`}
                  className="w-8 px-0!"
                >
                  <MoreVerticalIcon className="h-3.5 w-3.5" />
                </CustomButton>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More actions</TooltipContent>
          </Tooltip>

          <DropdownMenuContent align={align} className="w-48">
            {showEdit && (
              <DropdownMenuItem onClick={handleEdit} className="items-center">
                <PencilIcon className="size-3.5" />
                Edit
              </DropdownMenuItem>
            )}

            {customAction && (
              <DropdownMenuItem
                onClick={handleCustomAction}
                className="items-center"
              >
                {customAction.icon}
                {customAction.label}
              </DropdownMenuItem>
            )}

            {showView && (
              <DropdownMenuItem
                onClick={handleViewDetails}
                className="items-center"
              >
                <SquareArrowOutUpRight className="size-3.5" />
                View details
              </DropdownMenuItem>
            )}

            {showDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isDeleting}
                  onClick={handleDeleteClick}
                  className="items-center"
                >
                  <Trash2Icon className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Inside the stopPropagation wrapper on purpose: the dialog is
            portaled, but React still bubbles its clicks up this tree —
            outside the wrapper they'd reach the row and open it. */}
        {showDelete && hasOpenedDelete && (
          <DeleteDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            onDelete={handleDelete}
            title={deleteTitle}
            description={resolvedDeleteDescription}
          />
        )}
      </div>
    </>
  );
}
