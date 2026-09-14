import React from "react";
import {
  UseFormRegister,
  FieldErrors,
  FieldArrayWithId,
} from "react-hook-form";
import { InvoiceFormInput } from "./schema";
import { Field } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format-currency";

type LineitemsProps = {
  fields: FieldArrayWithId<InvoiceFormInput, "lineItems">[];
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  watchedLineItems: InvoiceFormInput["lineItems"];
  remove: (index: number) => void;
};

export default function LineItems({
  fields,
  errors,
  register,
  remove,
  watchedLineItems,
}: LineitemsProps) {
  return (
    <div>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_100px_140px_140px_40px] sm:border-0 sm:p-0"
        >
          {/* Description */}
          <Field
            {...register(`lineItems.${index}.description`)}
            label="Description"
            placeholder="e.g. Website development"
            error={errors.lineItems?.[index]?.description?.message}
          />

          {/* Quantity */}
          <Field
            {...register(`lineItems.${index}.quantity`)}
            label="Quantity"
            type="number"
            min="0"
            step="0.01"
            placeholder="1"
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
            error={errors.lineItems?.[index]?.rate?.message}
          />

          {/* Amount */}
          <div className="flex flex-col gap-0.5">
            <label className="text-muted-foreground font-sans text-[13px] font-medium">
              Amount
            </label>
            <div className="border-border bg-input/20 flex h-10 items-center rounded-lg border px-3 text-sm font-medium">
              {formatCurrency(
                String(
                  Number(watchedLineItems[index]?.quantity || 0) *
                    Number(watchedLineItems[index]?.rate || 0),
                ),
              )}
            </div>
          </div>

          {/* Remove */}
          <div className="flex items-center justify-end">
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
      ))}
    </div>
  );
}
