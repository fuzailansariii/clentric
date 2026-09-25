"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FieldSelectOption = {
  value: string;
  label: string;
};

type FieldSelectProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly FieldSelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

/**
 * A Select that looks like a Field.
 *
 * shadcn's SelectTrigger ships its own look — sharper corners, transparent
 * background, lighter text and a wider focus ring — which sits visibly apart
 * from this project's Field inputs. Putting a dropdown next to a text input
 * made that obvious. Rather than patching the classes at each call site, the
 * Field styling lives here once, alongside the same label and error markup.
 */
export function FieldSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
  className,
  id,
}: FieldSelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-muted-foreground font-sans text-[13px] font-medium"
        >
          {label}
        </label>
      )}

      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          aria-invalid={!!error}
          className={cn(
            // Matches Field's baseStyles rather than the shadcn defaults.
            // Height is set through data-[size=default] too: SelectTrigger's
            // own data-[size=default]:h-8 is an attribute selector, so it
            // outranks a plain h-11 and left selects shorter than inputs.
            "border-border bg-input/20 h-11 w-full rounded-lg px-3 font-sans text-sm font-medium data-[size=default]:h-11",
            "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "dark:bg-input/20 dark:hover:bg-input/30",
            className,
          )}
        >
          {/* No children here on purpose — Radix replaces them with the
              selected item's text, so anything richer is discarded. */}
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error && <span className="text-danger-600 text-xs">{error}</span>}
    </div>
  );
}
