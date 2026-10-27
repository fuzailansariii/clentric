"use client";

import Link from "next/link";
import { Loader2, type LucideIcon } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import { usePdfDownload } from "@/hooks/use-pdf-download";
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
  /** `href` is a PDF to save, not a page. */
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
  const { download: downloadPdf, isDownloading } = usePdfDownload();

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
      <button
        type="button"
        onClick={() => downloadPdf(href)}
        disabled={isDownloading}
        aria-busy={isDownloading}
        aria-label={ariaLabel ?? label}
        className={className}
      >
        {isDownloading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          content
        )}
      </button>
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
