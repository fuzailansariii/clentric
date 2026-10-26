import React from "react";
import {
  Controller,
  type Control,
  type UseFormRegister,
  type FieldErrors,
  type FieldArrayWithId,
} from "react-hook-form";
import { XIcon } from "lucide-react";
import { RiseRow } from "@/components/ui/rise";
import { InvoiceFormInput } from "./schema";
import { Field } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format-currency";
import { lineItemUnitOptions, lineItemUnits } from "@/lib/format-line-item";
import { cn } from "@/lib/utils";
import type { InvoiceItemUnit } from "@/src/db/schema/invoice-items";

type LineitemsProps = {
  fields: FieldArrayWithId<InvoiceFormInput, "lineItems">[];
  register: UseFormRegister<InvoiceFormInput>;
  control: Control<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  watchedLineItems: InvoiceFormInput["lineItems"];
  remove: (index: number) => void;
  onUnitChange: (index: number, unit: InvoiceItemUnit) => void;
};

// Phone: description on its own row, then unit · qty · rate · amount.
const ROW = cn(
  "grid items-start gap-2",
  "grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem]",
  "@[640px]:grid-cols-[1.25rem_minmax(0,1fr)_6.5rem_5.5rem_8rem_6.5rem_2.75rem]",
);

// Phone has no header row, so each box gets its own small label.
const CAPTION = "text-muted-foreground mb-1 block text-xs @[640px]:hidden";

export default function LineItems({
  fields,
  errors,
  register,
  control,
  remove,
  watchedLineItems,
  onUnitChange,
}: LineitemsProps) {
  return (
    <div className="@container">
      <div
        aria-hidden="true"
        className={cn(
          ROW,
          "text-muted-foreground hidden pb-1.5 text-xs @[640px]:grid",
        )}
      >
        <span />
        <span>Description</span>
        <span>Unit</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Rate</span>
        <span className="text-right">Amount</span>
        <span />
      </div>

      {fields.map((field, index) => {
        const unit = watchedLineItems[index]?.unit ?? "item";
        const unitCopy = lineItemUnits[unit];
        const amount =
          Number(watchedLineItems[index]?.quantity || 0) *
          Number(watchedLineItems[index]?.rate || 0);
        const n = index + 1;

        return (
          <RiseRow key={field.id} className={cn(ROW, "border-t py-2.5")}>
            <span className="text-muted-foreground font-space hidden pt-3 text-xs tabular-nums @[640px]:block">
              {n}
            </span>

            <div className="col-span-3 @[640px]:col-span-1">
              <Field
                {...register(`lineItems.${index}.description`)}
                aria-label={`Line ${n} description`}
                placeholder="Description"
                error={errors.lineItems?.[index]?.description?.message}
              />
            </div>

            <div>
              <span aria-hidden="true" className={CAPTION}>
                Unit
              </span>
              <Controller
                control={control}
                name={`lineItems.${index}.unit`}
                render={({ field: unitField }) => (
                  <Select
                    value={unitField.value ?? "item"}
                    onValueChange={(value) =>
                      onUnitChange(index, value as InvoiceItemUnit)
                    }
                  >
                    <SelectTrigger
                      aria-label={`Line ${n} unit`}
                      className="h-11! w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {lineItemUnitOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Quantity: placeholder follows the unit ("Hours", "Days") */}
            <div>
              <span aria-hidden="true" className={cn(CAPTION, "text-right")}>
                {unitCopy.quantityLabel}
              </span>
              <Field
                {...register(`lineItems.${index}.quantity`)}
                aria-label={`Line ${n} ${unitCopy.quantityLabel.toLowerCase()}`}
                inputMode="decimal"
                placeholder={unitCopy.quantityLabel}
                className="text-right"
                error={errors.lineItems?.[index]?.quantity?.message}
              />
            </div>

            <div className="col-start-1 row-start-3 @[640px]:col-start-auto @[640px]:row-start-auto">
              <span aria-hidden="true" className={cn(CAPTION, "text-right")}>
                Rate
              </span>
              <Field
                {...register(`lineItems.${index}.rate`)}
                aria-label={`Line ${n} rate`}
                inputMode="decimal"
                placeholder="0"
                prefix="$"
                suffix={unitCopy.rateSuffix}
                className="text-right"
                error={errors.lineItems?.[index]?.rate?.message}
              />
            </div>

            <div className="col-start-2 row-start-3 text-right @[640px]:col-start-auto @[640px]:row-start-auto">
              <span aria-hidden="true" className={CAPTION}>
                Amount
              </span>
              <span className="font-space flex h-11 items-center justify-end text-sm font-medium tabular-nums">
                {formatCurrency(String(amount))}
              </span>
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              disabled={fields.length === 1}
              className="text-muted-foreground hover:text-danger-600 focus-visible:ring-ring col-start-3 row-start-2 inline-flex size-11 items-center justify-center self-end rounded-lg transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30 @[640px]:col-start-auto @[640px]:row-start-auto @[640px]:self-start"
              aria-label={`Remove line ${n}`}
            >
              <XIcon className="size-4" />
            </button>
          </RiseRow>
        );
      })}
    </div>
  );
}
