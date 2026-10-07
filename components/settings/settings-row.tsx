import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsRowProps = {
  title: ReactNode;
  /** Muted line under the title: current value, hint or status. */
  detail?: ReactNode;
  /** Right-side control: a switch, button, select or link. */
  children?: ReactNode;
  /** Put the control under the text instead of beside it. */
  stacked?: boolean;
  className?: string;
};

/**
 * A row in a list group, meant for a `flush` <SettingsSection />. The
 * control wraps under the text when the card gets too narrow for both.
 */
export function SettingsRow({
  title,
  detail,
  children,
  stacked = false,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex gap-x-4 gap-y-3 px-5 py-4 sm:px-6",
        stacked
          ? "flex-col items-start"
          : "flex-wrap items-center justify-between",
        className,
      )}
    >
      <div className={cn("min-w-0", stacked ? "w-full" : "flex-1 basis-56")}>
        <div className="text-sm font-medium">{title}</div>
        {detail && (
          <div className="text-muted-foreground mt-0.5 text-sm break-words">
            {detail}
          </div>
        )}
      </div>
      {children && (
        <div className="flex shrink-0 items-center gap-2">{children}</div>
      )}
    </div>
  );
}
