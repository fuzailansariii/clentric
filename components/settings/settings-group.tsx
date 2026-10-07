import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type SettingsGroupProps = {
  title: string;
  description?: string;
  className?: string;
  children: ReactNode;
};

/**
 * One group inside a settings tab (e.g. "Profile", "Your data").
 *
 * The heading sits directly above its cards at every width. Groups are
 * separated by a rule; the parent's gap-5 above it matches this pt-5 below
 * it, so the rule sits centred between groups.
 */
export function SettingsGroup({
  title,
  description,
  className,
  children,
}: SettingsGroupProps) {
  return (
    <section
      className={cn(
        "border-border mx-auto flex w-full max-w-3xl flex-col gap-3 border-t px-2 pt-5 first:border-t-0 first:pt-0 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="font-space text-base font-medium tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}
