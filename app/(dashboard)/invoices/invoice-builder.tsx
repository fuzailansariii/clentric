"use client";

import { MotionConfig, motion } from "motion/react";
import { useEnterInitial } from "@/components/ui/rise";
import { rise } from "@/lib/motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  invoiceSchema,
  type InvoiceFormInput,
  type InvoiceFormOutput,
} from "./schema";
import {
  createInvoiceAction,
  sendInvoiceAction,
  updateInvoiceAction,
} from "./actions";
import type { ActionResult } from "@/lib/action-result";
import { warnNotEmailed } from "@/lib/email/warn-not-emailed";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { scrollToFirstError } from "@/lib/scroll-to-first-error";
import type { ReturnTo } from "@/lib/return-to";
import PageHeader from "@/components/dashboard/page-header";
import {
  FormActionBar,
  useLeaveAfterSave,
} from "@/components/dashboard/form-action-bar";
import { DetailCard } from "@/components/dashboard/detail-parts";
import { ClientOption } from "@/components/client-combobox";
import {
  ProjectCombobox,
  type ProjectOption,
} from "@/components/project-combobox";
import { DatePickerField } from "@/components/date-picker-field";
import { CustomButton } from "@/components/ui/custom-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { addDays } from "date-fns";
import { dateToFormValue, formValueToDate } from "@/lib/format-date";
import { formatInvoiceNumber } from "@/lib/format-invoice-number";
import { calculateInvoiceTotals } from "@/lib/calculate-totals";
import { projectLedger } from "@/lib/project-ledger";
import { BudgetLine } from "./budget-line";
import { BillToField } from "./bill-to-field";
import InvoicePreview from "@/components/preview/invoice-preview";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { invoiceSendDescription } from "@/lib/send-confirm";
import type { InvoiceItemUnit } from "@/src/db/schema/invoice-items";
import DetailedInvoiceForm from "./new/detailed-invoice-form";
import QuickInvoiceForm from "./new/quick-invoice-form";

/** An existing invoice loaded into the builder for editing. */
export type EditableInvoice = {
  id: string;
  /** Only a draft may be saved half-written. */
  status: "draft" | "sent" | "overdue" | "paid";
  invoiceNumber: number;
  numberPrefix: string;
  clientId: string;
  projectId?: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRate: number;
  notes: string;
  showProjectBalance: boolean;
  lineItems: {
    description: string;
    quantity: number;
    rate: number;
    unit: InvoiceItemUnit;
    milestoneId?: string;
  }[];
};

/** Starting values for a brand-new invoice (users.* defaults columns). */
export type NewInvoiceDefaults = {
  paymentTermsDays: number;
  taxRate: number;
  notes: string;
  /** e.g. "INV-015" - what the next invoice will most likely be numbered. */
  nextNumberLabel: string;
};

type InvoiceBuilderProps = {
  /** Who the invoice is from, for the live preview's header. */
  issuerName: string;
  clients: ClientOption[];
  projects: ProjectOption[];
  initialClientId?: string;
  initialProjectId?: string;
  /** When set, the builder edits this invoice instead of creating one. */
  invoice?: EditableInvoice;
  /** Starting values for a new invoice. Ignored when editing. */
  defaults?: NewInvoiceDefaults;
  /** First line of a new invoice, e.g. the milestone from "Invoice stage N". */
  initialLine?: EditableInvoice["lineItems"][number];
  /** Where to go after creating, when opened from the dashboard's setup. */
  returnTo?: ReturnTo | null;
  /** Set when the plan has no room for another client: no "Bill someone new". */
  newClientBlocked?: string | null;
};

const MODES = [
  { value: "quick", label: "Quick" },
  { value: "detailed", label: "Detailed" },
] as const;

/** Due-date shortcuts: due = issue date + N days. */
const TERMS = [
  { value: "0", label: "On receipt" },
  { value: "7", label: "Net 7" },
  { value: "14", label: "Net 14" },
  { value: "30", label: "Net 30" },
] as const;
type Term = (typeof TERMS)[number]["value"];

const isTerm = (days: number): days is 0 | 7 | 14 | 30 =>
  [0, 7, 14, 30].includes(days);

