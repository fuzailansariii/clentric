"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  invoiceSchema,
  type InvoiceFormInput,
  type InvoiceFormOutput,
} from "./schema";
import { createInvoiceAction } from "./actions";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { useRouter } from "next/navigation";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import FormSection from "@/components/dashboard/form-section";
import { ClientCombobox, ClientOption } from "@/components/client-combobox";
import { Field } from "@/components/ui/input";
import { ProjectCombobox, ProjectOption } from "@/components/project-combobox";
import { DatePickerField } from "@/components/date-picker-field";
import { dateToFormValue } from "@/lib/format-date";
import { Plus, Trash2 } from "lucide-react";
import { CustomButton } from "@/components/ui/custom-button";
import { formatCurrency, formatNumber } from "@/lib/format-currency";
import { calculateInvoiceTotals } from "@/lib/calculate-invoice-totals";

type InvoiceBuilderProps = {
  clients: ClientOption[];
  projects: ProjectOption[];
};

export default function InvoiceBuilder({
  clients,
  projects,
}: InvoiceBuilderProps) {
  const [formError, setFormError] = useState("");
  const router = useRouter();

  const form = useForm<InvoiceFormInput, any, InvoiceFormOutput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: "",
      issueDate: dateToFormValue(new Date()),
      dueDate: dateToFormValue(new Date()),
      taxRate: 0,
      lineItems: [{ description: "", quantity: 1, rate: 0 }],
    },
  });

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    control,
  } = form;

  const watchedLineItems = useWatch({
    control,
    name: "lineItems",
  });

  const watchedTaxRate = useWatch({
    control,
    name: "taxRate",
  });

  const selectedClientId = useWatch({
    control,
    name: "clientId",
  });
  const filteredProjects = projects.filter(
    (project) => project.clientId === selectedClientId,
  );

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const handleClientChange = (
    onChange: (value: string) => void,
    value: string,
  ) => {
    onChange(value);
    setValue("projectId", undefined, {
      shouldDirty: true,
      shouldValidate: false,
    });
  };

  const { subtotal, taxRate, taxAmount, total } = calculateInvoiceTotals(
    watchedLineItems,
    watchedTaxRate,
  );

  const onSubmit = handleSubmit(async (data: InvoiceFormOutput) => {
    await runActionWithToast(createInvoiceAction(data), {
      loading: "Creating invoice.",
      success: "Invoice created.",
      onSuccess: ({ invoiceId }) => {
        router.push(`/invoices/${invoiceId}`);
      },
      onError: setFormError,
    });
  });

  return (
    <>
      <PageHeader
        title="New Invoice"
        subtitle="Bill a client for completed work with line items, tax, and due dates."
        backHref="/invoices"
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Invoices", href: "/invoices" },
          { label: "New" },
        ]}
      />
      <DashboardContainer>
        <form onSubmit={onSubmit} className="mx-auto max-w-4xl pb-12">
          <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
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
                      onChange={(value) =>
                        handleClientChange(field.onChange, value)
                      }
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
                      onChange={field.onChange}
                      value={field.value}
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

            <FormSection
              title="What are you billing for?"
              step="03 Line Items"
              description="Add the services or products included in this invoice."
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="text-muted-foreground hidden grid-cols-[1fr_100px_140px_140px_40px] gap-3 px-1 text-xs font-medium sm:grid">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Amount</span>
                  <span />
                </div>

                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="border-border grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_100px_140px_140px_40px] sm:border-0 sm:p-0"
                  >
                    {/* Description */}
                    <Field
                      {...register(`lineItems.${index}.description`)}
                      placeholder="e.g. Website development"
                      error={errors.lineItems?.[index]?.description?.message}
                    />

                    {/* Quantity */}
                    <Field
                      {...register(`lineItems.${index}.quantity`)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="1"
                      error={errors.lineItems?.[index]?.quantity?.message}
                    />

                    {/* Rate */}
                    <Field
                      {...register(`lineItems.${index}.rate`)}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      prefix="$"
                      error={errors.lineItems?.[index]?.rate?.message}
                    />

                    {/* Amount */}
                    <div className="border-border bg-input/20 flex h-10 items-center rounded-lg border px-3 text-sm font-medium">
                      {formatCurrency(
                        String(
                          Number(watchedLineItems[index]?.quantity || 0) *
                            Number(watchedLineItems[index]?.rate || 0),
                        ),
                      )}
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

                {/* Add item */}
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
            <div className="mr-5 mb-5 flex items-center justify-end gap-5">
              <CustomButton
                type="button"
                variant="secondary"
                onClick={() => router.push("/invoices")}
              >
                Cancel
              </CustomButton>
              <CustomButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Invoice"}
              </CustomButton>
            </div>
          </div>
        </form>
      </DashboardContainer>
      {/* Live preview of invoice */}
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium">{formatCurrency(String(subtotal))}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-muted-foreground">
          Tax ({formatNumber(taxRate)}%)
        </span>
        <span className="font-medium">{formatCurrency(String(taxAmount))}</span>
      </div>

      <div className="border-border flex justify-between border-t pt-3 text-base font-semibold">
        <span>Total</span>
        <span>{formatCurrency(String(total))}</span>
      </div>

      {formError && (
        <div className="border-danger-200 bg-danger-50 text-danger-700 mx-auto mb-4 max-w-4xl rounded-lg border px-4 py-3 text-sm">
          {formError}
        </div>
      )}
    </>
  );
}
