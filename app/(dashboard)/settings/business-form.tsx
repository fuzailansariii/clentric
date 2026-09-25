"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/input";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { SaveBar } from "@/components/settings/save-bar";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { updateBusinessAction } from "./actions";
import {
  businessSchema,
  type BusinessFormInput,
  type BusinessFormOutput,
} from "./schema";
import type { BusinessSettings } from "./queries";

export function BusinessForm({ business }: { business: BusinessSettings }) {
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<BusinessFormInput, any, BusinessFormOutput>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      businessName: business.businessName ?? "",
      businessEmail: business.businessEmail ?? "",
      website: business.website ?? "",
      taxId: business.taxId ?? "",
      // Addresses used to be typed over several lines; the field is one
      // line now, so older ones are joined with commas.
      address: (business.address ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join(", "),
    },
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const businessName = useWatch({ control, name: "businessName" });
  const businessEmail = useWatch({ control, name: "businessEmail" });

  const onSubmit = handleSubmit(async (data) => {
    await runActionWithToast(updateBusinessAction(data), {
      loading: "Saving...",
      success: "Business details saved",
      onSuccess: () => {
        // The normalized website becomes the new baseline, so the field
        // shows what was actually saved and the SaveBar clears.
        reset(data);
        router.refresh();
      },
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
        <div className="divide-border @container divide-y">
          <div className="flex min-w-0 items-center gap-3 px-5 py-4 sm:px-6">
            {/* TODO(logo-upload): replace with the uploaded business logo,
                keeping these initials as the fallback when there's none. */}
            <AvatarInitials
              name={businessName || "Business"}
              size="lg"
              shape="square"
              variant="accent"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {businessName || "Your business"}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {businessEmail || "Shown on your invoices and proposals"}
              </p>
            </div>
          </div>

          {/* Two columns from a 560px card, one on a phone. */}
          <div className="grid gap-5 px-5 py-5 sm:px-6 @[560px]:grid-cols-2">
            <Field
              {...register("businessName")}
              label="Business name"
              placeholder="e.g. Chen Studio"
              autoComplete="organization"
              error={errors.businessName?.message}
            />
            <Field
              {...register("businessEmail")}
              label="Email"
              type="email"
              placeholder="billing@chenstudio.dev"
              autoComplete="email"
              error={errors.businessEmail?.message}
            />
            <Field
              {...register("taxId")}
              label="Tax ID / VAT number"
              placeholder="e.g. GB123456789"
              error={errors.taxId?.message}
            />
            <Field
              {...register("website")}
              label="Website (optional)"
              placeholder="chenstudio.dev"
              inputMode="url"
              autoComplete="url"
              error={errors.website?.message}
            />
            <div className="@[560px]:col-span-2">
              <Field
                {...register("address")}
                label="Address"
                placeholder="e.g. 12 High St, London, EC1A 1BB, UK"
                autoComplete="street-address"
                error={errors.address?.message}
              />
            </div>
          </div>
        </div>

        {/* Disabled until something changes. */}
        <SaveBar
          isDirty={isDirty}
          isPending={isSubmitting}
          disabled={!isDirty}
        />
      </div>
    </form>
  );
}
