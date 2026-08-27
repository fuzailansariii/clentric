type ProgressBarProps = {
  value: number;
  className?: string;
};

import { cn } from "@/lib/utils";
import React from "react";

export default function ProgressBar({ className, value }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "bg-border h-1.5 w-full overflow-hidden rounded-full",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-300"
        style={{
          width: `${clamped}%`,
        }}
      />
    </div>
  );
}
