import React from "react";
import {
  Controller,
  type Control,
  type UseFormRegister,
  type FieldErrors,
  type FieldArrayWithId,
} from "react-hook-form";
import { InvoiceFormInput } from "./schema";
import { Field } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";
import { lineItemUnitOptions, lineItemUnits } from "@/lib/format-line-item";
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
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => {
        const unit = watchedLineItems[index]?.unit ?? "item";
        const unitCopy = lineItemUnits[unit];

        return (
          <div
            key={field.id}
            className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[112px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] sm:rounded-none sm:border-0 sm:border-b sm:p-0 sm:pb-4 sm:last:border-b-0 sm:last:pb-0"
          >
            {/* Description */}
            <div className="sm:col-span-5">
              <Field
                {...register(`lineItems.${index}.description`)}
                label="Description"
                placeholder="e.g. Website development"
                error={errors.lineItems?.[index]?.description?.message}
              />
            </div>

            {/* Unit */}
            <Controller
              control={control}
              name={`lineItems.${index}.unit`}
              render={({ field: unitField }) => (
                <div className="flex flex-col gap-1">
                  <label className="text-muted-foreground font-sans text-[13px] font-medium">
                    Unit
                  </label>
                  <Select
                    value={unitField.value ?? "item"}
                    onValueChange={(value) =>
                      onUnitChange(index, value as InvoiceItemUnit)
                    }
                  >
                    <SelectTrigger className="h-10 w-full">
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
                </div>
              )}
            />

            {/* Quantity — labelled by unit ("Hours", "Days") */}
            <Field
              {...register(`lineItems.${index}.quantity`)}
              label={unitCopy.quantityLabel}
              type="number"
              min="0"
              step="0.01"
              placeholder={unit === "item" ? "1" : "e.g. 7.5"}
              error={errors.lineItems?.[index]?.quantity?.message}
            />

            {/* Rate */}
            <Field
              {...register(`lineItems.${index}.rate`)}
              label="Rate"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              prefix="$"
              suffix={unitCopy.rateSuffix}
              error={errors.lineItems?.[index]?.rate?.message}
            />

            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground font-sans text-[13px] font-medium">
                Amount
              </label>
              <div className="border-border bg-input/20 flex h-11 items-center rounded-lg border px-3 text-sm font-medium">
                {formatCurrency(
                  String(
                    Number(watchedLineItems[index]?.quantity || 0) *
                      Number(watchedLineItems[index]?.rate || 0),
                  ),
                )}
              </div>
            </div>

            {/* Remove */}
            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
                className="text-muted-foreground hover:text-danger-600 inline-flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30"
                aria-label="Remove line item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
