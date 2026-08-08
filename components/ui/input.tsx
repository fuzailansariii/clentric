import { cn } from "@/lib/utils";
import {
  forwardRef,
  Ref,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

type BaseProp = {
  label?: string;
  error?: string;
  className?: string;
};

type InputFieldProps = BaseProp &
  InputHTMLAttributes<HTMLInputElement> & { multiline?: false };

type TextareaFieldProps = BaseProp &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline?: true };

type FieldProps = TextareaFieldProps | InputFieldProps;

const baseStyles =
  "w-full rounded-lg border border-border font-sans bg-input/20 font-medium px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60";

export const Field = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  FieldProps
>(({ label, error, className = "", multiline, id, ...props }, ref) => {
  const fieldId = id ?? props.name;

  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="text-muted-foreground font-sans text-[13px] font-medium"
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          ref={ref as Ref<HTMLTextAreaElement>}
          id={fieldId}
          rows={4}
          className={cn(baseStyles, "min-h-24 py-2", className)}
          aria-invalid={!!error}
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          ref={ref as Ref<HTMLInputElement>}
          id={fieldId}
          className={cn(baseStyles, "h-10", className)}
          aria-invalid={!!error}
          {...(props as InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {error && <span className="text-danger-600 text-xs">{error}</span>}
    </div>
  );
});

Field.displayName = "Field";
