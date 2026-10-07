"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { DeleteDialog } from "@/components/delete-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomButton } from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/input";
import { formValueToDate } from "@/lib/format-date";
import { formatDaysUntilDue, formatShortDate } from "@/lib/format-due";
import { cn } from "@/lib/utils";
import {
  createMilestoneAction,
  deleteMilestoneAction,
  setMilestoneStatusAction,
  updateMilestoneAction,
} from "./milestone-actions";
import { MilestoneProgress } from "./milestone-progress";
import type { MilestoneItem } from "./queries";
import { milestoneSchema } from "./schema";

// Rows added optimistically carry a temporary id until the server responds;
// they can't be toggled, edited or deleted yet.
const TEMP_ID_PREFIX = "temp-";

type OptimisticAction =
  | { type: "add"; milestone: MilestoneItem }
  | { type: "update"; id: string; changes: Partial<MilestoneItem> }
  | { type: "remove"; id: string };

function milestonesReducer(
  state: MilestoneItem[],
  action: OptimisticAction,
): MilestoneItem[] {
  switch (action.type) {
    case "add":
      return [...state, action.milestone];
    case "update":
      return state.map((milestone) =>
        milestone.id === action.id
          ? { ...milestone, ...action.changes }
          : milestone,
      );
    case "remove":
      return state.filter((milestone) => milestone.id !== action.id);
  }
}

/**
 * Checklist of a project's milestones: add, tick off, edit, delete.
 *
 * Every change shows instantly through useOptimistic. The server action then
 * revalidates the page, and the fresh `milestones` prop replaces the
 * optimistic list. If an action fails, the optimistic change simply falls
 * away when the transition ends and a toast explains why.
 */
