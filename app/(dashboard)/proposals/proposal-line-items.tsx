import {
  type FieldArrayWithId,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Field } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format-currency";
import type { ProposalFormInput } from "./schema";

// Proposals have no unit concept — a quote line is a description, a quantity
// and a rate. That is why this is its own component rather than the invoice
// line editor, which is built around billable units.
type ProposalLineItemsProps = {
  fields: FieldArrayWithId<ProposalFormInput, "items">[];
  register: UseFormRegister<ProposalFormInput>;
  errors: FieldErrors<ProposalFormInput>;
  watchedItems: ProposalFormInput["items"];
  remove: (index: number) => void;
};

export default function ProposalLineItems({
  fields,
  register,
  errors,
  watchedItems,
  remove,
}: ProposalLineItemsProps) {
  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] sm:rounded-none sm:border-0 sm:border-b sm:p-0 sm:pb-4 sm:last:border-b-0 sm:last:pb-0"
        >
          <Field
            {...register(`items.${index}.description`)}
            label="Description"
            placeholder="e.g. Brand identity design"
            error={errors.items?.[index]?.description?.message}
          />

          <Field
            {...register(`items.${index}.quantity`)}
            label="Qty"
            type="number"
            min="0"
            step="0.01"
            placeholder="1"
            error={errors.items?.[index]?.quantity?.message}
          />

          <Field
            {...register(`items.${index}.rate`)}
            label="Rate"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            prefix="$"
            error={errors.items?.[index]?.rate?.message}
          />

          {/* Read-only mirror of what the server will compute. The stored
              figure always comes from the action, never from this. */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground font-sans text-[13px] font-medium">
              Amount
            </label>
            <div className="border-border bg-input/20 flex h-11 items-center rounded-lg border px-3 text-sm font-medium">
              {formatCurrency(
                String(
                  Number(watchedItems?.[index]?.quantity || 0) *
                    Number(watchedItems?.[index]?.rate || 0),
                ),
              )}
            </div>
          </div>

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
      ))}
    </div>
  );
}
