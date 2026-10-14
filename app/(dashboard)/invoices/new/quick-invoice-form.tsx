"use client";

import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { DetailCard } from "@/components/dashboard/detail-parts";
import { Field } from "@/components/ui/input";
import type { InvoiceFormInput } from "../schema";

type QuickInvoiceFormProps = {
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
};

/** Quick mode: one description and one amount, then the optional extras. */
export default function QuickInvoiceForm({
  register,
  errors,
}: QuickInvoiceFormProps) {
  return (
    <DetailCard title="What you're billing" className="@container">
      <div className="grid gap-4 @[560px]:grid-cols-2">
        <div className="@[560px]:col-span-2">
          <Field
            {...register("lineItems.0.description")}
            label="Description"
            placeholder="e.g. Stage 3 · Visual design"
            error={errors.lineItems?.[0]?.description?.message}
          />
        </div>
        <Field
          {...register("lineItems.0.rate")}
          label="Amount"
          placeholder="0.00"
          prefix="$"
          inputMode="decimal"
          error={errors.lineItems?.[0]?.rate?.message}
        />
      </div>

      <p className="text-muted-foreground mt-5 mb-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase">
        Optional
      </p>
      <InvoiceExtras register={register} errors={errors} />
    </DetailCard>
  );
}

/** Tax rate and the note printed at the bottom; shared by both modes. */
export function InvoiceExtras({ register, errors }: QuickInvoiceFormProps) {
  return (
    <div className="grid gap-4 @[560px]:grid-cols-2">
      <Field
        {...register("taxRate")}
        label="Tax rate"
        placeholder="0"
        suffix="%"
        inputMode="decimal"
        error={errors.taxRate?.message}
      />
      <div className="@[560px]:col-span-2">
        <Field
          {...register("notes")}
          multiline
          rows={3}
          label="Note to client"
          placeholder="Thanks for the work together this month"
          error={errors.notes?.message}
        />
      </div>
    </div>
  );
}
