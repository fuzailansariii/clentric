"use client";

import { Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

type Pricing = "fixed" | "hourly";

const OPTIONS: { value: Pricing; label: string; hint: string; icon: typeof Tag }[] = [
  { value: "fixed", label: "Fixed price", hint: "One agreed price", icon: Tag },
  { value: "hourly", label: "Hourly", hint: "Billed by the hour", icon: Clock },
];

export function PricingPicker({
  value,
  onChange,
}: {
  value: Pricing;
  onChange: (value: Pricing) => void;
}) {
  return (
    <div role="radiogroup" aria-label="How you charge" className="flex flex-col gap-1.5">
      <span className="text-muted-foreground text-[13px] font-medium">
        How you charge
      </span>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map(({ value: option, label, hint, icon: Icon }) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted/50",
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  selected ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block text-sm font-medium",
                    selected && "text-primary",
                  )}
                >
                  {label}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
