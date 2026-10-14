"use client";

import type {
  Control,
  FieldErrors,
  UseFieldArrayReturn,
  UseFormRegister,
} from "react-hook-form";
import { PlusIcon } from "lucide-react";
import { DetailCard } from "@/components/dashboard/detail-parts";
import { CustomButton } from "@/components/ui/custom-button";
import { formatCurrency } from "@/lib/format-currency";
import type { InvoiceItemUnit } from "@/src/db/schema/invoice-items";
import LineItems from "../line-items";
import type { InvoiceFormInput } from "../schema";
import { InvoiceExtras } from "./quick-invoice-form";

type DetailedInvoiceFormProps = {
  control: Control<InvoiceFormInput>;
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  fields: UseFieldArrayReturn<InvoiceFormInput, "lineItems">["fields"];
  watchedLineItems: InvoiceFormInput["lineItems"];
  append: UseFieldArrayReturn<InvoiceFormInput, "lineItems">["append"];
  remove: UseFieldArrayReturn<InvoiceFormInput, "lineItems">["remove"];
  onUnitChange: (index: number, unit: InvoiceItemUnit) => void;
  /** The default hourly rate in effect for the chosen client/project. */
  hourlyRateHint: { rate: number; source: string } | null;
};

/** Detailed mode: line items with units, then tax and the note. */
export default function DetailedInvoiceForm({
  control,
  register,
  errors,
  fields,
  watchedLineItems,
  append,
  remove,
  onUnitChange,
  hourlyRateHint,
}: DetailedInvoiceFormProps) {
  return (
    <DetailCard title="Line items" className="@container">
      <LineItems
        fields={fields}
        register={register}
        control={control}
        errors={errors}
        watchedLineItems={watchedLineItems}
        remove={remove}
        onUnitChange={onUnitChange}
      />

      <div className="flex flex-wrap items-center gap-3 border-t pt-2.5">
        <CustomButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            append({ description: "", quantity: 1, rate: "", unit: "item" })
          }
          className="gap-1.5"
        >
          <PlusIcon className="size-4" />
          Add line
        </CustomButton>
        {errors.lineItems?.root?.message && (
          <span className="text-danger-600 text-xs">
            {errors.lineItems.root.message}
          </span>
        )}
        {hourlyRateHint && (
          <span className="text-muted-foreground text-xs">
            Hour lines use the {hourlyRateHint.source} rate,{" "}
            {formatCurrency(String(hourlyRateHint.rate))}/hr
          </span>
        )}
      </div>

      <div className="mt-4">
        <InvoiceExtras register={register} errors={errors} />
      </div>
    </DetailCard>
  );
}
