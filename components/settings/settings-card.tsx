import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A plain settings card with no heading of its own: the <SettingsGroup />
 * around it already names it. Holds <SettingsRow />s, which bring their own
 * padding and are divided edge to edge.
 */
export function SettingsCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card divide-border divide-y overflow-hidden rounded-xl border shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
