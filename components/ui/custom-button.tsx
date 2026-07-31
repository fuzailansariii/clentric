import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-ledger-600 text-white hover:bg-ledger-700 disabled:bg-ink-400",
  secondary:
    "bg-paper-100 text-ink-900 border border-paper-200 hover:bg-paper-200",
  ghost: "bg-transparent text-ink-700 hover:bg-paper-100",
  destructive: "bg-danger-600 text-white hover:bg-danger-600/90",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const CustomButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      />
    );
  },
);

CustomButton.displayName = "Button";
