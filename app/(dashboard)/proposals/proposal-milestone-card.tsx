"use client";

import {
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
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
  /** Removing the only stage would leave a proposal with nothing in it. */
  canRemove: boolean;
  onRemove: () => void;
};

const LINE = cn(
  "grid items-start gap-2",
  "grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem]",
  "@[560px]:grid-cols-[minmax(0,1fr)_4.5rem_7.5rem_6.5rem_2.75rem]",
);

// Phone has no header row, so each box gets its own small label.
const CAPTION =
  "text-muted-foreground mb-1 block text-xs @[560px]:hidden";

/**
 * One stage: name, when, description and the lines quoted under it.
 * Each card owns its own useFieldArray for `milestones.N.items`.
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
  const { fields, append, remove } = useFieldArray({
    control,
    name: `milestones.${index}.items`,
  });

  const stageErrors = errors.milestones?.[index];
  const items = useWatch({ control, name: `milestones.${index}.items` }) ?? [];
  const name = useWatch({ control, name: `milestones.${index}.name` }) ?? "";
  // Only named stages are saved as stages; a blank one is a plain list.
  const named = name.trim().length > 0;

  const price = items.reduce(
    (sum, item) => sum + Number(item?.quantity || 0) * Number(item?.rate || 0),
    0,
  );

  return (
    <div className="@container rounded-lg border p-3.5 sm:p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_2.75rem] gap-2 @[560px]:grid-cols-[minmax(0,1fr)_10rem_2.75rem]">
        <Field
          {...register(`milestones.${index}.name`)}
          aria-label={`Stage ${index + 1} name`}
          placeholder="Stage name, or leave blank for one plain list"
          error={stageErrors?.name?.message}
        />
        <div className="col-start-1 row-start-2 @[560px]:col-start-auto @[560px]:row-start-auto">
          <Field
            {...register(`milestones.${index}.timeframe`)}
            aria-label={`Stage ${index + 1} timing`}
            placeholder={named ? "When, e.g. Weeks 1-2" : "When"}
            disabled={!named}
            error={stageErrors?.timeframe?.message}
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove stage ${index + 1}`}
          className="text-muted-foreground hover:text-danger-600 focus-visible:ring-ring col-start-2 row-start-1 inline-flex size-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30 @[560px]:col-start-auto @[560px]:row-start-auto"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>

      {named && (
        <div className="mt-2">
          <Field
            {...register(`milestones.${index}.description`)}
            multiline
            rows={2}
            aria-label={`Stage ${index + 1} description`}
            placeholder="What this stage covers (optional)"
            error={stageErrors?.description?.message}
          />
        </div>
      )}

      <div
        aria-hidden="true"
        className={cn(
          LINE,
          "text-muted-foreground mt-3 hidden pb-1 text-xs @[560px]:grid",
        )}
      >
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Rate</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {fields.map((field, itemIndex) => {
        const itemErrors = stageErrors?.items?.[itemIndex];
        const amount =
          Number(items[itemIndex]?.quantity || 0) *
          Number(items[itemIndex]?.rate || 0);
        const n = itemIndex + 1;

        return (
          <div key={field.id} className={cn(LINE, "border-t py-2")}>
            <div className="col-span-4 @[560px]:col-span-1">
              <Field
                {...register(
                  `milestones.${index}.items.${itemIndex}.description`,
                )}
                aria-label={`Line ${n} description`}
                placeholder="Description"
                error={itemErrors?.description?.message}
              />
            </div>
            <div>
              <span aria-hidden="true" className={cn(CAPTION, "text-right")}>
                Qty
              </span>
              <Field
                {...register(`milestones.${index}.items.${itemIndex}.quantity`)}
                aria-label={`Line ${n} quantity`}
                inputMode="decimal"
                placeholder="1"
                className="text-right"
                error={itemErrors?.quantity?.message}
              />
            </div>
            <div>
              <span aria-hidden="true" className={cn(CAPTION, "text-right")}>
                Rate
              </span>
              <Field
                {...register(`milestones.${index}.items.${itemIndex}.rate`)}
                aria-label={`Line ${n} rate`}
                inputMode="decimal"
                placeholder="0"
                prefix={currencySymbol(currency)}
                className="text-right"
                error={itemErrors?.rate?.message}
              />
            </div>
            <div className="text-right">
              <span aria-hidden="true" className={CAPTION}>
                Amount
              </span>
              <span className="font-space flex h-11 items-center justify-end text-sm font-medium tabular-nums">
                {formatCurrency(String(amount), currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => remove(itemIndex)}
              disabled={fields.length === 1}
              aria-label={`Remove line ${n}`}
              className="text-muted-foreground hover:text-danger-600 focus-visible:ring-ring inline-flex size-11 items-center justify-center self-end rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30 @[560px]:self-start"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        );
      })}

      {stageErrors?.items?.message && (
        <p className="text-danger-600 text-xs">{stageErrors.items.message}</p>
      )}

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t pt-2.5">
        <CustomButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => append({ description: "", quantity: 1, rate: "" })}
          className="gap-1.5"
        >
          <PlusIcon className="size-4" />
          Add line
        </CustomButton>
        <span className="text-muted-foreground text-[13px]">
          Stage price{" "}
          <span className="font-space text-foreground font-medium tabular-nums">
            {formatCurrency(String(price), currency)}
          </span>
        </span>
      </div>
    </div>
  );
}
