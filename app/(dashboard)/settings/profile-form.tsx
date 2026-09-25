"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/input";
import { FieldSelect } from "@/components/ui/field-select";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { SaveBar } from "@/components/settings/save-bar";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import {
  PROFESSIONS,
  PROFESSION_LABELS,
  isProfession,
} from "@/lib/professions";
import { updateProfileAction } from "./actions";
import {
  profileSchema,
  type ProfileFormInput,
  type ProfileFormOutput,
} from "./schema";
import type { ProfileSettings } from "./queries";

const PROFESSION_OPTIONS = PROFESSIONS.map((value) => ({
  value,
  label: PROFESSION_LABELS[value],
}));

export function ProfileForm({ profile }: { profile: ProfileSettings }) {
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<ProfileFormInput, any, ProfileFormOutput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.name ?? "",
      profession: isProfession(profile.profession)
        ? profile.profession
        : undefined,
    },
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const fullName = useWatch({ control, name: "fullName" });

  const onSubmit = handleSubmit(async (data) => {
    await runActionWithToast(updateProfileAction(data), {
      loading: "Saving...",
      success: "Profile saved",
      onSuccess: () => {
        // New baseline so the SaveBar stops reporting unsaved changes.
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
            {/* Upload comes later; initials stand in for the avatar. */}
            <AvatarInitials
              name={fullName || profile.email}
              size="lg"
              shape="circle"
              variant="accent"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {fullName || "Your name"}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {profile.email}
              </p>
            </div>
          </div>

          {/* Two columns from a 560px card, one on a phone. */}
          <div className="px-5 py-5 sm:px-6">
            <div className="grid gap-5 @[560px]:grid-cols-2">
              <Field
                {...register("fullName")}
                label="Full name"
                placeholder="e.g. Alex Doe"
                autoComplete="name"
                error={errors.fullName?.message}
              />

              <Controller
                control={control}
                name="profession"
                render={({ field }) => (
                  <FieldSelect
                    id="profession"
                    label="What you do"
                    placeholder="Choose one"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={PROFESSION_OPTIONS}
                    error={errors.profession?.message}
                  />
                )}
              />

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="email"
                    className="text-muted-foreground font-sans text-[13px] font-medium"
                  >
                    Email
                  </label>
                  {profile.emailVerified && (
                    <StatusBadge status="success" variant="soft" size="sm">
                      Verified
                    </StatusBadge>
                  )}
                </div>
                <Field
                  id="email"
                  value={profile.email}
                  readOnly
                  className="text-muted-foreground cursor-default"
                />
              </div>
            </div>
          </div>
        </div>

        {/* "Unsaved changes" + Save; submits this form. Disabled until
            something changes. */}
        <SaveBar
          isDirty={isDirty}
          isPending={isSubmitting}
          disabled={!isDirty}
        />
      </div>
    </form>
  );
}
