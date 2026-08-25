"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, SquareArrowOutUpRight, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import { DeleteDialog } from "@/components/delete-dialog";
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
};

const actionButtonClassName =
  "text-muted-foreground hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none";

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
}: TableRowActionsProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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

  const handleDeleteClick = (event: MouseEvent) => {
    stopPropagation(event);
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

  const hasActions = showEdit || showView || showDelete;

  if (!hasActions) {
    return null;
  }

  return (
    <>
      <div
        className={cn("flex items-center justify-end gap-0.5", className)}
        onClick={stopPropagation}
      >
        {showEdit && (
          <button
            type="button"
            aria-label={`Edit ${entityName}`}
            className={actionButtonClassName}
            onClick={handleEdit}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        )}

        {showView && (
          <button
            type="button"
            aria-label={`View ${entityName}`}
            className={actionButtonClassName}
            onClick={handleViewDetails}
          >
            <SquareArrowOutUpRight className="h-4 w-4" />
          </button>
        )}

        {showDelete && (
          <button
            type="button"
            aria-label={`Delete ${entityName}`}
            disabled={isDeleting}
            className={cn(
              actionButtonClassName,
              "hover:text-destructive focus-visible:text-destructive",
              isDeleting && "pointer-events-none opacity-50",
            )}
            onClick={handleDeleteClick}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {showDelete && (
        <DeleteDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onDelete={handleDelete}
          title={deleteTitle}
          description={resolvedDeleteDescription}
        />
      )}
    </>
  );
}
