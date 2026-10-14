"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import PageHeader from "@/components/dashboard/page-header";
import { DetailCard } from "@/components/dashboard/detail-parts";
import {
  ClientCombobox,
  type ClientOption,
} from "@/components/client-combobox";
import ProposalPreview from "@/components/preview/proposal-preview";
import { Field } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/custom-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { resolveBrandColor } from "@/lib/brand-color";
import { calculateTotals } from "@/lib/calculate-totals";
import { warnNotEmailed } from "@/lib/email/warn-not-emailed";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import type { ActionResult } from "@/lib/action-result";
import type { ReturnTo } from "@/lib/return-to";
import {
  createProposalAction,
  sendProposalAction,
  updateProposalAction,
} from "./actions";
import ProposalMilestoneCard from "./proposal-milestone-card";
import {
  createProposalSchema,
  EXPIRY_DEFAULT_DAYS,
  EXPIRY_OPTIONS,
  type ProposalFormInput,
  type ProposalFormOutput,
} from "./schema";

/** An existing draft loaded into the builder for editing. */
export type EditableProposal = {
  id: string;
  clientId: string;
  title: string;
  content: string;
  taxRate: number;
  depositPercent: number;
  deliveryDays: number;
  expiresInDays: number;
  milestones: {
    name: string;
    timeframe?: string;
    description?: string;
    items: { description: string; quantity: number; rate: number }[];
  }[];
};

/** Starting values for a brand-new proposal (users.* defaults columns). */
export type NewProposalDefaults = {
  expiresInDays: number;
  depositPercent: number;
};

type ProposalBuilderProps = {
  clients: ClientOption[];
  initialClientId?: string;
  /** When set, the builder edits this draft instead of creating one. */
  proposal?: EditableProposal;
  /** Starting values for a new proposal. Ignored when editing. */
  defaults?: NewProposalDefaults;
  /** Set when opened from the dashboard's setup steps. */
  returnTo?: ReturnTo | null;
  /** The freelancer's brand colour, for the preview. */
  brandColor: string | null;
};

const DEPOSITS = [
  { value: "0", label: "None" },
  { value: "30", label: "30%" },
  { value: "50", label: "50%" },
] as const;

const BLANK_STAGE = {
  name: "",
  timeframe: "",
  description: "",
  items: [{ description: "", quantity: 1, rate: "" }],
};

/** The fixed expiry choices, plus a non-standard default from Settings. */
function expiryOptionsWith(days: number) {
  return EXPIRY_OPTIONS.some((option) => option.value === String(days))
    ? [...EXPIRY_OPTIONS]
    : [...EXPIRY_OPTIONS, { value: String(days), label: `${days} days` }].sort(
        (a, b) => Number(a.value) - Number(b.value),
      );
}

