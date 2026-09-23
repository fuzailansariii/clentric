"use client";

import { useState } from "react";
import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { Field } from "@/components/ui/input";
import { currencySymbol, formatCurrency } from "@/lib/format-currency";
import { cn } from "@/lib/utils";
import type { ProposalFormInput } from "./schema";

type ProposalMilestoneCardProps = {
  index: number;
  control: Control<ProposalFormInput>;
  register: UseFormRegister<ProposalFormInput>;
  errors: FieldErrors<ProposalFormInput>;
  currency: string;
  /** Removing the only milestone would leave a proposal with nothing in it. */
  canRemove: boolean;
  onRemove: () => void;
};

/**
 * One collapsible milestone: its name, an optional description, and the line
 * items quoted under it.
 *
 * Each card owns its own useFieldArray for `milestones.N.items`, which is why
 * this is a component rather than a loop in the builder — hooks cannot run
 * inside a map.
 */
export default function ProposalMilestoneCard({
  index,
  control,
  register,
  errors,
  currency,
  canRemove,
  onRemove,
}: ProposalMilestoneCardProps) {
  const [open, setOpen] = useState(true);

  const { fields, append, remove } = useFieldArray({
    control,
    name: `milestones.${index}.items`,
  });

  const milestoneErrors = errors.milestones?.[index];

  const watchedItems =
    useWatch({ control, name: `milestones.${index}.items` }) ?? [];
  const watchedName = useWatch({ control, name: `milestones.${index}.name` });

  const milestoneSubtotal = watchedItems.reduce(
    (sum, item) => sum + Number(item?.quantity || 0) * Number(item?.rate || 0),
    0,
  );

  return (
    <div className="border-border bg-background @container overflow-hidden rounded-xl border">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              !open && "-rotate-90",
            )}
          />
          <span className="text-foreground min-w-0 truncate text-sm font-medium">
            {watchedName?.trim() || `Milestone ${index + 1}`}
          </span>
        </button>

        <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
          {formatCurrency(String(milestoneSubtotal), currency)}
        </span>

        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove ${watchedName?.trim() || `milestone ${index + 1}`}`}
          className="text-muted-foreground hover:text-danger-600 focus-visible:ring-ring inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="border-border flex flex-col gap-4 border-t px-3 py-4 sm:px-4">
          <div className="grid gap-4 @[520px]:grid-cols-2">
            <Field
              {...register(`milestones.${index}.name`)}
              label="Milestone name (optional)"
              placeholder="e.g. Discovery — leave blank for a single list"
              error={milestoneErrors?.name?.message}
            />
            <Field
              {...register(`milestones.${index}.description`)}
              label="Short description (optional)"
              placeholder="What this stage covers"
              error={milestoneErrors?.description?.message}
            />
          </div>

          <div className="flex flex-col gap-3">
            {fields.map((field, itemIndex) => {
              const itemErrors = milestoneErrors?.items?.[itemIndex];
              const quantity = Number(watchedItems[itemIndex]?.quantity || 0);
              const rate = Number(watchedItems[itemIndex]?.rate || 0);

              return (
                <div
                  key={field.id}
                  className="border-border rounded-lg border p-3 @[520px]:rounded-none @[520px]:border-0 @[520px]:border-b @[520px]:p-0 @[520px]:pb-3 @[520px]:last:border-b-0 @[520px]:last:pb-0"
                >
                  {/* Mobile first: description on its own full-width line,
                      qty and rate side by side under it. From 520px the row
                      becomes one horizontal line. Qty and rate keep fixed
                      minimums so the number inputs stay tappable. */}
                  <div className="flex flex-col gap-3 @[520px]:flex-row @[520px]:items-start @[520px]:gap-3">
                    <div className="min-w-0 @[520px]:flex-1">
                      <Field
                        {...register(
                          `milestones.${index}.items.${itemIndex}.description`,
                        )}
                        label="Description"
                        placeholder="e.g. Brand identity design"
                        error={itemErrors?.description?.message}
                      />
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-20 shrink-0 @[520px]:w-[68px]">
                        <Field
                          {...register(
                            `milestones.${index}.items.${itemIndex}.quantity`,
                          )}
                          label="Qty"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="1"
                          error={itemErrors?.quantity?.message}
                        />
                      </div>

                      <div className="w-28 shrink-0 @[520px]:w-[104px]">
                        <Field
                          {...register(
                            `milestones.${index}.items.${itemIndex}.rate`,
                          )}
                          label="Rate"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          prefix={currencySymbol(currency)}
                          error={itemErrors?.rate?.message}
                        />
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-1 @[520px]:w-[104px] @[520px]:flex-none">
                        <span className="text-muted-foreground font-sans text-[13px] font-medium">
                          Amount
                        </span>
                        <div className="border-border bg-input/20 flex h-11 items-center justify-end rounded-lg border px-3 text-sm font-medium tabular-nums">
                          {formatCurrency(String(quantity * rate), currency)}
                        </div>
                      </div>

                      <div className="flex items-end self-stretch pb-0.5">
                        <button
                          type="button"
                          onClick={() => remove(itemIndex)}
                          disabled={fields.length === 1}
                          aria-label="Remove line item"
                          className="text-muted-foreground hover:text-danger-600 focus-visible:ring-ring inline-flex h-11 w-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {milestoneErrors?.items?.message && (
            <p className="text-danger-600 text-xs">
              {milestoneErrors.items.message}
            </p>
          )}

          <button
            type="button"
            onClick={() => append({ description: "", quantity: 1, rate: 0 })}
            className="text-primary focus-visible:ring-ring inline-flex w-fit items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" />
            Add line item
          </button>
        </div>
      )}
    </div>
  );
}
