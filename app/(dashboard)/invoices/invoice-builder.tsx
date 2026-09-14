"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  invoiceSchema,
  type InvoiceFormInput,
  type InvoiceFormOutput,
} from "./schema";
import { createInvoiceAction, updateInvoiceAction } from "./actions";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { useRouter } from "next/navigation";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import { ClientOption } from "@/components/client-combobox";
import { ProjectOption } from "@/components/project-combobox";
import { dateToFormValue } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { calculateInvoiceTotals } from "@/lib/calculate-invoice-totals";
import InvoicePreview from "@/components/preview/invoice-preview";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import DetailedInvoiceForm from "./new/detailed-invoice-form";
import QuickInvoiceForm from "./new/quick-invoice-form";

/** An existing invoice loaded into the builder for editing. */
export type EditableInvoice = {
  id: string;
  invoiceNumber: number;
  clientId: string;
  projectId?: string;
  issueDate: string;
  dueDate: string;
  taxRate: number;
  lineItems: { description: string; quantity: number; rate: number }[];
};

type InvoiceBuilderProps = {
  clients: ClientOption[];
  projects: ProjectOption[];
  initialClientId?: string;
  initialProjectId?: string;
  /** When set, the builder edits this invoice instead of creating one. */
  invoice?: EditableInvoice;
};

export default function InvoiceBuilder({
  clients,
  projects,
  initialClientId,
  initialProjectId,
  invoice,
}: InvoiceBuilderProps) {
  const [mode, setMode] = useState<"quick" | "detailed">(
    invoice ? "detailed" : "quick",
  );
  const [showQuickConfirm, setShowQuickConfirm] = useState(false);
  const [formError, setFormError] = useState("");

  const router = useRouter();

  // `any` for the context generic is the project convention for z.coerce
  // schemas (CLAUDE.md: type useForm as useForm<Input, any, Output>()).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<InvoiceFormInput, any, InvoiceFormOutput>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: invoice
      ? {
          clientId: invoice.clientId,
          projectId: invoice.projectId,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          taxRate: invoice.taxRate,
          lineItems: invoice.lineItems,
        }
      : {
          clientId: initialClientId ?? "",
          projectId: initialProjectId ?? undefined,
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

  // to check if there is more than one item in the lineItems.
  const hasMeaningfulExtraLineItems = (): boolean => {
    if (watchedLineItems.length <= 1) return false;
    const extraItems = watchedLineItems.slice(1);
    return extraItems.some(
      (item) => item.description !== "" || Number(item.rate) > 0,
    );
  };

  function collapseToSingleLineItem() {
    const firstItem = watchedLineItems[0];
    replace([{ ...firstItem, quantity: 1 }]);
  }

  const handleQuickClick = () => {
    if (mode === "quick") return;
    if (hasMeaningfulExtraLineItems()) {
      setShowQuickConfirm(true);
    } else {
      setMode("quick");
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedProjectId = useWatch({ control, name: "projectId" });
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const watchedDueDate = useWatch({ control, name: "dueDate" });

  const fieldArray = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const { fields, append, remove, replace } = fieldArray;

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

  const invoicePath = invoice ? `/invoices/${invoice.id}` : "/invoices";
  const invoiceLabel = invoice
    ? formatInvoiceNumber(invoice.invoiceNumber)
    : null;

  // form submit handler
  const onSubmit = handleSubmit(async (data: InvoiceFormOutput) => {
    setFormError("");

    if (invoice) {
      await runActionWithToast(
        updateInvoiceAction({ ...data, invoiceId: invoice.id }),
        {
          loading: "Saving invoice...",
          success: "Invoice updated.",
          onSuccess: () => router.push(`/invoices/${invoice.id}`),
          onError: setFormError,
        },
      );
      return;
    }

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
        title={invoiceLabel ? `Edit ${invoiceLabel}` : "New Invoice"}
        subtitle={
          invoice
            ? "Update the client, dates, tax, or line items."
            : "Bill a client for completed work with line items, tax, and due dates."
        }
        backHref={invoicePath}
        breadcrumbs={
          invoiceLabel
            ? [
                { label: "Dashboard", href: "/dashboard" },
                { label: "Invoices", href: "/invoices" },
                { label: invoiceLabel, href: invoicePath },
                { label: "Edit" },
              ]
            : [
                { label: "Dashboard", href: "/dashboard" },
                { label: "Invoices", href: "/invoices" },
                { label: "New" },
              ]
        }
      />
      <DashboardContainer>
        {formError && (
          <div className="border-danger-200 bg-danger-50 text-danger-700 mx-auto mb-4 max-w-4xl rounded-lg border px-4 py-3 text-sm">
            {formError}
          </div>
        )}
        <div className="mb-6 flex w-full justify-end">
          <div className="border-border bg-secondary flex w-full items-center rounded-lg border p-1 sm:w-auto">
            <button
              type="button"
              onClick={handleQuickClick}
              className={cn(
                "relative flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 sm:flex-none sm:px-5",
                mode === "quick"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Quick
            </button>

            <button
              type="button"
              onClick={() => setMode("detailed")}
              className={cn(
                "relative flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200 sm:flex-none sm:px-5",
                mode === "detailed"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="@container">
          <div className="grid gap-8 @[900px]:grid-cols-[minmax(0,1fr)_360px]">
            {/* Invoice details form */}
            {mode === "quick" ? (
              <QuickInvoiceForm
                control={control}
                register={register}
                errors={errors}
                clients={clients}
                onSubmit={onSubmit}
                filteredProjects={filteredProjects}
                onClientChange={handleClientChange}
              />
            ) : (
              <DetailedInvoiceForm
                control={control}
                register={register}
                errors={errors}
                clients={clients}
                filteredProjects={filteredProjects}
                fields={fields}
                watchedLineItems={watchedLineItems}
                append={append}
                remove={remove}
                onClientChange={handleClientChange}
                onSubmit={onSubmit}
              />
            )}

            {/* Invoice Preview */}
            <div className="sticky top-6 self-start">
              <InvoicePreview
                projectName={selectedProject?.title}
                clientName={selectedClient?.name}
                dueDate={watchedDueDate}
                subTotal={subtotal}
                taxRate={taxRate}
                taxAmount={taxAmount}
                total={total}
                onSubmit={onSubmit}
                onCancel={() => router.push(invoicePath)}
                isSubmitting={isSubmitting}
                editing={
                  invoiceLabel ? { invoiceNumber: invoiceLabel } : undefined
                }
              />
            </div>
          </div>
        </div>
        <ConfirmDialog
          open={showQuickConfirm}
          onOpenChange={setShowQuickConfirm}
          title="Switch to Quick mode?"
          description="This will keep only your first line item and remove the rest. This can't be undone."
          confirmLabel="Switch to Quick"
          variant="destructive"
          onConfirm={() => {
            collapseToSingleLineItem();
            setMode("quick");
          }}
        />
      </DashboardContainer>
    </>
  );
}
