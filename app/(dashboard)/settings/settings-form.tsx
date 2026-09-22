"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import FormSection from "@/components/dashboard/form-section";
import { Field } from "@/components/ui/input";
import { CustomButton } from "@/components/ui/custom-button";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { updateSettingsAction } from "./actions";
import {
  settingsSchema,
  type SettingsFormInput,
  type SettingsFormOutput,
} from "./schema";
import type { MyProfile } from "./queries";

const DEFAULT_BRAND_COLOR = "#3454d1";

export function SettingsForm({ profile }: { profile: MyProfile }) {
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<SettingsFormInput, any, SettingsFormOutput>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: profile.name ?? "",
      brandColor: profile.brandColor ?? "",
      paymentDetails: profile.paymentDetails ?? "",
      testimonialQuote: profile.testimonialQuote ?? "",
      testimonialAuthor: profile.testimonialAuthor ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = form;

  const brandColor = useWatch({ control: form.control, name: "brandColor" });
  const swatch = /^#[0-9a-fA-F]{6}$/.test(brandColor ?? "")
    ? (brandColor as string)
    : DEFAULT_BRAND_COLOR;

  const onSubmit = handleSubmit(async (data) => {
    await runActionWithToast(updateSettingsAction(data), {
      loading: "Saving...",
      success: "Settings saved",
      onSuccess: () => router.refresh(),
    });
  });

  return (
    <form onSubmit={onSubmit} className="pb-12">
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <FormSection
          step="01 Your details"
          title="How you appear to clients"
          description="Shown on the proposals and invoices your clients open."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              {...register("name")}
              label="Your name"
              placeholder="e.g. Alex Doe"
              error={errors.name?.message}
            />

            <div className="flex flex-col gap-1">
              <label
                htmlFor="brandColor"
                className="text-muted-foreground font-sans text-[13px] font-medium"
              >
                Brand colour
              </label>
              <div className="flex items-center gap-2">
                {/* The native picker writes into the same field as the text
                    input, so either way of choosing stays in sync. */}
                <input
                  type="color"
                  aria-label="Pick brand colour"
                  value={swatch}
                  onChange={(event) =>
                    setValue("brandColor", event.target.value, {
                      shouldDirty: true,
                    })
                  }
                  className="border-border h-11 w-12 shrink-0 cursor-pointer rounded-lg border bg-transparent p-1"
                />
                <Field
                  {...register("brandColor")}
                  id="brandColor"
                  placeholder={DEFAULT_BRAND_COLOR}
                  className="font-mono"
                  error={errors.brandColor?.message}
                />
              </div>
            </div>
          </div>
        </FormSection>

        <div className="border-border border-t" />

        <FormSection
          step="02 Getting paid"
          title="Your payment details"
          description="Copied onto the invoices you raise, including deposit invoices. Clients pay you directly — Clentric never handles the money and never asks for card details."
        >
          <Field
            {...register("paymentDetails")}
            multiline
            rows={5}
            label="Bank, PayPal or Wise details"
            placeholder={"Account name\nSort code / IBAN\nPayPal or Wise link"}
            error={errors.paymentDetails?.message}
          />
        </FormSection>

        <div className="border-border border-t" />

        <FormSection
          step="03 Social proof"
          title="Testimonial (optional)"
          description="Shown at the bottom of your public proposal pages."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field
                {...register("testimonialQuote")}
                multiline
                rows={3}
                label="Quote"
                placeholder="They turned our vague brief into something we were proud to ship."
                error={errors.testimonialQuote?.message}
              />
            </div>
            <Field
              {...register("testimonialAuthor")}
              label="Who said it"
              placeholder="e.g. Marcus R., Northbeam Studio"
              error={errors.testimonialAuthor?.message}
            />
          </div>
        </FormSection>
      </div>

      <div className="mt-6 flex justify-end">
        <CustomButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save settings"}
        </CustomButton>
      </div>
    </form>
  );
}