export default function ProposalBuilder({
  clients,
  initialClientId,
  proposal,
  defaults,
  returnTo = null,
  brandColor,
}: ProposalBuilderProps) {
  const router = useRouter();
  const isEditing = Boolean(proposal);
  const startDeposit =
    proposal?.depositPercent ?? defaults?.depositPercent ?? 0;
  // A deposit other than None / 30 / 50 starts in the custom box.
  const [customDeposit, setCustomDeposit] = useState(
    ![0, 30, 50].includes(startDeposit),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ProposalFormInput, any, ProposalFormOutput>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: proposal
      ? {
          clientId: proposal.clientId,
          title: proposal.title,
          content: proposal.content,
          currency: "USD",
          taxRate: proposal.taxRate || "",
          depositPercent: proposal.depositPercent,
          // Blank, not "0", when no delivery time was given.
          deliveryDays: proposal.deliveryDays || "",
          expiresInDays: proposal.expiresInDays,
          milestones: proposal.milestones,
        }
      : {
          clientId: initialClientId ?? "",
          title: "",
          content: "",
          currency: "USD",
          taxRate: "",
          depositPercent: startDeposit,
          deliveryDays: "",
          expiresInDays: defaults?.expiresInDays ?? EXPIRY_DEFAULT_DAYS,
          milestones: [BLANK_STAGE],
        },
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const {
    fields: stageFields,
    append: appendStage,
    remove: removeStage,
  } = useFieldArray({ control, name: "milestones" });

  const watchedStages = useWatch({ control, name: "milestones" }) ?? [];
  const watchedTaxRate = useWatch({ control, name: "taxRate" });
  const watchedDeposit = useWatch({ control, name: "depositPercent" });
  const watchedDelivery = useWatch({ control, name: "deliveryDays" });
  const watchedTitle = useWatch({ control, name: "title" });
  const watchedClientId = useWatch({ control, name: "clientId" });
  const watchedExpiry = useWatch({ control, name: "expiresInDays" });
  // Everything is USD for now.
  const currency = "USD";

  // Preview only; the server action recomputes everything it stores.
  const { taxRate, taxAmount, total } = calculateTotals(
    watchedStages.flatMap((stage) => stage?.items ?? []),
    watchedTaxRate,
  );
  const depositPercent = Number(watchedDeposit ?? 0);
  const depositAmount = Math.round(total * (depositPercent / 100) * 100) / 100;
  const selectedClient = clients.find(
    (client) => client.id === watchedClientId,
  );
  const cancelHref = proposal
    ? `/proposals/${proposal.id}`
    : (returnTo ?? "/proposals");

  const save = handleSubmit(async (data) => {
    if (proposal) {
      await runActionWithToast(
        updateProposalAction({ ...data, proposalId: proposal.id }),
        {
          loading: "Saving changes...",
          success: "Changes saved",
          onSuccess: () => router.push(`/proposals/${proposal.id}`),
        },
      );
      return;
    }

    await runActionWithToast(createProposalAction(data), {
      loading: "Saving draft...",
      success: "Draft saved",
      onSuccess: ({ proposalId }) =>
        router.push(returnTo ?? `/proposals/${proposalId}`),
    });
  });

  const saveAndSend = handleSubmit(async (data) => {
    // Checked only when sending: a draft may still be half-written.
    const priced = data.milestones.some((stage) =>
      stage.items.some((item) => item.rate > 0),
    );
    if (!priced) {
      setError("milestones", { message: "Add at least one line with a rate" });
      return;
    }
    if (selectedClient && selectedClient.hasEmail === false) {
      setError("clientId", {
        message: "This client has no email. Save as draft, or add one",
      });
      return;
    }

    const createAndSend = async (): Promise<
      ActionResult<{ proposalId: string; emailError: string | null }>
    > => {
      const created = await createProposalAction(data);
      if (!created.success) return created;
      const sent = await sendProposalAction({
        proposalId: created.data.proposalId,
      });
      if (!sent.success) return sent;
      return {
        success: true,
        data: {
          proposalId: created.data.proposalId,
          emailError: sent.data.emailError,
        },
      };
    };

    await runActionWithToast(createAndSend(), {
      loading: "Sending proposal...",
      success: ({ emailError }) =>
        emailError
          ? "Proposal sent - the link is live"
          : "Proposal emailed to your client",
      onSuccess: ({ proposalId, emailError }) => {
        warnNotEmailed(emailError, "proposal");
        router.push(returnTo ?? `/proposals/${proposalId}`);
      },
    });
  });

  return (
    <>
      <PageHeader
        title={proposal ? `Edit ${proposal.title}` : "New proposal"}
        subtitle={
          proposal
            ? "Changes apply to the draft only"
            : "Scope, price and terms, sent to your client as a link"
        }
        backHref={cancelHref}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Proposals", href: "/proposals" },
          ...(proposal
            ? [
                { label: proposal.title, href: `/proposals/${proposal.id}` },
                { label: "Edit" },
              ]
            : [{ label: "New" }]),
        ]}
        actions={
          <>
            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push(cancelHref)}
            >
              Cancel
            </CustomButton>
            {isEditing ? (
              <CustomButton
                type="button"
                size="sm"
                onClick={save}
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
                  onClick={save}
                  disabled={isSubmitting}
                >
                  Save draft
                </CustomButton>
                <CustomButton
                  type="button"
                  size="sm"
                  onClick={saveAndSend}
                  disabled={isSubmitting}
                >
                  Send proposal
                </CustomButton>
              </>
            )}
          </>
        }
      />

      <div className="@container px-2 py-5 sm:px-3 md:px-5 lg:px-10">
        <form
          onSubmit={save}
          noValidate
          className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]"
        >
          <div className="flex min-w-0 flex-col gap-4">
            <DetailCard title="Proposal" className="@container">
              <div className="grid gap-4 @[560px]:grid-cols-2">
                <Field
                  {...register("title")}
                  label="Title"
                  placeholder="e.g. Website redesign"
                  error={errors.title?.message}
                />
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
                <div className="@[560px]:col-span-2">
                  <Field
                    {...register("content")}
                    multiline
                    rows={4}
                    label={
                      <>
                        Summary{" "}
                        <span className="font-normal opacity-70">optional</span>
                      </>
                    }
                    placeholder="What the work covers and what you need from them"
                    error={errors.content?.message}
                  />
                </div>
              </div>
            </DetailCard>

            <DetailCard title="Scope and price">
              <div className="flex flex-col gap-3">
                {stageFields.map((field, index) => (
                  <ProposalMilestoneCard
                    key={field.id}
                    index={index}
                    control={control}
                    register={register}
                    errors={errors}
                    currency={currency}
                    canRemove={stageFields.length > 1}
                    onRemove={() => removeStage(index)}
                  />
                ))}
              </div>
              {(errors.milestones?.message ||
                errors.milestones?.root?.message) && (
                <p className="text-danger-600 mt-2 text-xs">
                  {errors.milestones?.message ??
                    errors.milestones?.root?.message}
                </p>
              )}
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => appendStage(BLANK_STAGE)}
                className="mt-3 gap-1.5"
              >
                <PlusIcon className="size-4" />
                Add stage
              </CustomButton>
            </DetailCard>

            <DetailCard title="Terms" className="@container">
              <div className="grid gap-4 @[560px]:grid-cols-2">
                <Field
                  {...register("taxRate")}
                  label="Tax rate"
                  inputMode="decimal"
                  placeholder="0"
                  suffix="%"
                  error={errors.taxRate?.message}
                />
                <div className="flex flex-col gap-1">
                  <Field
                    {...register("deliveryDays")}
                    label="Delivery time"
                    inputMode="numeric"
                    placeholder="e.g. 30"
                    suffix="days"
                    error={errors.deliveryDays?.message}
                  />
                  <span className="text-muted-foreground text-xs">
                    Sets the project deadline when it starts
                  </span>
                </div>

                <div className="@[560px]:col-span-2">
                  <span className="text-muted-foreground mb-1.5 block text-[13px] font-medium">
                    Deposit
                  </span>
                  <div className="flex flex-wrap items-start gap-2">
                    <SegmentedControl
                      label="Deposit"
                      options={DEPOSITS}
                      value={
                        customDeposit
                          ? ("" as "0")
                          : (String(depositPercent) as "0")
                      }
                      onChange={(value) => {
                        setCustomDeposit(false);
                        setValue("depositPercent", Number(value), {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      itemClassName="h-9 px-3 text-[13px]"
                    />
                    <div className="w-32">
                      <Field
                        aria-label="Custom deposit"
                        inputMode="decimal"
                        placeholder="Custom"
                        suffix="%"
                        value={
                          customDeposit ? String(watchedDeposit ?? "") : ""
                        }
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          // Typing switches to a custom deposit.
                          setCustomDeposit(true);
                          setValue("depositPercent", event.target.value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        error={errors.depositPercent?.message}
                      />
                    </div>
                  </div>
                </div>

                <div className="@[560px]:col-span-2">
                  <span className="text-muted-foreground mb-1.5 block text-[13px] font-medium">
                    Link expires
                  </span>
                  <Controller
                    control={control}
                    name="expiresInDays"
                    render={({ field }) => {
                      const days = Number(field.value ?? EXPIRY_DEFAULT_DAYS);
                      return (
                        <SegmentedControl
                          label="Link expires"
                          options={expiryOptionsWith(days)}
                          value={String(days)}
                          onChange={(value) => field.onChange(Number(value))}
                          className="flex w-full flex-wrap @[560px]:inline-flex @[560px]:w-auto"
                          itemClassName="h-9 px-3 text-[13px]"
                        />
                      );
                    }}
                  />
                </div>
              </div>
            </DetailCard>
          </div>

          <aside className="flex min-w-0 flex-col gap-4 @[1000px]:sticky @[1000px]:top-4">
            <ProposalPreview
              title={watchedTitle}
              clientName={selectedClient?.company || selectedClient?.name}
              stages={watchedStages}
              taxRate={taxRate}
              taxAmount={taxAmount}
              total={total}
              expiresInDays={Number(watchedExpiry ?? EXPIRY_DEFAULT_DAYS)}
              depositPercent={depositPercent}
              depositAmount={depositAmount}
              deliveryDays={Number(watchedDelivery) || 0}
              currency={currency}
              brand={resolveBrandColor(brandColor)}
            />
          </aside>
        </form>
      </div>
    </>
  );
}
