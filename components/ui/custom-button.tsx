import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "destructive"
  | "danger-outline"
  | "danger-soft"
  | "accent"
  | "success";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

// The everyday button (shadcn's "outline"): card fill, border, light shadow.
const OUTLINE =
  "bg-card text-foreground border border-border shadow-xs hover:bg-secondary dark:bg-secondary/40 dark:hover:bg-secondary";

const variantStyles: Record<Variant, string> = {
  // The one main action: solid blue with a soft glow of its own colour.
  primary:
    "bg-primary-solid text-primary-solid-foreground shadow-[0_4px_14px_0_color-mix(in_srgb,var(--primary-solid)_38%,transparent)] hover:bg-primary-solid/90 hover:shadow-[0_6px_20px_0_color-mix(in_srgb,var(--primary-solid)_24%,transparent)] disabled:opacity-50 disabled:shadow-none",
  secondary: OUTLINE,
  ghost:
    "bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
  // Opens something destructive (e.g. a confirm dialog) without being the
  // final, solid-red action itself.
  "danger-outline":
    "border border-destructive/60 bg-transparent text-destructive hover:bg-destructive/10",
  // Same job, quieter: a tinted red block, e.g. Delete at the foot of a card.
  "danger-soft": "bg-danger-600/10 text-danger-600 hover:bg-danger-600/15",
  // Quiet actions (Edit, Archive, Download PDF) look like the everyday button.
  accent: OUTLINE,
  // Money coming in (Mark as paid): the main-action style, in green.
  success:
    "bg-success-600 text-white shadow-[0_4px_14px_0_color-mix(in_srgb,var(--color-success-600)_38%,transparent)] hover:bg-success-600/90 hover:shadow-[0_6px_20px_0_color-mix(in_srgb,var(--color-success-600)_24%,transparent)] disabled:opacity-50 disabled:shadow-none",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** The button look, for a Link that should read as a button. */
export function customButtonClasses(
  variant: Variant = "primary",
  size: Size = "md",
  className = "",
) {
  return `inline-flex cursor-pointer items-center justify-center rounded-lg font-medium transition-[color,background-color,border-color,box-shadow] focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
}

export const CustomButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={customButtonClasses(variant, size, className)}
        {...props}
      />
    );
  },
);

CustomButton.displayName = "Button";
