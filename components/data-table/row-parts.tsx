import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Every list (clients, projects, invoices) shares one row anatomy:
// a leading mark, a name with one line of context, then the figure and
// status that answer "do I need to open this?".

/** Table lead cell: mark + name + one line of context. */
export function RowIdentity({
  leading,
  title,
  subtitle,
  titleClassName,
}: {
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {leading}
      <div className="min-w-0">
        <div
          className={cn(
            "text-foreground truncate font-medium",
            titleClassName,
          )}
        >
          {title}
        </div>
        {subtitle && (
          <div className="text-muted-foreground truncate text-[12.5px]">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

/** Mobile row: mark | name + context | figure + status | actions, with an
 * optional full-width line underneath (e.g. a progress bar). */
export function MobileListRow({
  leading,
  title,
  subtitle,
  trailing,
  actions,
  footer,
  titleClassName,
}: {
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  titleClassName?: string;
}) {
  return (
    <div className="grid grid-cols-[36px_minmax(0,1fr)_auto_auto] items-center gap-x-2.5 py-3 pr-2 pl-3">
      {leading}

      <div className="min-w-0">
        <div className={cn("truncate text-sm font-medium", titleClassName)}>
          {title}
        </div>
        {subtitle && (
          <div className="text-muted-foreground truncate text-[12.5px]">
            {subtitle}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">{trailing}</div>

      <div>{actions}</div>

      {footer && <div className="col-span-2 col-start-2 mt-2">{footer}</div>}
    </div>
  );
}
