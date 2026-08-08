"use client";

import React, { useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { ClientFormInput, clientSchema, clientStatusEnum } from "../schema";

import { Field } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/custom-button";
import { CountryCombobox } from "@/components/ui/country-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneField, type PhoneFieldHandle } from "@/components/ui/phone-field";

import DashboardContainer from "@/components/dashboard/container";
import PageHeader from "@/components/dashboard/page-header";
import FormSection from "@/components/dashboard/form-section";

export default function NewClientPage() {
  const {
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
    control,
    watch,
    setValue,
  } = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      status: "lead",
    },
  });

  const countryValue = watch("country");

  const phoneFieldRef = useRef<PhoneFieldHandle>(null);

  const onSubmit = handleSubmit(async (data: ClientFormInput) => {
    console.log("Create client form data:", data);
  });

  return (
    <DashboardContainer>
      <PageHeader
        title="Create Client"
        description="Add a client to your workspace."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Clients", href: "/clients" },
          { label: "New" },
        ]}
      />

      <form onSubmit={onSubmit} className="mx-auto mt-8 max-w-4xl pb-12">
        <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
          {/* Basic information */}
          <FormSection
            title="Tell us about your client"
            step="01 - Basic information"
            description="Start with the basic details of the person or company
                you're working with."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                {...register("name")}
                label="Name"
                placeholder="e.g. John Doe"
                error={errors.name?.message}
              />

              <Field
                {...register("company")}
                label="Company"
                placeholder="e.g. Acme Inc."
                error={errors.company?.message}
              />
            </div>
          </FormSection>

          <div className="bg-border h-px" />

          {/* Contact details */}
          <FormSection
            step="02 - Contact details"
            title="Stay connected"
            description="Add the contact information you'll use to communicate with
                this client."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <Field
                  {...register("email")}
                  label="Email"
                  placeholder="e.g. john@acme.com"
                  error={errors.email?.message}
                />
              </div>

              <div>
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
                        setValue("country", isoValue, {
                          shouldValidate: true,
                        })
                      }
                    />
                  )}
                />
                {errors.phone && (
                  <p className="text-destructive text-sm">
                    {errors.phone?.message}
                  </p>
                )}
              </div>

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
                  <p className="text-destructive text-sm">
                    {errors.country.message}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          <div className="bg-border h-px" />

          {/* Additional information */}
          <FormSection
            step="03 - Workspace details"
            title="Organize your relationship"
            description="Keep a little context about where this client stands."
          >
            <div className="space-y-5 md:max-w-sm">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <div className="w-32 space-y-2">
                    <label className="text-sm font-medium">Status</label>

                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>

                      <SelectContent>
                        {clientStatusEnum.options.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              <Field
                {...register("notes")}
                label="Notes"
                placeholder="Add any useful context about this client..."
                multiline
                error={errors.notes?.message}
              />
            </div>
          </FormSection>

          {/* Footer */}
          <div className="bg-muted/30 flex flex-col-reverse gap-3 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
            <Link href="/clients">
              <CustomButton
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
              >
                Cancel
              </CustomButton>
            </Link>

            <CustomButton
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "Creating..." : "Create client"}
            </CustomButton>
          </div>
        </div>
      </form>
    </DashboardContainer>
  );
}
