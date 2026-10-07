"use client";

import { useRef, useTransition } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { CustomButton } from "@/components/ui/custom-button";
import { LOGO_ACCEPT, logoSizeError } from "@/lib/logo-file";
import { runActionWithToast } from "@/lib/run-action-with-toast";
import { cn } from "@/lib/utils";
import { removeLogoAction, uploadLogoAction } from "./actions";

export function LogoUploader({
  logoSrc,
  name,
}: {
  logoSrc: string | null;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const upload = (file: File) => {
    // Quick check for a friendly message; the server checks again.
    const sizeError = logoSizeError(file.size);
    if (sizeError) {
      toast.error(sizeError);
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);
    startTransition(async () => {
      await runActionWithToast(uploadLogoAction(formData), {
        loading: "Uploading logo...",
        success: "Logo saved",
      });
    });
  };

  const remove = () => {
    startTransition(async () => {
      await runActionWithToast(removeLogoAction(), {
        loading: "Removing logo...",
        success: "Logo removed",
      });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 sm:px-6">
      <div
        className={cn(
          "grid h-16 w-40 shrink-0 place-items-center rounded-lg border p-2",
          logoSrc ? "border-border bg-white" : "bg-secondary/40 border-dashed",
        )}
      >
        {logoSrc ? (
          <BrandLogo src={logoSrc} name={name} />
        ) : (
          <ImageIcon
            aria-hidden="true"
            className="text-muted-foreground size-6"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 basis-48">
        <p className="text-sm font-medium">Logo</p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          PNG, JPG or WebP, up to 1 MB. Shown on proposals, invoices and emails.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {logoSrc && (
          <CustomButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={remove}
            disabled={isPending}
          >
            Remove
          </CustomButton>
        )}
        <CustomButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          aria-busy={isPending || undefined}
        >
          {isPending && (
            <Loader2
              aria-hidden="true"
              className="mr-1.5 size-4 animate-spin"
            />
          )}
          {logoSrc ? "Replace" : "Upload logo"}
        </CustomButton>
        <input
          ref={inputRef}
          type="file"
          accept={LOGO_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) upload(file);
          }}
        />
      </div>
    </div>
  );
}
