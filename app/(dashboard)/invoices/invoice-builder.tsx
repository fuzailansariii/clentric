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
import { Plus } from "lucide-react";
import { calculateInvoiceTotals } from "@/lib/calculate-invoice-totals";
import LineItems from "./line-items";
import InvoicePreview from "@/components/preview/invoice-preview";

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

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedProjectId = useWatch({ control, name: "projectId" });
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const watchedDueDate = useWatch({ control, name: "dueDate" });

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
        reset();
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
        {formError && (
          <div className="border-danger-200 bg-danger-50 text-danger-700 mx-auto mb-4 max-w-4xl rounded-lg border px-4 py-3 text-sm">
            {formError}
          </div>
        )}
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Invoice details form */}
          <form onSubmit={onSubmit} className="pb-12">
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
                  <LineItems
                    fields={fields}
                    register={register}
                    errors={errors}
                    watchedLineItems={watchedLineItems}
                    remove={remove}
                  />

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
            </div>
          </form>

          {/* Invoice Preview */}
          <InvoicePreview
            projectName={selectedProject?.title}
            clientName={selectedClient?.name}
            dueDate={watchedDueDate}
            subTotal={subtotal}
            taxRate={taxRate}
            taxAmount={taxAmount}
            total={total}
            onSubmit={onSubmit}
            onCancel={() => router.push("/invoices")}
            isSubmitting={isSubmitting}
          />
        </div>
      </DashboardContainer>
    </>
  );
}
