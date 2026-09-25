import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SettingsSectionProps = {
  title: string;
  /** Shown beside the title, e.g. a <StatusBadge />. */
  badge?: ReactNode;
  description?: string;
  children?: ReactNode;
  /** Rendered flush at the bottom of the card, e.g. a <SaveBar />. */
  footer?: ReactNode;
  /**
   * Drop the body padding so <SettingsRow />s can draw edge-to-edge
   * dividers. Rows bring their own horizontal padding.
   */
  flush?: boolean;
  className?: string;
};

/** One settings card: heading, description, body and an optional footer. */
export function SettingsSection({
  title,
  badge,
  description,
  children,
  footer,
  flush = false,
  className,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        "bg-card overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
    >
      <header className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {badge}
        </div>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </header>

      {children && (
        <div
          className={cn(
            flush
              ? "divide-border mt-4 divide-y border-t"
              : "px-5 pt-5 pb-5 sm:px-6 sm:pb-6",
          )}
        >
          {children}
        </div>
      )}

      {/* Keep the header from touching the card edge when there's no body. */}
      {!children && !footer && <div className="pb-5 sm:pb-6" />}

      {footer}
    </section>
  );
}
