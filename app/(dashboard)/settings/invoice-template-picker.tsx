"use client";

import { useOptimistic, useTransition } from "react";
import { CheckIcon } from "lucide-react";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import {
  INVOICE_TEMPLATES,
  type InvoiceTemplate,
} from "@/lib/invoice-templates";
import { cn } from "@/lib/utils";
import { updateInvoiceTemplateAction } from "./actions";

/** Picks the invoice PDF layout. Saves on click; no save bar. */
export function InvoiceTemplatePicker({
  template,
}: {
  template: InvoiceTemplate;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useOptimistic(template);

  const choose = (next: InvoiceTemplate) => {
    if (next === selected) return;
    startTransition(async () => {
      setSelected(next);
      await runActionWithToast(
        updateInvoiceTemplateAction({ template: next }),
        {
          loading: "Saving...",
          success: "Invoice template saved",
        },
      );
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Invoice template"
      className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6"
    >
      {INVOICE_TEMPLATES.map((option) => {
        const isSelected = option.id === selected;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={isPending}
            onClick={() => choose(option.id)}
            className={cn(
              "focus-visible:ring-ring flex cursor-pointer flex-col gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-wait",
              isSelected
                ? "border-primary ring-primary/20 ring-2"
                : "border-border hover:bg-secondary",
            )}
          >
            <TemplateThumbnail template={option.id} />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{option.name}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {option.description}
                </p>
              </div>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {isSelected && <CheckIcon className="size-3" />}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** A tiny sketch of each layout. Always light: it stands for paper. */
function TemplateThumbnail({ template }: { template: InvoiceTemplate }) {
  const line = "h-1 rounded-full bg-ink-400/35";
  return (
    <div
      aria-hidden="true"
      className="border-border relative h-36 overflow-hidden rounded-md border bg-white"
    >
      {template === "classic" ? (
        <>
          <div className="bg-ledger-600 h-1" />
          <div className="flex flex-col gap-2 p-3">
            <div className="flex items-end justify-between">
              <div className="bg-ink-700 h-2.5 w-14 rounded-sm" />
              <div className="flex flex-col items-end gap-1">
                <div className={cn(line, "w-12")} />
                <div className={cn(line, "w-10")} />
              </div>
            </div>
            <div className="bg-ink-400/35 h-px" />
            <div className="flex gap-6">
              <div className={cn(line, "w-14")} />
              <div className={cn(line, "w-12")} />
            </div>
            <div className="flex flex-col gap-1.5 pt-1">
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-full")} />
              <div className={cn(line, "w-4/5")} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="border-warning-600 text-warning-600 -rotate-6 rounded-sm border-2 border-double px-1.5 text-[7px] font-bold">
                PENDING
              </div>
              <div className="bg-ink-700 h-2.5 w-14 rounded-sm" />
            </div>
          </div>
        </>
      ) : (
        <div className="flex h-full flex-col gap-2 p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-1.5">
              <div className="bg-ink-900 size-4 rounded-[3px]" />
              <div className={cn(line, "w-10")} />
            </div>
            <div className="bg-ink-700 h-3 w-12 rounded-sm" />
          </div>
          <div className="border-ink-900 border-t-2 pt-1.5">
            <div className="flex gap-2">
              <div className={cn(line, "w-8")} />
              <div className={cn(line, "w-8")} />
              <div className={cn(line, "w-8")} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className={cn(line, "w-full")} />
            <div className={cn(line, "w-4/5")} />
          </div>
          <div className="flex justify-end">
            <div className="bg-ink-900 h-4 w-20 rounded-sm" />
          </div>
          <div className="border-ink-400/35 mt-auto flex h-6 overflow-hidden rounded-sm border">
            <div className="flex-[1.3]" />
            <div className="bg-ledger-50 flex-1" />
          </div>
        </div>
      )}
    </div>
  );
}
