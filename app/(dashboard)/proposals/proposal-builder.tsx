"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { FileSignature, Plus } from "lucide-react";
import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import FormSection from "@/components/dashboard/form-section";
import {
  ClientCombobox,
  type ClientOption,
} from "@/components/client-combobox";
import ProposalPreview from "@/components/preview/proposal-preview";
import { Field } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/custom-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calculateTotals } from "@/lib/calculate-totals";
import { formatCurrency } from "@/lib/format-currency";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { createProposalAction } from "./actions";
import ProposalLineItems from "./proposal-line-items";
import {
  createProposalSchema,
  EXPIRY_DEFAULT_DAYS,
  EXPIRY_OPTIONS,
  type ProposalFormInput,
  type ProposalFormOutput,
} from "./schema";

type ProposalBuilderProps = {
  clients: ClientOption[];
  initialClientId?: string;
};

export default function ProposalBuilder({
  clients,
  initialClientId,
}: ProposalBuilderProps) {
  const router = useRouter();

  // `any` for the context generic is the project convention for z.coerce
  // schemas (CLAUDE.md: type useForm as useForm<Input, any, Output>()).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ProposalFormInput, any, ProposalFormOutput>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: {
      clientId: initialClientId ?? "",
      title: "",
      content: "",
      currency: "USD",
      taxRate: 0,
      expiresInDays: EXPIRY_DEFAULT_DAYS,
      items: [{ description: "", quantity: 1, rate: 0 }],
    },
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Watched per field rather than useWatch({ control }): the whole-form form
  // returns a deep partial, which loses the field types the preview and the
  // line-item editor are typed against.
  const watchedItems = useWatch({ control, name: "items" }) ?? [];
  const watchedTaxRate = useWatch({ control, name: "taxRate" });
  const watchedTitle = useWatch({ control, name: "title" });
  const watchedContent = useWatch({ control, name: "content" });
  const watchedClientId = useWatch({ control, name: "clientId" });
  const watchedExpiry = useWatch({ control, name: "expiresInDays" });

  // Preview only. The figures that get stored are recomputed by the server
  // action, which never trusts anything sent from here.
  const { subtotal, taxRate, taxAmount, total } = calculateTotals(
    watchedItems,
    watchedTaxRate,
  );

  const selectedClient = clients.find(
    (client) => client.id === watchedClientId,
  );

  const onSubmit = handleSubmit(async (data) => {
    await runActionWithToast(createProposalAction(data), {
      loading: "Creating proposal...",
      success: "Proposal created",
      onSuccess: ({ proposalId }) => router.push(`/proposals/${proposalId}`),
    });
  });

  return (
    <>
      <PageHeader
        title="New proposal"
        subtitle="Build a quote to send to your client"
        icon={<FileSignature className="h-5 w-5" />}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Proposals", href: "/proposals" },
          { label: "New" },
        ]}
      />

      <DashboardContainer>
        {/* Container queries, not viewport ones: the sidebar takes real width
            when expanded, so a viewport breakpoint would split this column
            while it is still too narrow for two. */}
        <div className="@container pb-12">
          <div className="grid items-start gap-8 @[900px]:grid-cols-[minmax(0,1fr)_380px]">
            <form onSubmit={onSubmit} id="proposal-form">
              <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
                <FormSection
                  step="01 Proposal details"
                  title="Who is this for?"
                  description="Pick the client and give the proposal a title they will recognise."
                >
                  <div className="grid gap-5 @[560px]:grid-cols-2">
                    <Controller
                      control={control}
                      name="clientId"
                      render={({ field }) => (
                        <ClientCombobox
                          clients={clients}
                          value={field.value}
                          onChange={field.onChange}
                          error={errors.clientId?.message}
                        />
                      )}
                    />

                    <Field
                      {...register("title")}
                      label="Title"
                      placeholder="e.g. Website redesign — Phase 1"
                      error={errors.title?.message}
                    />

                    <div className="@[560px]:col-span-2">
                      <Field
                        {...register("content")}
                        multiline
                        rows={6}
                        label="Scope and notes (optional)"
                        placeholder="What the work covers, timelines, assumptions..."
                        error={errors.content?.message}
                      />
                    </div>
                  </div>
                </FormSection>

                <div className="border-border border-t" />

                <FormSection
                  step="02 Pricing"
                  title="What are you quoting?"
                  description="Add a line for each piece of work. Totals are calculated for you."
                >
                  <ProposalLineItems
                    fields={fields}
                    register={register}
                    errors={errors}
                    watchedItems={watchedItems}
                    remove={remove}
                  />

                  {errors.items?.message && (
                    <p className="text-danger-600 mt-2 text-xs">
                      {errors.items.message}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      append({ description: "", quantity: 1, rate: 0 })
                    }
                    className="text-primary focus-visible:ring-ring mt-4 inline-flex items-center gap-1.5 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <Plus className="h-4 w-4" />
                    Add line item
                  </button>

                  <div className="border-border mt-8 grid gap-5 border-t pt-6 @[560px]:grid-cols-2">
                    <Field
                      {...register("taxRate")}
                      label="Tax rate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="0"
                      suffix="%"
                      error={errors.taxRate?.message}
                    />

                    <Controller
                      control={control}
                      name="expiresInDays"
                      render={({ field }) => (
                        <div className="flex flex-col gap-1">
                          <label className="text-muted-foreground font-sans text-[13px] font-medium">
                            Link expires after
                          </label>
                          <Select
                            value={String(field.value ?? EXPIRY_DEFAULT_DAYS)}
                            onValueChange={(value) =>
                              field.onChange(Number(value))
                            }
                          >
                            <SelectTrigger className="h-11 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EXPIRY_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={String(option.value)}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.expiresInDays?.message && (
                            <span className="text-danger-600 text-xs">
                              {errors.expiresInDays.message}
                            </span>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  {/* The totals live in the preview panel on wide screens.
                      Below that split they would be off-screen, so they are
                      repeated here and hidden once the panel is visible. */}
                  <dl className="border-border mt-6 flex flex-col gap-2 border-t pt-4 text-sm @[900px]:hidden">
                    <div className="text-muted-foreground flex justify-between">
                      <dt>Subtotal</dt>
                      <dd className="tabular-nums">
                        {formatCurrency(String(subtotal))}
                      </dd>
                    </div>
                    <div className="text-muted-foreground flex justify-between">
                      <dt>Tax</dt>
                      <dd className="tabular-nums">
                        {formatCurrency(String(taxAmount))}
                      </dd>
                    </div>
                    <div className="border-border flex justify-between border-t pt-2 text-base font-semibold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">
                        {formatCurrency(String(total))}
                      </dd>
                    </div>
                  </dl>
                </FormSection>
              </div>
            </form>

            <aside className="flex flex-col gap-4 self-start @[900px]:sticky @[900px]:top-6">
              <ProposalPreview
                title={watchedTitle}
                clientName={selectedClient?.name}
                clientCompany={selectedClient?.company}
                content={watchedContent}
                items={watchedItems}
                subtotal={subtotal}
                taxRate={taxRate}
                taxAmount={taxAmount}
                total={total}
                expiresInDays={Number(watchedExpiry ?? EXPIRY_DEFAULT_DAYS)}
              />

              <div className="flex flex-col-reverse gap-3 @[560px]:flex-row @[560px]:justify-end @[900px]:flex-col-reverse">
                <CustomButton
                  type="button"
                  variant="secondary"
                  onClick={() => router.push("/proposals")}
                >
                  Cancel
                </CustomButton>
                <CustomButton
                  type="submit"
                  form="proposal-form"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create proposal"}
                </CustomButton>
              </div>
            </aside>
          </div>
        </div>
      </DashboardContainer>
    </>
  );
}
