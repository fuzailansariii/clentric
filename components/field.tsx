"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { Field as InputField } from "./ui/input";
import { cn } from "@/lib/utils";

type DataFieldProps = {
  label: string;
  editing?: boolean;
  href?: string;
  value?: string | null;
  registration?: UseFormRegisterReturn & {
    onKeyDown?: React.KeyboardEventHandler<
      HTMLInputElement | HTMLTextAreaElement
    >;
  };
  error?: string;
  type?: "text" | "email" | "tel" | "textarea";
};

export function DataField({
  label,
  editing = false,
  error,
  href,
  registration,
  type = "text",
  value,
}: DataFieldProps) {
  if (editing) {
    return (
      <InputField
        label={label}
        error={error}
        multiline={type === "textarea"}
        {...(type !== "textarea" && { type })}
        {...registration}
      />
    );
  }

  const isLongText = type === "textarea";

  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-[13px]",
          isLongText ? "wrap-break-words" : "truncate",
        )}
        title={!isLongText && value ? value : undefined}
      >
        {!value ? (
          <span className="text-muted-foreground">—</span>
        ) : href ? (
          <a href={href} className="text-primary hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