export function MilestonesPanel({
  projectId,
  milestones,
}: {
  projectId: string;
  milestones: MilestoneItem[];
}) {
  const [optimisticMilestones, applyOptimistic] = useOptimistic(
    milestones,
    milestonesReducer,
  );
  const [, startMutation] = useTransition();

  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  // Kept separately from `isDeleteOpen` so the dialog's text doesn't blank
  // out during its closing animation.
  const [deleteTarget, setDeleteTarget] = useState<MilestoneItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const total = optimisticMilestones.length;
  const completed = optimisticMilestones.filter(
    (milestone) => milestone.status === "completed",
  ).length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = milestoneSchema.safeParse({ title, dueDate });
    if (!parsed.success) {
      setAddError(parsed.error.issues[0].message);
      return;
    }

    setAddError(null);

    const draft = { title, dueDate };
    const optimistic: MilestoneItem = {
      id: `${TEMP_ID_PREFIX}${crypto.randomUUID()}`,
      title: parsed.data.title,
      status: "pending",
      dueDate: parsed.data.dueDate || null,
      daysUntilDue: null,
      createdAt: new Date(),
    };

    // Clear right away so the next milestone can be typed immediately.
    setTitle("");
    setDueDate("");
    titleInputRef.current?.focus();

    startMutation(async () => {
      applyOptimistic({ type: "add", milestone: optimistic });
      const result = await createMilestoneAction(projectId, parsed.data);

      if (!result.success) {
        toast.error(result.error);
        // Give the text back so nothing typed is lost.
        setTitle(draft.title);
        setDueDate(draft.dueDate);
      }
    });
  };

  const handleToggle = (milestone: MilestoneItem, checked: boolean) => {
    const status = checked ? "completed" : "pending";

    startMutation(async () => {
      applyOptimistic({ type: "update", id: milestone.id, changes: { status } });
      const result = await setMilestoneStatusAction(milestone.id, status);
      if (!result.success) toast.error(result.error);
    });
  };

  const handleUpdate = (
    milestone: MilestoneItem,
    values: { title: string; dueDate: string },
  ) => {
    setEditingId(null);

    // Send only what actually changed.
    const payload: { title?: string; dueDate?: string } = {};
    const changes: Partial<MilestoneItem> = {};

    if (values.title !== milestone.title) {
      payload.title = values.title;
      changes.title = values.title;
    }

    if (values.dueDate !== (milestone.dueDate ?? "")) {
      payload.dueDate = values.dueDate;
      changes.dueDate = values.dueDate || null;
      // The relative label comes back from the server with the refresh.
      changes.daysUntilDue = null;
    }

    if (Object.keys(payload).length === 0) return;

    startMutation(async () => {
      applyOptimistic({ type: "update", id: milestone.id, changes });
      const result = await updateMilestoneAction(milestone.id, payload);
      if (!result.success) toast.error(result.error);
    });
  };

  const handleDelete = (milestone: MilestoneItem) => {
    startMutation(async () => {
      applyOptimistic({ type: "remove", id: milestone.id });
      const result = await deleteMilestoneAction(milestone.id);

      if (result.success) {
        toast.success("Milestone deleted.");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div>
      {total > 0 && (
        <div className="flex items-center justify-between gap-4 px-5 pt-4">
          <p className="text-muted-foreground text-xs">
            <span className="text-foreground font-medium tabular-nums">
              {completed}
            </span>{" "}
            of <span className="tabular-nums">{total}</span> done
          </p>
          <MilestoneProgress
            completed={completed}
            total={total}
            progress={progress}
            fill
            showCount={false}
            className="w-40"
          />
        </div>
      )}

      <form
        onSubmit={handleAdd}
        noValidate
        className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start"
      >
        <div className="min-w-0 flex-1">
          <Field
            ref={titleInputRef}
            id="new-milestone-title"
            aria-label="Milestone title"
            placeholder="Add a milestone, e.g. Wireframes approved"
            autoComplete="off"
            maxLength={200}
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setTitle(event.target.value);
              if (addError) setAddError(null);
            }}
            error={addError ?? undefined}
          />
        </div>

        <div className="flex items-start gap-2">
          <div className="flex-1 sm:w-44 sm:flex-none">
            <DueDateInput value={dueDate} onChange={setDueDate} />
          </div>
          <CustomButton type="submit" variant="primary" className="h-11 gap-1.5">
            <PlusIcon className="h-4 w-4" />
            Add
          </CustomButton>
        </div>
      </form>

      {total === 0 ? (
        <p className="text-muted-foreground border-border border-t px-5 py-8 text-center text-sm">
          No milestones yet. Break the project into steps to track progress.
        </p>
      ) : (
        <ul className="divide-border border-border divide-y border-t">
          {optimisticMilestones.map((milestone) =>
            editingId === milestone.id ? (
              <MilestoneEditRow
                key={milestone.id}
                milestone={milestone}
                onCancel={() => setEditingId(null)}
                onSave={(values) => handleUpdate(milestone, values)}
              />
            ) : (
              <MilestoneRow
                key={milestone.id}
                milestone={milestone}
                onToggle={(checked) => handleToggle(milestone, checked)}
                onEdit={() => setEditingId(milestone.id)}
                onDelete={() => {
                  setDeleteTarget(milestone);
                  setIsDeleteOpen(true);
                }}
              />
            ),
          )}
        </ul>
      )}

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete milestone"
        description={`Delete "${deleteTarget?.title ?? ""}"? This can't be undone.`}
        onDelete={async () => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </div>
  );
}

function MilestoneRow({
  milestone,
  onToggle,
  onEdit,
  onDelete,
}: {
  milestone: MilestoneItem;
  onToggle: (checked: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isSaving = milestone.id.startsWith(TEMP_ID_PREFIX);
  const isDone = milestone.status === "completed";
  const due = getDueLabel(milestone);

  return (
    <li
      className={cn(
        "group/milestone flex items-center gap-3 px-5 py-2.5",
        isSaving && "opacity-60",
      )}
    >
      <Checkbox
        checked={isDone}
        disabled={isSaving}
        onCheckedChange={(checked) => onToggle(checked === true)}
        aria-label={
          isDone
            ? `Mark "${milestone.title}" as not done`
            : `Mark "${milestone.title}" as done`
        }
      />

      <p
        className={cn(
          "min-w-0 flex-1 text-sm break-words",
          isDone && "text-muted-foreground line-through",
        )}
      >
        {milestone.title}
      </p>

      {due && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            due.late ? "text-danger-600" : "text-muted-foreground",
          )}
        >
          {due.date}
          {due.relative && (
            <span className="hidden sm:inline"> · {due.relative}</span>
          )}
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            disabled={isSaving}
            aria-label={`Actions for "${milestone.title}"`}
            className="w-8 px-0! opacity-0 group-hover/milestone:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 [@media(hover:none)]:opacity-100"
          >
            <MoreVerticalIcon className="h-3.5 w-3.5" />
          </CustomButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onEdit} className="items-center">
            <PencilIcon className="size-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={onDelete}
            className="items-center"
          >
            <Trash2Icon className="size-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function MilestoneEditRow({
  milestone,
  onSave,
  onCancel,
}: {
  milestone: MilestoneItem;
  onSave: (values: { title: string; dueDate: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(milestone.title);
  const [dueDate, setDueDate] = useState(milestone.dueDate ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = milestoneSchema.safeParse({ title, dueDate });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    onSave({ title: parsed.data.title, dueDate: parsed.data.dueDate ?? "" });
  };

  // Escape in the title input cancels. Only there: Escape inside the date
  // picker should just close the calendar.
  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape" && event.target instanceof HTMLInputElement) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <li className="px-5 py-3">
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        noValidate
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
      >
        <div className="min-w-0 flex-1">
          <Field
            id={`milestone-title-${milestone.id}`}
            aria-label="Milestone title"
            autoFocus
            autoComplete="off"
            maxLength={200}
            value={title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setTitle(event.target.value);
              if (error) setError(null);
            }}
            error={error ?? undefined}
          />
        </div>

        <div className="flex items-start gap-2">
          <div className="flex-1 sm:w-44 sm:flex-none">
            <DueDateInput value={dueDate} onChange={setDueDate} />
          </div>
          <CustomButton
            type="button"
            variant="secondary"
            onClick={onCancel}
            className="h-11"
          >
            Cancel
          </CustomButton>
          <CustomButton type="submit" variant="primary" className="h-11">
            Save
          </CustomButton>
        </div>
      </form>
    </li>
  );
}

/** Date picker with a clear button, since a due date is optional. */
function DueDateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <DatePickerField value={value} onChange={onChange} />
      {value && (
        <button
          type="button"
          aria-label="Clear due date"
          onClick={() => onChange("")}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-[22px] right-9 -translate-y-1/2 rounded p-1 outline-none focus-visible:ring-2"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** "Sep 22" plus "Due in 9 days" / "3 days late" for open milestones. */
function getDueLabel(
  milestone: MilestoneItem,
): { date: string; relative: string | null; late: boolean } | null {
  const date = formValueToDate(milestone.dueDate ?? undefined);
  if (!date) return null;

  const shortDate = formatShortDate(date);

  if (milestone.status === "completed" || milestone.daysUntilDue === null) {
    return { date: shortDate, relative: null, late: false };
  }

  return {
    date: shortDate,
    relative: formatDaysUntilDue(milestone.daysUntilDue),
    late: milestone.daysUntilDue < 0,
  };
}
