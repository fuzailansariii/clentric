"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { CheckIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Field } from "@/components/ui/input";
import { SaveBar } from "@/components/settings/save-bar";
import {
  BRAND_COLOR_PRESETS,
  resolveBrandColor,
  textOnBrandColor,
} from "@/lib/brand-color";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import { updateBrandingAction } from "./actions";
import {
  brandingSchema,
  type BrandingFormInput,
  type BrandingFormOutput,
} from "./schema";
import type { BrandingSettings } from "./queries";

export function BrandingForm({ branding }: { branding: BrandingSettings }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<BrandingFormInput, any, BrandingFormOutput>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      brandColor: branding.brandColor ?? "",
      testimonialQuote: branding.testimonialQuote ?? "",
      testimonialAuthor: branding.testimonialAuthor ?? "",
    },
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const [brandColor, quote, author] = useWatch({
    control,
    name: ["brandColor", "testimonialQuote", "testimonialAuthor"],
  });
  const color = resolveBrandColor(brandColor);

  const onSubmit = handleSubmit(async (data) => {
    await runActionWithToast(updateBrandingAction(data), {
      loading: "Saving...",
      success: "Branding saved",
      onSuccess: () => reset(data),
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="divide-border divide-y">
        <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-medium">Brand colour</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Used for buttons and accents on your proposal pages.
            </p>
          </div>
          <Controller
            control={control}
            name="brandColor"
            render={({ field }) => (
              <div className="flex flex-wrap items-center gap-2">
                <div
                  role="radiogroup"
                  aria-label="Brand colour"
                  className="flex flex-wrap gap-2"
                >
                  {BRAND_COLOR_PRESETS.map((preset) => {
                    const selected = color === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={preset}
                        onClick={() =>
                          field.onChange(
                            preset === BRAND_COLOR_PRESETS[0] ? "" : preset,
                          )
                        }
                        className={cn(
                          "focus-visible:ring-ring grid size-8 cursor-pointer place-items-center rounded-full border border-foreground/20 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                          selected && "ring-foreground ring-2 ring-offset-2",
                        )}
                        style={{ backgroundColor: preset }}
                      >
                        {selected && (
                          <CheckIcon
                            aria-hidden="true"
                            className="size-4"
                            style={{ color: textOnBrandColor(preset) }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
                <label className="border-border bg-background flex h-8 items-center gap-2 rounded-md border pr-2 pl-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => field.onChange(event.target.value)}
                    aria-label="Custom colour"
                    className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                    placeholder={BRAND_COLOR_PRESETS[0]}
                    maxLength={7}
                    spellCheck={false}
                    aria-label="Hex colour"
                    aria-invalid={Boolean(errors.brandColor) || undefined}
                    className="w-20 bg-transparent font-mono text-sm outline-none"
                  />
                </label>
              </div>
            )}
          />
          {errors.brandColor && (
            <p className="text-destructive text-sm">
              {errors.brandColor.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 px-5 py-4 sm:px-6">
          <div>
            <p className="text-sm font-medium">Testimonial (optional)</p>
            <p className="text-muted-foreground mt-0.5 text-sm">
              A short quote from a happy client, shown at the end of your
              proposals.
            </p>
          </div>
          <Field
            {...register("testimonialQuote")}
            id="testimonial-quote"
            multiline
            rows={3}
            maxLength={300}
            label="Quote"
            placeholder="Delivered ahead of schedule and a joy to work with."
            error={errors.testimonialQuote?.message}
          />
          <Field
            {...register("testimonialAuthor")}
            id="testimonial-author"
            maxLength={80}
            label="Who said it"
            placeholder="Priya Shah, Head of Product at Lumen"
            error={errors.testimonialAuthor?.message}
          />
        </div>

        <div className="px-5 py-4 sm:px-6">
          <p className="text-muted-foreground mb-3 text-sm">
            Preview of your proposal page
          </p>
          <BrandingPreview
            color={color}
            logoSrc={branding.logoSrc}
            name={branding.displayName}
            quote={quote?.trim() ?? ""}
            author={author?.trim() ?? ""}
          />
        </div>
      </div>

      <SaveBar isDirty={isDirty} isPending={isSubmitting} disabled={!isDirty} />
    </form>
  );
}

function BrandingPreview({
  color,
  logoSrc,
  name,
  quote,
  author,
}: {
  color: string;
  logoSrc: string | null;
  name: string;
  quote: string;
  author: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="bg-card border-border overflow-hidden rounded-xl border"
    >
      <div className="h-1.5" style={{ backgroundColor: color }} />
      <div className="border-border flex items-center gap-3 border-b px-4 py-3">
        <BrandLogo src={logoSrc} name={name} fallbackShape="circle" />
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
          Proposal
        </p>
        <div className="bg-ink-400/25 h-2.5 w-2/3 rounded-full" />
        <div className="bg-ink-400/20 h-2 w-full rounded-full" />
        <div
          className="mt-1 rounded-lg px-4 py-2.5 text-center text-sm font-semibold"
          style={{ backgroundColor: color, color: textOnBrandColor(color) }}
        >
          Accept proposal
        </div>
        {quote && (
          <blockquote className="border-border border-t pt-3">
            <p className="text-sm italic">&ldquo;{quote}&rdquo;</p>
            {author && (
              <footer className="text-muted-foreground mt-1 text-xs">
                - {author}
              </footer>
            )}
          </blockquote>
        )}
      </div>
    </div>
  );
}
