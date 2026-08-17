"use client";

import { UseFormRegisterReturn } from "react-hook-form";
import { Field as InputField } from "./ui/input";

type DataFieldProps = {
  label: string;
  editing?: boolean;
  href?: string;
  value?: string | null;
  registration?: UseFormRegisterReturn;
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

  return (
    <div>
      <dt className="text-muted-foreground font-mono text-[10.5px] font-medium tracking-[0.06em] uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm">
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
