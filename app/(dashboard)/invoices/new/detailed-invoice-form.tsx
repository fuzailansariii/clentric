"use client";

import React, { SubmitEvent } from "react";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFieldArrayReturn,
} from "react-hook-form";
import { ClientCombobox, ClientOption } from "@/components/client-combobox";
import { ProjectCombobox, ProjectOption } from "@/components/project-combobox";
import { DatePickerField } from "@/components/date-picker-field";
import { Field } from "@/components/ui/input";
import FormSection from "@/components/dashboard/form-section";
import { Plus } from "lucide-react";
import { InvoiceFormInput } from "../schema";
import LineItems from "../line-items";

type DetailedInvoiceFormProps = {
  control: Control<InvoiceFormInput>;
  register: UseFormRegister<InvoiceFormInput>;
  errors: FieldErrors<InvoiceFormInput>;
  clients: ClientOption[];
  filteredProjects: ProjectOption[];
  fields: UseFieldArrayReturn<InvoiceFormInput, "lineItems">["fields"];
  watchedLineItems: InvoiceFormInput["lineItems"];
  append: UseFieldArrayReturn<InvoiceFormInput, "lineItems">["append"];
  remove: UseFieldArrayReturn<InvoiceFormInput, "lineItems">["remove"];
  onClientChange: (onChange: (value: string) => void, value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
};

export default function DetailedInvoiceForm({
  control,
  register,
  errors,
  clients,
  filteredProjects,
  fields,
  watchedLineItems,
  append,
  remove,
  onClientChange,
  onSubmit,
}: DetailedInvoiceFormProps) {
  return (
    <form onSubmit={onSubmit} className="pb-12">
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        {/* Client & Project */}
        <FormSection
          title="Who's this invoice for?"
          step="01 Client & Project"
          description="Choose the client being billed, and optionally link it to a project."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <ClientCombobox
                  clients={clients}
                  value={field.value}
                  onChange={(value) => onClientChange(field.onChange, value)}
                  error={errors.clientId?.message}
                />
              )}
            />

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
          </div>
        </FormSection>

        {/* Invoice Details */}
        <FormSection
          title="Invoice details"
          step="02 Dates & Tax"
          description="Set when this invoice is issued, when it's due, and any applicable tax rate."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={control}
              name="issueDate"
              render={({ field }) => (
                <DatePickerField
                  label="Issue Date"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.issueDate?.message}
                />
              )}
            />

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

            <Field
              {...register("taxRate")}
              label="Tax Rate"
              placeholder="0"
              suffix="%"
              error={errors.taxRate?.message}
            />
          </div>
        </FormSection>

        {/* Line Items */}
        <FormSection
          title="What are you billing for?"
          step="03 Line Items"
          description="Add the services or products included in this invoice."
        >
          <div className="space-y-4">
            <LineItems
              fields={fields}
              register={register}
              errors={errors}
              watchedLineItems={watchedLineItems}
              remove={remove}
            />

            <button
              type="button"
              onClick={() =>
                append({
                  description: "",
                  quantity: 1,
                  rate: 0,
                })
              }
              className="text-primary hover:text-primary/80 inline-flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add line item
            </button>
          </div>
        </FormSection>
      </div>
    </form>
  );
}
