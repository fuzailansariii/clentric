"use client";

import { useRouter } from "next/navigation";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  toggleMilestoneAction,
  deleteMilestoneAction,
  createMilestoneAction,
} from "./actions";
import { toast } from "sonner";
import { formatDate } from "@/lib/format-date";
import { CustomButton } from "@/components/ui/custom-button";
import { Field } from "@/components/ui/input";
import { Check, Plus, TrashIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { milestoneSchema } from "./milestoneSchema";
import { DeleteDialog } from "@/components/delete-dialog";
import { calculateProgress } from "@/lib/calculate-progress";

export type MilestoneListItem = {
  id: string;
  title: string;
  status: "completed" | "pending";
  dueDate: string | null;
  createdAt: Date;
};

type MilestonesPanelProps = {
  projectId: string;
  initialMilestones: MilestoneListItem[];
  onProgressChange?: (progress: number) => void;
};

const quickAddSchema = milestoneSchema.pick({ title: true });
type QuickAddInput = { title: string };

export default function MilestonesPanel({
  projectId,
  initialMilestones,
  onProgressChange,
}: MilestonesPanelProps) {
  const router = useRouter();
  const [milestones, setMilestones] =
    useState<MilestoneListItem[]>(initialMilestones);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingToggleId, setPendingToggleId] = useState<string | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] =
    useState<MilestoneListItem | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddInput>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: { title: "" },
  });

  const applyMilestones = (next: MilestoneListItem[]) => {
    setMilestones(next);
    onProgressChange?.(calculateProgress(next));
  };

  const handleToggle = async (milestone: MilestoneListItem) => {
    const nextCompleted = milestone.status !== "completed";
    const prevMilestones = milestones;

    setPendingToggleId(milestone.id);
    applyMilestones(
      milestones.map((m) =>
        m.id === milestone.id
          ? { ...m, status: nextCompleted ? "completed" : "pending" }
          : m,
      ),
    );

    const result = await toggleMilestoneAction(milestone.id, nextCompleted);
    setPendingToggleId(null);

    if (!result.success) {
      applyMilestones(prevMilestones);
      toast.error(result.error);
      return;
    }

    router.refresh();
  };

  const handleDelete = async (milestone: MilestoneListItem) => {
    const prevMilestones = milestones;
    applyMilestones(milestones.filter((m) => m.id !== milestone.id));

    await runActionWithToast(deleteMilestoneAction(milestone.id), {
      loading: "Deleting milestone...",
      success: "Milestone deleted.",
      onSuccess: () => router.refresh(),
      onError: () => applyMilestones(prevMilestones),
    });
  };

  const onAddSubmit = handleSubmit(async (data) => {
    const tempId = `temp-${crypto.randomUUID()}`;

    const optimisticMilestone: MilestoneListItem = {
      id: tempId,
      title: data.title,
      status: "pending",
      dueDate: null,
      createdAt: new Date(),
    };

    applyMilestones([...milestones, optimisticMilestone]);
    reset();
    setIsAdding(false);

    const result = await createMilestoneAction(projectId, {
      title: data.title,
    });

    if (!result.success) {
      applyMilestones(milestones.filter((m) => m.id !== tempId));
      toast.error(result.error);
      return;
    }

    applyMilestones(
      [...milestones, optimisticMilestone].map((m) =>
        m.id === tempId ? { ...m, id: result.data.milestoneId } : m,
      ),
    );
    router.refresh();
  });

  return (
    <div className="flex flex-col">
      {milestones.length === 0 && !isAdding && (
        <div className="text-muted-foreground px-6 py-8 text-center text-sm">
          No milestones yet. Add one to start tracking progress.
        </div>
      )}

      {milestones.length > 0 && (
        <ul className="divide-border divide-y">
          {milestones.map((milestone) => {
            const isCompleted = milestone.status === "completed";
            const isPending = pendingToggleId === milestone.id;
            const isOptimistic = milestone.id.startsWith("temp-");

            return (
              <li
                key={milestone.id}
                className={cn(
                  "group flex items-center gap-3 px-6 py-3",
                  isOptimistic && "opacity-60",
                )}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isCompleted}
                  disabled={isPending || isOptimistic}
                  onClick={() => handleToggle(milestone)}
                  className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors disabled:opacity-50",
                    isCompleted
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-border bg-background",
                  )}
                >
                  {isCompleted && <Check className="h-3 w-3" />}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      isCompleted && "text-muted-foreground line-through",
                    )}
                  >
                    {milestone.title}
                  </p>
                  {milestone.dueDate && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Due {formatDate(milestone.dueDate)}
                    </p>
                  )}
                </div>

                <CustomButton
                  type="button"
                  variant="ghost"
                  onClick={() => setMilestoneToDelete(milestone)}
                  disabled={isOptimistic}
                  className="text-muted-foreground hover:text-destructive shrink-0 opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-0"
                  aria-label={`Delete ${milestone.title}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </CustomButton>
              </li>
            );
          })}
        </ul>
      )}

      <DeleteDialog
        open={milestoneToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setMilestoneToDelete(null);
        }}
        onDelete={async () => {
          if (!milestoneToDelete) return;
          await handleDelete(milestoneToDelete);
          setMilestoneToDelete(null);
        }}
        title="Delete Milestone"
        description={
          <>
            Are you sure you want to delete{" "}
            <span className="font-semibold">{milestoneToDelete?.title}</span>?
            This can't be undone.
          </>
        }
      />

      <div className="px-6 py-3">
        {isAdding ? (
          <form onSubmit={onAddSubmit} className="flex items-center gap-2">
            <div className="flex-1">
              <Field
                {...register("title")}
                autoFocus
                placeholder="Milestone title"
                error={errors.title?.message}
                className="h-9"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="border-border rounded-lg border p-2 text-blue-600 disabled:opacity-50"
                aria-label="Save milestone"
              >
                <Check className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setIsAdding(false);
                }}
                className="text-muted-foreground border-border rounded-lg border p-2"
                aria-label="Cancel"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="flex justify-center">
            <CustomButton
              type="button"
              variant="secondary"
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add milestone
            </CustomButton>
          </div>
        )}
      </div>
    </div>
  );
}
