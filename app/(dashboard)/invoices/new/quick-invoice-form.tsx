"use client";
import React, { SubmitEvent, type ReactNode } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import {
  ProjectCombobox,
  type ProjectOption,
} from "@/components/project-combobox";
import { DatePickerField } from "@/components/date-picker-field";
import { Field } from "@/components/ui/input";
import FormSection from "@/components/dashboard/form-section";
import type { InvoiceFormInput } from "../schema";

type QuickInvoiceFormProps = {
  control: Control<InvoiceFormInput>;
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  /** Saved-client picker or typed "Bill to" (BillToField). */
  clientField: ReactNode;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  filteredProjects: ProjectOption[];
};

export default function QuickInvoiceForm({
  control,
  register,
  errors,
  clientField,
  onSubmit,
  filteredProjects,
}: QuickInvoiceFormProps) {
  return (
    <form onSubmit={onSubmit} className="pb-12">
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <FormSection
          title="Create your invoice"
          step="01 Invoice details"
          description="Add the essentials and we'll take care of the rest."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Client */}
            {clientField}

            {/* Description */}
            <Field
              {...register("lineItems.0.description")}
              label="What are you billing for?"
              placeholder="e.g. Website design"
              error={errors.lineItems?.[0]?.description?.message}
            />

            {/* Amount */}
            <Field
              {...register("lineItems.0.rate")}
              label="Amount"
              placeholder="0"
              prefix="$"
              type="number"
              min={0}
              step="0.01"
              error={errors.lineItems?.[0]?.rate?.message}
            />

            {/* Due date */}
            <Controller
              control={control}
              name="dueDate"
              render={({ field }) => (
                <DatePickerField
                  label="Due Date"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.dueDate?.message}
                  disablePast
                />
              )}
            />
          </div>
        </FormSection>

        <FormSection
          title="Optional details"
          step="02 Optional"
          description="Add a project or tax if they apply to this invoice."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Project */}
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <ProjectCombobox
                  projects={filteredProjects}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  error={errors.projectId?.message}
                />
              )}
            />

            {/* Tax */}
            <Field
              {...register("taxRate")}
              label="Tax Rate"
              placeholder="0"
              suffix="%"
              type="number"
              min={0}
              step="0.01"
              error={errors.taxRate?.message}
            />

            {/* Notes, printed at the bottom of the invoice */}
            <div className="sm:col-span-2">
              <Field
                {...register("notes")}
                multiline
                rows={3}
                label="Notes"
                placeholder="e.g. Thanks for your business!"
                error={errors.notes?.message}
              />
            </div>
          </div>
        </FormSection>
      </div>
    </form>
  );
}
