"use client";

import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import PageHeader from "@/components/dashboard/page-header";
import { DetailCard } from "@/components/dashboard/detail-parts";
import {
  FormActionBar,
  useLeaveAfterSave,
} from "@/components/dashboard/form-action-bar";
import ClientPreview from "@/components/preview/client-preview";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { CustomButton } from "@/components/ui/custom-button";
import { Field } from "@/components/ui/input";
import { PhoneField, type PhoneFieldHandle } from "@/components/ui/phone-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { NO_CHANGE_MESSAGE } from "@/lib/error-message";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import type { ClientRow } from "@/src/db/schema/clients";
import { createClientAction, updateClientAction } from "./actions";
import { clientStatusConfig, type ClientStatus } from "./client-status-config";
import { clientSchema, type ClientInput } from "./schema";

const STATUS = (Object.keys(clientStatusConfig) as ClientStatus[]).map(
  (value) => ({ value, label: clientStatusConfig[value].label }),
);

function Optional({ children }: { children: string }) {
  return (
    <>
      {children} <span className="font-normal opacity-70">optional</span>
    </>
  );
}

/** New client, or editing one: the same fields either way. */
export function ClientForm({
  client,
  returnTo = null,
}: {
  client?: ClientRow;
  /** Set when opened from the dashboard's setup steps. */
  returnTo?: string | null;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const phoneFieldRef = useRef<PhoneFieldHandle>(null);
  const backHref = client ? `/clients/${client.id}` : (returnTo ?? "/clients");

  const {
    handleSubmit,
    register,
    control,
    setValue,
    reset,
    getValues,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          company: client.company ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          country: client.country ?? undefined,
          notes: client.notes ?? "",
          status: client.status,
          hourlyRate: client.hourlyRate ?? "",
        }
      : // Every key listed (country too), or react-hook-form counts the empty form as changed.
        {
          name: "",
          company: "",
          email: "",
          phone: "",
          country: undefined,
          notes: "",
          status: "active",
          hourlyRate: "",
        },
  });
  const countryValue = useWatch({ control, name: "country" });
  const [name, company, email, status, hourlyRate] = useWatch({
    control,
    name: ["name", "company", "email", "status", "hourlyRate"],
  });

  const leave = useLeaveAfterSave({ reset, getValues });

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    const onError = (message: string) => {
      if (message !== NO_CHANGE_MESSAGE) setFormError(message);
    };
    if (client) {
      await runActionWithToast(updateClientAction(client.id, data), {
        loading: "Saving changes...",
        success: "Changes saved",
        onSuccess: () => leave(`/clients/${client.id}`),
        onError,
      });
      return;
    }
    await runActionWithToast(createClientAction(data), {
      loading: "Saving client...",
      success: `${data.name} added`,
      onSuccess: ({ clientId }) => leave(returnTo ?? `/clients/${clientId}`),
      onError,
    });
  });

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title={client ? `Edit ${client.name}` : "New client"}
        subtitle="Saved once, reused on every proposal and invoice"
        backHref={backHref}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients", href: "/clients" },
          ...(client
            ? [
                { label: client.name, href: `/clients/${client.id}` },
                { label: "Edit" },
              ]
            : [{ label: "New" }]),
        ]}
      />

      <div className="@container px-2 py-5 sm:px-3 md:px-5 lg:px-10">
        <div className="grid items-start gap-5 @[1000px]:grid-cols-[minmax(0,1fr)_21.25rem]">
          <form
            id="client-form"
            onSubmit={onSubmit}
            noValidate
            className="flex min-w-0 flex-col gap-4"
          >
            <DetailCard title="Client" className="@container">
              <div className="grid gap-4 @[560px]:grid-cols-2">
                <Field
                  {...register("name")}
                  label="Name"
                  placeholder="Person or business name"
                  error={errors.name?.message}
                />
                <Field
                  {...register("company")}
                  label={<Optional>Company</Optional>}
                  placeholder="e.g. Juniper Health"
                  error={errors.company?.message}
                />
                <div className="flex flex-col gap-1 @[560px]:col-span-2">
                  <Field
                    {...register("email")}
                    type="email"
                    label={<Optional>Email</Optional>}
                    placeholder="name@company.com"
                    error={errors.email?.message}
                  />
                  <span className="text-muted-foreground text-xs">
                    Needed only to email proposals and invoices.
                  </span>
                </div>
                <Controller
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <PhoneField
                      ref={phoneFieldRef}
                      value={field.value}
                      onChange={field.onChange}
                      error={errors.phone?.message}
                      syncCountryValue={countryValue}
                      onDialCountryChange={(isoValue) =>
                        setValue("country", isoValue, { shouldValidate: true })
                      }
                    />
                  )}
                />
                <div>
                  <Controller
                    control={control}
                    name="country"
                    render={({ field }) => (
                      <CountryCombobox
                        value={field.value}
                        onChange={(value) => {
                          phoneFieldRef.current?.resetOverride();
                          field.onChange(value);
                        }}
                      />
                    )}
                  />
                  {errors.country && (
                    <p className="text-danger-600 mt-1 text-xs">
                      {errors.country.message}
                    </p>
                  )}
                </div>
                <Field
                  {...register("hourlyRate")}
                  label={<Optional>Default hourly rate</Optional>}
                  placeholder="0"
                  prefix="$"
                  suffix="/hr"
                  inputMode="decimal"
                  error={errors.hourlyRate?.message}
                />
                <div className="@[560px]:col-span-2">
                  <span className="text-muted-foreground mb-1.5 block text-[13px] font-medium">
                    Status
                  </span>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <SegmentedControl
                        label="Status"
                        options={STATUS}
                        value={field.value}
                        onChange={field.onChange}
                        className="grid w-full grid-cols-2 @[560px]:inline-flex @[560px]:w-auto"
                        itemClassName="justify-center"
                      />
                    )}
                  />
                </div>
              </div>
            </DetailCard>

            <DetailCard>
              <Field
                {...register("notes")}
                multiline
                rows={4}
                label={
                  <>
                    Notes{" "}
                    <span className="font-normal opacity-70">
                      only you see these
                    </span>
                  </>
                }
                placeholder="Payment habits, preferences, who to copy"
                error={errors.notes?.message}
              />
            </DetailCard>

            {formError && (
              <p className="text-danger-600 text-sm">{formError}</p>
            )}
          </form>
          <aside className="min-w-0 @[1000px]:sticky @[1000px]:top-4">
            <ClientPreview
              name={name ?? ""}
              company={company}
              email={email}
              country={countryValue}
              status={status ?? "active"}
              hourlyRate={hourlyRate}
            />
          </aside>
        </div>
      </div>

      <FormActionBar
        isDirty={isDirty}
        isPending={isSubmitting}
        cancelHref={backHref}
      >
        <CustomButton
          type="submit"
          form="client-form"
          size="sm"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : client ? "Save changes" : "Save client"}
        </CustomButton>
      </FormActionBar>
    </div>
  );
}
