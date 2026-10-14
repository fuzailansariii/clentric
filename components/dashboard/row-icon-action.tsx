"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The one icon a list row shows for its next step. A tooltip names it;
 * when disabled, the tooltip says why instead.
 */
export function RowIconAction({
  icon: Icon,
  label,
  ariaLabel,
  onClick,
  href,
  download,
  disabledReason,
  tone = "default",
}: {
  icon: LucideIcon;
  /** Tooltip text, e.g. "Send". */
  label: string;
  /** Fuller accessible name, e.g. "Send INV-045"; defaults to the label. */
  ariaLabel?: string;
  onClick?: () => void;
  href?: string;
  download?: boolean;
  disabledReason?: string | null;
  /** "attention" tints it primary: something waits on you. */
  tone?: "default" | "attention";
}) {
  const className = customButtonClasses(
    "ghost",
    "sm",
    cn("w-8 px-0!", tone === "attention" && "text-primary hover:text-primary"),
  );
  const content = <Icon className="size-4" aria-hidden="true" />;

  let trigger;
  if (disabledReason) {
    // A disabled button fires no pointer events, so the span carries the tooltip.
    trigger = (
      <span
        tabIndex={0}
        aria-label={`${ariaLabel ?? label}: ${disabledReason}`}
      >
        <button type="button" disabled className={className} tabIndex={-1}>
          {content}
        </button>
      </span>
    );
  } else if (href && download) {
    trigger = (
      <a
        href={href}
        download
        aria-label={ariaLabel ?? label}
        className={className}
      >
        {content}
      </a>
    );
  } else if (href) {
    trigger = (
      <Link href={href} aria-label={ariaLabel ?? label} className={className}>
        {content}
      </Link>
    );
  } else {
    trigger = (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel ?? label}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent>{disabledReason ?? label}</TooltipContent>
    </Tooltip>
  );
}