export default function InvoiceBuilder({
  issuerName,
  clients,
  projects,
  initialClientId,
  initialProjectId,
  invoice,
  defaults,
  initialLine,
  returnTo = null,
  newClientBlocked = null,
}: InvoiceBuilderProps) {
  // Quick shows one amount, so only a single plain item line opens in it.
  const oneFlatLine =
    !invoice ||
    (invoice.lineItems.length === 1 &&
      invoice.lineItems[0].unit === "item" &&
      Number(invoice.lineItems[0].quantity) === 1);
  const [mode, setMode] = useState<"quick" | "detailed">(
    oneFlatLine ? "quick" : "detailed",
  );
  const [showQuickConfirm, setShowQuickConfirm] = useState(false);
  // No saved clients yet: start by typing who you're billing.
  const startNew = !invoice && clients.length === 0 && !newClientBlocked;
  const [billNew, setBillNew] = useState(startNew);
  const [formError, setFormError] = useState("");
  const termDays = defaults?.paymentTermsDays ?? 14;
  // Editing the date by hand clears the shortcut.
  const [term, setTerm] = useState<Term | null>(
    !invoice && isTerm(termDays) ? (String(termDays) as Term) : null,
  );

  // A project from a taxed proposal bills at that rate; null leaves the field alone.
  const proposalTaxRate = (projectId: string | undefined) => {
    const rate = Number(projects.find((p) => p.id === projectId)?.proposalTaxRate);
    return rate > 0 ? String(rate) : null;
  };
  // What the tax field starts at for a project: its proposal's rate, else the default.
  const autoTaxRate = (projectId: string | undefined) =>
    proposalTaxRate(projectId) ?? (defaults?.taxRate || "");

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
          currency: invoice.currency,
          taxRate: invoice.taxRate,
          notes: invoice.notes,
          showProjectBalance: invoice.showProjectBalance,
          lineItems: invoice.lineItems,
        }
      : {
          clientId: initialClientId ?? "",
          newClient: startNew ? { name: "", email: "" } : undefined,
          projectId: initialProjectId ?? undefined,
          issueDate: dateToFormValue(new Date()),
          // Payment terms (users.payment_terms_days): due on receipt, or N days out.
          dueDate: dateToFormValue(addDays(new Date(), termDays)),
          currency:
            projects.find((project) => project.id === initialProjectId)
              ?.currency ?? "USD",
          // Empty rather than "0", so the placeholder shows.
          taxRate: autoTaxRate(initialProjectId ?? undefined),
          notes: defaults?.notes ?? "",
          // On by default when opened from a fixed-price project.
          showProjectBalance:
            projects.find((project) => project.id === initialProjectId)
              ?.pricing === "fixed",
          lineItems: [
            initialLine ?? {
              description: "",
              quantity: 1,
              rate: "",
              unit: "item",
            },
          ],
        },
  });

  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting, isDirty },
    reset,
    setValue,
    getValues,
    setError,
    control,
    unregister,
  } = form;

  const watchedLineItems = useWatch({ control, name: "lineItems" });
  const watchedTaxRate = useWatch({ control, name: "taxRate" });
  const selectedClientId = useWatch({ control, name: "clientId" });
  const filteredProjects = projects.filter(
    (project) => project.clientId === selectedClientId,
  );

  const hasMeaningfulExtraLineItems = (): boolean => {
    if (watchedLineItems.length <= 1) return false;
    return watchedLineItems
      .slice(1)
      .some((item) => item.description !== "" || Number(item.rate) > 0);
  };

  function collapseToSingleLineItem() {
    const firstItem = watchedLineItems[0];
    // Quick mode bills one flat amount - a leftover "hour" unit would print "1 hr".
    replace([{ ...firstItem, quantity: 1, unit: "item" }]);
  }

  const changeMode = (next: "quick" | "detailed") => {
    if (next === mode) return;
    if (next === "detailed") {
      setMode("detailed");
    } else if (hasMeaningfulExtraLineItems()) {
      setShowQuickConfirm(true);
    } else {
      collapseToSingleLineItem();
      setMode("quick");
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const newClientName = useWatch({ control, name: "newClient.name" });
  const showProjectBalance = useWatch({ control, name: "showProjectBalance" });
  const selectedProjectId = useWatch({ control, name: "projectId" });
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const watchedDueDate = useWatch({ control, name: "dueDate" });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const hourlyRateFor = (
    clientId: string | undefined,
    projectId: string | undefined,
  ): number | null => {
    const projectRate = projects.find((p) => p.id === projectId)?.hourlyRate;
    const clientRate = clients.find((c) => c.id === clientId)?.hourlyRate;
    const rate = Number(projectRate ?? clientRate ?? 0);
    return rate > 0 ? rate : null;
  };

  const fillEmptyHourlyRates = (rate: number | null) => {
    if (!rate) return;
    getValues("lineItems").forEach((item, index) => {
      if (item.unit === "hour" && !(Number(item.rate) > 0)) {
        setValue(`lineItems.${index}.rate`, rate, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    });
  };

  // Tax follows the project until the user types in the field; then it's theirs.
  const [taxTyped, setTaxTyped] = useState(false);
  const followProjectTax = (projectId: string | undefined) => {
    if (invoice || taxTyped) return;
    setValue("taxRate", autoTaxRate(projectId), { shouldDirty: true });
  };

  const clearProject = () => {
    followProjectTax(undefined);
    setValue("projectId", undefined, { shouldDirty: true });
  };

  const toggleBillNew = (next: boolean) => {
    setBillNew(next);
    if (next) {
      setValue("clientId", "");
      clearProject();
      setValue("newClient", { name: "", email: "" });
    } else {
      unregister("newClient");
    }
  };

  const handleClientChange = (
    onChange: (value: string) => void,
    value: string,
  ) => {
    onChange(value);
    // Changing the client clears the project.
    clearProject();
    fillEmptyHourlyRates(hourlyRateFor(value, undefined));
  };

  const handleProjectChange = (
    onChange: (value: string) => void,
    value: string,
  ) => {
    onChange(value);
    const project = projects.find((p) => p.id === value);
    setValue("showProjectBalance", project?.pricing === "fixed", {
      shouldDirty: true,
    });
    followProjectTax(value || undefined);
    fillEmptyHourlyRates(
      hourlyRateFor(getValues("clientId"), value || undefined),
    );
  };

  const handleUnitChange = (index: number, unit: InvoiceItemUnit) => {
    setValue(`lineItems.${index}.unit`, unit, { shouldDirty: true });
    if (unit !== "hour") return;
    const rate = hourlyRateFor(getValues("clientId"), getValues("projectId"));
    if (rate && !(Number(getValues(`lineItems.${index}.rate`)) > 0)) {
      setValue(`lineItems.${index}.rate`, rate, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const applyTerm = (next: Term, issueDate = getValues("issueDate")) => {
    setTerm(next);
    const issue = formValueToDate(issueDate) ?? new Date();
    setValue("dueDate", dateToFormValue(addDays(issue, Number(next))), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const activeHourlyRate = hourlyRateFor(selectedClientId, selectedProjectId);
  const hourlyRateHint = activeHourlyRate
    ? {
        rate: activeHourlyRate,
        source:
          selectedProject && Number(selectedProject.hourlyRate) > 0
            ? selectedProject.title
            : (selectedClient?.name ?? "client"),
      }
    : null;

  const { subtotal, taxRate, taxAmount, total } = calculateInvoiceTotals(
    watchedLineItems,
    watchedTaxRate,
  );

  const ledger = selectedProject
    ? projectLedger({
        budget: selectedProject.budget,
        billed: selectedProject.billed,
        thisInvoice: subtotal,
      })
    : null;
  // Not named while editing the deposit invoice itself.
  const depositLabel =
    selectedProject?.deposit &&
    selectedProject.deposit.invoiceId !== invoice?.id
      ? selectedProject.deposit.label
      : null;

  const invoicePath = invoice
    ? `/invoices/${invoice.id}`
    : (returnTo ?? "/invoices");
  const invoiceLabel = invoice
    ? formatInvoiceNumber(invoice.invoiceNumber, invoice.numberPrefix)
    : null;

  /** Lines left completely empty are dropped; one line always stays. */
  const trimLines = (data: InvoiceFormOutput): InvoiceFormOutput => {
    const typed = data.lineItems.filter(
      (line) => line.description || line.rate > 0,
    );
    return {
      ...data,
      lineItems: typed.length ? typed : data.lineItems.slice(0, 1),
    };
  };

  /** What sending needs: a description and an amount, and someone to email. */
  const readyToSend = (data: InvoiceFormOutput, needsEmail: boolean) => {
    let ready = true;
    data.lineItems.forEach((line, index) => {
      if (!line.description) {
        setError(`lineItems.${index}.description`, {
          message: "Add a description",
        });
        ready = false;
      }
    });
    const sum = data.lineItems.reduce(
      (acc, line) => acc + line.quantity * line.rate,
      0,
    );
    if (!(sum > 0)) {
      if (mode === "quick") {
        setError("lineItems.0.rate", { message: "Enter an amount" });
      } else {
        setError("lineItems", { message: "Add at least one line with a rate" });
      }
      ready = false;
    }
    if (needsEmail) {
      if (billNew && !data.newClient?.email) {
        setError("newClient.email", {
          message: "Add an email to send it, or save as draft",
        });
        ready = false;
      } else if (!billNew && selectedClient?.hasEmail === false) {
        setError("clientId", {
          message: "This client has no email. Save as draft, or add one",
        });
        ready = false;
      }
    }
    return ready;
  };

  const showErrors = () => scrollToFirstError("invoice-form");

  const leave = useLeaveAfterSave({ reset, getValues });
  const enter = useEnterInitial();

  const onSubmit = handleSubmit(async (raw: InvoiceFormOutput) => {
    setFormError("");
    const data = trimLines(raw);

    if (invoice) {
      // A sent invoice stays complete; only drafts may be half-written.
      if (invoice.status !== "draft" && !readyToSend(data, false)) {
        return showErrors();
      }
      await runActionWithToast(
        updateInvoiceAction({ ...data, invoiceId: invoice.id }),
        {
          loading: "Saving invoice...",
          success: "Changes saved",
          onSuccess: () => leave(`/invoices/${invoice.id}`),
          onError: setFormError,
        },
      );
      return;
    }

    await runActionWithToast(createInvoiceAction(data), {
      loading: "Saving draft...",
      success: "Saved as draft",
      onSuccess: ({ invoiceId }) => leave(returnTo ?? `/invoices/${invoiceId}`),
      onError: setFormError,
    });
  }, showErrors);

  // Valid and ready: held here while the "Send?" confirm is open.
  const [toSend, setToSend] = useState<InvoiceFormOutput | null>(null);

  const onSubmitAndSend = handleSubmit(async (raw: InvoiceFormOutput) => {
    setFormError("");
    const data = trimLines(raw);
    if (readyToSend(data, true)) setToSend(data);
    else showErrors();
  }, showErrors);

  // Create & Send: create the invoice, then send it. A failed send leaves a
  // saved draft, so it still counts as success; the toast says it wasn't sent.
  const sendNow = async (data: InvoiceFormOutput) => {
    const createAndSend = async (): Promise<
      ActionResult<{
        invoiceId: string;
        sent: boolean;
        emailError: string | null;
      }>
    > => {
      const created = await createInvoiceAction(data);
      if (!created.success) return created;
      const sent = await sendInvoiceAction(created.data.invoiceId);
      return {
        success: true,
        data: {
          invoiceId: created.data.invoiceId,
          sent: sent.success,
          emailError: sent.success ? sent.data.emailError : null,
        },
      };
    };

    await runActionWithToast(createAndSend(), {
      loading: "Creating and sending invoice...",
      success: ({ sent, emailError }) =>
        !sent
          ? "Saved as a draft, but it couldn't be sent. Try Send again from the invoice."
          : emailError
            ? "Invoice created and marked as sent."
            : "Invoice created and emailed to your client.",
      onSuccess: ({ invoiceId, sent, emailError }) => {
        warnNotEmailed(emailError, "invoice");
        leave(sent && returnTo ? returnTo : `/invoices/${invoiceId}`);
      },
      onError: setFormError,
    });
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={invoiceLabel ? `Edit ${invoiceLabel}` : "New invoice"}
        subtitle={
          invoice
            ? "Update the client, dates, tax or lines"
            : "Emailed to your client with a PDF attached"
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

      <div className="@container px-2 py-5 sm:px-3 md:px-5 lg:px-10">
        <MotionConfig reducedMotion="user">
          <form
            id="invoice-form"
            onSubmit={onSubmit}
            onInput={(event) => {
              if ((event.target as HTMLInputElement).name === "taxRate") {
                setTaxTyped(true);
              }
            }}
            noValidate
            className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]"
          >
            <motion.div
              custom={0}
              variants={rise}
              initial={enter}
              animate="show"
              className="flex min-w-0 flex-col gap-4"
            >
              {formError && (
                <p className="bg-danger-600/12 text-danger-600 rounded-lg px-4 py-3 text-sm">
                  {formError}
                </p>
              )}

              <DetailCard
                title="Bill to"
                aside={
                  <SegmentedControl
                    label="Invoice type"
                    options={MODES}
                    value={mode}
                    onChange={changeMode}
                    itemClassName="h-8 px-3 text-[13px]"
                  />
                }
                className="@container"
              >
                <div className="grid gap-4 @[560px]:grid-cols-2">
                  <BillToField
                    control={control}
                    register={register}
                    errors={errors}
                    clients={clients}
                    onClientChange={handleClientChange}
                    isNew={billNew}
                    onToggleNew={invoice ? null : toggleBillNew}
                    newBlocked={newClientBlocked}
                  />

                  <Controller
                    control={control}
                    name="projectId"
                    render={({ field }) => (
                      <ProjectCombobox
                        projects={filteredProjects}
                        value={field.value ?? ""}
                        onChange={(value) =>
                          handleProjectChange(field.onChange, value)
                        }
                        disabled={billNew || !selectedClientId}
                        error={errors.projectId?.message}
                      />
                    )}
                  />

                  {mode === "detailed" && (
                    <Controller
                      control={control}
                      name="issueDate"
                      render={({ field }) => (
                        <DatePickerField
                          label="Issue date"
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            if (term) applyTerm(term, value);
                          }}
                          error={errors.issueDate?.message}
                        />
                      )}
                    />
                  )}

                  <Controller
                    control={control}
                    name="dueDate"
                    render={({ field }) => (
                      <DatePickerField
                        label="Due date"
                        value={field.value}
                        onChange={(value) => {
                          setTerm(null);
                          field.onChange(value);
                        }}
                        error={errors.dueDate?.message}
                        disablePast
                      />
                    )}
                  />

                  <div className="@[560px]:col-span-2">
                    <SegmentedControl
                      label="Payment terms"
                      options={TERMS}
                      value={term ?? ("" as Term)}
                      onChange={(value) => applyTerm(value)}
                      className="grid w-full grid-cols-2 @[560px]:inline-flex @[560px]:w-auto"
                      itemClassName="h-9 justify-center px-3 text-[13px]"
                    />
                  </div>
                </div>
              </DetailCard>

              {/* Switching Quick and Detailed fades the new form in. */}
              <motion.div
                key={mode}
                variants={rise}
                initial={enter}
                animate="show"
              >
                {mode === "quick" ? (
                  <QuickInvoiceForm register={register} errors={errors} />
                ) : (
                  <DetailedInvoiceForm
                    control={control}
                    register={register}
                    errors={errors}
                    fields={fields}
                    watchedLineItems={watchedLineItems}
                    append={append}
                    remove={remove}
                    onUnitChange={handleUnitChange}
                    hourlyRateHint={hourlyRateHint}
                  />
                )}
              </motion.div>
            </motion.div>

            <motion.aside
              custom={1}
              variants={rise}
              initial={enter}
              animate="show"
              className="flex min-w-0 flex-col gap-4 @[1000px]:sticky @[1000px]:top-4"
            >
              {selectedProject && ledger && ledger.budget !== null && (
                <BudgetLine
                  projectTitle={selectedProject.title}
                  currency={selectedProject.currency}
                  pricing={selectedProject.pricing}
                  balance={
                    selectedProject.pricing === "hourly"
                      ? undefined
                      : {
                          checked: Boolean(showProjectBalance),
                          onChange: (checked) =>
                            setValue("showProjectBalance", checked, {
                              shouldDirty: true,
                            }),
                        }
                  }
                  ledger={{ ...ledger, budget: ledger.budget }}
                  depositLabel={depositLabel}
                />
              )}
              <InvoicePreview
                issuerName={issuerName}
                numberLabel={invoiceLabel ?? defaults?.nextNumberLabel ?? "New"}
                projectName={selectedProject?.title}
                clientName={
                  billNew ? newClientName || undefined : selectedClient?.name
                }
                dueDate={watchedDueDate}
                lines={watchedLineItems}
                subTotal={subtotal}
                taxRate={taxRate}
                taxAmount={taxAmount}
                total={total}
              />
            </motion.aside>
          </form>
        </MotionConfig>

        <ConfirmDialog
          open={showQuickConfirm}
          onOpenChange={setShowQuickConfirm}
          title="Switch to Quick mode?"
          description="This keeps only your first line and removes the rest."
          confirmLabel="Switch to Quick"
          variant="destructive"
          onConfirm={() => {
            collapseToSingleLineItem();
            setMode("quick");
          }}
        />
      </div>

      <ConfirmDialog
        open={toSend !== null}
        onOpenChange={(open) => !open && setToSend(null)}
        title="Send this invoice?"
        description={invoiceSendDescription(
          toSend?.newClient?.email ?? selectedClient?.email,
          toSend?.newClient?.name ?? selectedClient?.name ?? "This client",
        )}
        confirmLabel="Create & send"
        pendingLabel="Sending..."
        onConfirm={() => (toSend ? sendNow(toSend) : undefined)}
      />

      <FormActionBar isDirty={isDirty} isPending={isSubmitting || toSend !== null} cancelHref={invoicePath}>
        {invoice ? (
          <CustomButton
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </CustomButton>
        ) : (
          <>
            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={onSubmit}
              disabled={isSubmitting}
            >
              Save as Draft
            </CustomButton>
            <CustomButton
              type="button"
              size="sm"
              onClick={onSubmitAndSend}
              disabled={isSubmitting}
            >
              Create & Send
            </CustomButton>
          </>
        )}
      </FormActionBar>
    </div>
  );
}
