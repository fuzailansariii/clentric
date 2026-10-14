"use client";

import Link from "next/link";
import {
  useOptimistic,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { CheckIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-picker-field";
import { DeleteDialog } from "@/components/delete-dialog";
import { CustomButton } from "@/components/ui/custom-button";
import { Field } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format-currency";
import { formatDayValue } from "@/lib/format-due";
import { cn } from "@/lib/utils";
import { invoiceStatusConfig } from "../invoices/invoice-status-config";
import {
  createMilestoneAction,
  deleteMilestoneAction,
  setMilestoneStatusAction,
  updateMilestoneAction,
} from "./milestone-actions";
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

type Draft = { title: string; dueDate: string; amount: string };
const EMPTY_DRAFT: Draft = { title: "", dueDate: "", amount: "" };

type ProjectRef = {
  id: string;
  clientId: string;
  billing: "per_milestone" | "end";
  currency: string;
};

/** Done, finished-but-unbilled stages can be invoiced on their own. */
function canInvoice(m: MilestoneItem, billing: ProjectRef["billing"]) {
  return (
    billing === "per_milestone" &&
    m.status === "completed" &&
    !m.invoice &&
    Number(m.amount ?? 0) > 0
  );
}

/**
 * The project's stages: tick off, price, invoice, edit and add.
 *
 * Changes show at once through useOptimistic; the server action revalidates
 * the page and the fresh list replaces the optimistic one.
 */
export function MilestonesPanel({
  project,
  milestones,
}: {
  project: ProjectRef;
  milestones: MilestoneItem[];
}) {
  const [items, applyOptimistic] = useOptimistic(milestones, milestonesReducer);
  const [, startMutation] = useTransition();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Kept apart from `isDeleteOpen` so the dialog text survives its exit animation.
  const [deleteTarget, setDeleteTarget] = useState<MilestoneItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const total = items.length;
  const done = items.filter((m) => m.status === "completed").length;

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = milestoneSchema.safeParse(draft);
    if (!parsed.success) {
      setAddError(parsed.error.issues[0].message);
      return;
    }
    setAddError(null);

    const sent = draft;
    const optimistic: MilestoneItem = {
      id: `${TEMP_ID_PREFIX}${crypto.randomUUID()}`,
      title: parsed.data.title,
      status: "pending",
      dueDate: parsed.data.dueDate || null,
      daysUntilDue: null,
      amount: parsed.data.amount || null,
      invoice: null,
      createdAt: new Date(),
    };
    setDraft(EMPTY_DRAFT);

    startMutation(async () => {
      applyOptimistic({ type: "add", milestone: optimistic });
      const result = await createMilestoneAction(project.id, parsed.data);
      if (result.success) {
        toast.success("Milestone added");
      } else {
        toast.error(result.error);
        setDraft(sent);
      }
    });
  };

  const handleToggle = (milestone: MilestoneItem) => {
    const status = milestone.status === "completed" ? "pending" : "completed";
    startMutation(async () => {
      applyOptimistic({ type: "update", id: milestone.id, changes: { status } });
      const result = await setMilestoneStatusAction(milestone.id, status);
      if (!result.success) {
        toast.error(result.error);
      } else if (status === "pending") {
        toast.success("Marked not done");
      } else {
        const ready = canInvoice({ ...milestone, status }, project.billing);
        toast.success(ready ? "Done - ready to invoice" : "Milestone done");
      }
    });
  };

  const handleUpdate = (milestone: MilestoneItem, values: Draft) => {
    const parsed = milestoneSchema.safeParse(values);
    if (!parsed.success) return parsed.error.issues[0].message;
    setEditingId(null);

    const payload = {
      title: parsed.data.title,
      dueDate: parsed.data.dueDate ?? "",
      amount: parsed.data.amount ?? "",
    };
    startMutation(async () => {
      applyOptimistic({
        type: "update",
        id: milestone.id,
        changes: {
          title: payload.title,
          dueDate: payload.dueDate || null,
          amount: payload.amount || null,
          // The relative label comes back from the server with the refresh.
          daysUntilDue: null,
        },
      });
      const result = await updateMilestoneAction(milestone.id, payload);
      if (result.success) toast.success("Milestone saved");
      else toast.error(result.error);
    });
    return null;
  };

  const handleDelete = (milestone: MilestoneItem) => {
    setEditingId(null);
    startMutation(async () => {
      applyOptimistic({ type: "remove", id: milestone.id });
      const result = await deleteMilestoneAction(milestone.id);
      if (result.success) toast.success("Milestone deleted");
      else toast.error(result.error);
    });
  };

  return (
    <section className="bg-card @container overflow-hidden rounded-lg border shadow-xs">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-4.5">
        <h2 className="text-sm font-semibold">Milestones</h2>
        {total > 0 && (
          <span className="text-muted-foreground font-space text-[12.5px] tabular-nums">
            {done} of {total} done
          </span>
        )}
      </div>

      {total > 0 ? (
        <div
          role="img"
          aria-label={`${done} of ${total} milestones done`}
          className="flex gap-0.75 px-4 pb-3.5 sm:px-4.5"
        >
          {items.map((m) => (
            <span
              key={m.id}
              className={cn(
                "h-1.5 flex-1 rounded-xs",
                canInvoice(m, project.billing)
                  ? "bg-success-600"
                  : m.status === "completed"
                    ? "bg-primary"
                    : "bg-foreground/10",
              )}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground px-4 pb-3.5 text-[13.5px] sm:px-4.5">
          No milestones yet. Add stages to track progress and invoice as you go.
        </p>
      )}

      <ul>
        {items.map((m, index) =>
          editingId === m.id ? (
            <MilestoneEditRow
              key={m.id}
              milestone={m}
              onCancel={() => setEditingId(null)}
              onSave={(values) => handleUpdate(m, values)}
              onDelete={() => {
                setDeleteTarget(m);
                setIsDeleteOpen(true);
              }}
            />
          ) : (
            <MilestoneRow
              key={m.id}
              milestone={m}
              project={project}
              stage={index + 1}
              onToggle={() => handleToggle(m)}
              onEdit={() => setEditingId(m.id)}
            />
          ),
        )}
      </ul>

      <form
        onSubmit={handleAdd}
        noValidate
        className="bg-muted/40 grid grid-cols-1 gap-2 border-t px-4 py-3 sm:px-4.5 @[560px]:grid-cols-[minmax(0,1fr)_10rem_8rem_auto]"
      >
        <Field
          aria-label="New milestone title"
          placeholder="Add a milestone"
          autoComplete="off"
          maxLength={200}
          value={draft.title}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setDraft((d) => ({ ...d, title: event.target.value }));
            if (addError) setAddError(null);
          }}
          error={addError ?? undefined}
        />
        <DatePickerField
          aria-label="New milestone due date"
          value={draft.dueDate}
          onChange={(dueDate) => setDraft((d) => ({ ...d, dueDate }))}
        />
        <Field
          aria-label="Amount"
          placeholder="Amount"
          prefix="$"
          inputMode="decimal"
          className="text-right"
          value={draft.amount}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setDraft((d) => ({ ...d, amount: event.target.value }))
          }
        />
        <CustomButton
          type="submit"
          variant="secondary"
          disabled={!draft.title.trim()}
          className="h-11 gap-1.5"
        >
          <PlusIcon className="size-4" />
          Add
        </CustomButton>
      </form>

      <DeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Delete milestone"
        description={
          deleteTarget?.invoice
            ? `Delete "${deleteTarget.title}"? ${deleteTarget.invoice.number} stays, but no longer points to it.`
            : `Delete "${deleteTarget?.title ?? ""}"? This can't be undone.`
        }
        onDelete={async () => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </section>
  );
}

function MilestoneRow({
  milestone: m,
  project,
  stage,
  onToggle,
  onEdit,
}: {
  milestone: MilestoneItem;
  project: ProjectRef;
  stage: number;
  onToggle: () => void;
  onEdit: () => void;
}) {
  const isSaving = m.id.startsWith(TEMP_ID_PREFIX);
  const isDone = m.status === "completed";
  const ready = canInvoice(m, project.billing);
  const late = !isDone && m.daysUntilDue !== null && m.daysUntilDue < 0;
  const hasAmount = Number(m.amount ?? 0) > 0;

  let sub: string;
  if (isDone) {
    sub = m.invoice
      ? `Done · invoiced ${m.invoice.number}`
      : hasAmount && project.billing === "per_milestone"
        ? "Done · not invoiced yet"
        : "Done";
  } else if (m.dueDate) {
    const days = m.daysUntilDue ?? 0;
    sub = `Due ${formatDayValue(m.dueDate)}${late ? ` · ${Math.abs(days)} day${days === -1 ? "" : "s"} late` : ""}`;
  } else {
    sub = "Upcoming · no date";
  }

  const invoiceHref = `/invoices/new?${new URLSearchParams({
    clientId: project.clientId,
    projectId: project.id,
    milestoneId: m.id,
  }).toString()}`;
  const status = m.invoice ? invoiceStatusConfig[m.invoice.status] : null;

  return (
    <li
      className={cn(
        "grid min-h-15 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-t px-4 py-2.5 sm:px-4.5 @[560px]:grid-cols-[1.5rem_minmax(0,1fr)_6rem_auto]",
        isSaving && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={isSaving}
        aria-pressed={isDone}
        aria-label={
          isDone ? `Mark "${m.title}" not done` : `Mark "${m.title}" done`
        }
        className={cn(
          "focus-visible:ring-ring text-background grid size-5.5 cursor-pointer place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          isDone
            ? ready
              ? "bg-success-600"
              : "bg-primary"
            : "ring-foreground/25 hover:ring-foreground/40 ring-[1.5px] ring-inset",
        )}
      >
        {isDone && <CheckIcon className="size-3" strokeWidth={3} />}
      </button>

      <button
        type="button"
        onClick={onEdit}
        disabled={isSaving}
        className="min-w-0 cursor-text text-left"
      >
        <span className="block text-sm font-medium wrap-anywhere">
          {m.title}
        </span>
        <span
          className={cn(
            "block text-[12.5px]",
            late
              ? "text-danger-600"
              : ready
                ? "text-success-600"
                : "text-muted-foreground",
          )}
        >
          {sub}
        </span>
      </button>

      <span className="font-space text-right text-sm font-medium whitespace-nowrap tabular-nums">
        {hasAmount ? formatCurrency(m.amount!, project.currency) : "-"}
      </span>

      <span className="col-span-2 col-start-2 flex items-center justify-start gap-1.5 @[560px]:col-span-1 @[560px]:col-start-auto @[560px]:justify-end">
        {ready && (
          <Link
            href={invoiceHref}
            aria-label={`Invoice stage ${stage}`}
            className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-7 items-center rounded-lg px-2.5 text-[12.5px] font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Invoice
          </Link>
        )}
        {m.invoice && status && (
          <Link
            href={`/invoices/${m.invoice.id}`}
            aria-label={`${m.invoice.number}, ${status.label}`}
            className="rounded-full focus-visible:ring-2 focus-visible:outline-none"
          >
            <StatusBadge status={status.variant} variant="soft" size="sm">
              {status.label}
            </StatusBadge>
          </Link>
        )}
        <CustomButton
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={isSaving}
          aria-label={`Edit "${m.title}"`}
          className="w-8 px-0!"
        >
          <PencilIcon className="size-3.5" />
        </CustomButton>
      </span>
    </li>
  );
}

function MilestoneEditRow({
  milestone,
  onSave,
  onCancel,
  onDelete,
}: {
  milestone: MilestoneItem;
  /** Returns an error message, or null once saved. */
  onSave: (values: Draft) => string | null;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [values, setValues] = useState<Draft>({
    title: milestone.title,
    dueDate: milestone.dueDate ?? "",
    amount: milestone.amount ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(onSave(values));
  };

  return (
    <li className="border-t px-4 py-3 sm:px-4.5">
      <form
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          // Escape in a text input cancels; inside the date picker it just closes it.
          if (event.key === "Escape" && event.target instanceof HTMLInputElement) {
            event.preventDefault();
            onCancel();
          }
        }}
        noValidate
        className="flex flex-col gap-2.5 sm:pl-9"
      >
        <div className="grid grid-cols-1 gap-2 @[560px]:grid-cols-[minmax(0,1fr)_10rem_8rem]">
          <Field
            aria-label="Milestone title"
            autoFocus
            autoComplete="off"
            maxLength={200}
            value={values.title}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setValues((v) => ({ ...v, title: event.target.value }));
              if (error) setError(null);
            }}
            error={error ?? undefined}
          />
          <DatePickerField
            aria-label="Due date"
            value={values.dueDate}
            onChange={(dueDate) => setValues((v) => ({ ...v, dueDate }))}
          />
          <Field
            aria-label="Amount"
            placeholder="Amount"
            prefix="$"
            inputMode="decimal"
            className="text-right"
            value={values.amount}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValues((v) => ({ ...v, amount: event.target.value }))
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CustomButton type="submit" variant="primary" size="sm">
            Save
          </CustomButton>
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </CustomButton>
          {values.dueDate && (
            <CustomButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setValues((v) => ({ ...v, dueDate: "" }))}
            >
              Clear date
            </CustomButton>
          )}
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-danger-600 hover:text-danger-600 ml-auto"
          >
            Delete
          </CustomButton>
        </div>
      </form>
    </li>
  );
}
