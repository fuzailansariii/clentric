import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { statusToneStyles, type StatusTone } from "./status-badge";

/**
 * Square tinted mark that leads a list row — a folder for projects, a
 * document for invoices. Its tone follows the row's status so the mark and
 * the status pill read as one signal.
 */
export function IconTile({
  tone,
  size = "sm",
  children,
  className,
}: {
  tone: StatusTone;
  /** "sm" (32px) for table rows, "md" (36px) for mobile rows. */
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        size === "sm"
          ? "size-8 rounded-lg [&_svg]:size-[15px]"
          : "size-9 rounded-[10px] [&_svg]:size-4",
        statusToneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
