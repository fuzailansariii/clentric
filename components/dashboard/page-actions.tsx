"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { customButtonClasses } from "@/components/ui/custom-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** One action on a detail page, drawn as a card on wider screens and a menu on phones. */
export type PageAction = {
  label: string;
  kind: "primary" | "secondary" | "quiet" | "danger";
  icon?: ReactNode;
  onClick?: () => void;
  href?: string;
  /** A file to save (PDF), not a page. */
  download?: boolean;
  disabled?: boolean;
  /** Shown under the button in the card: why it's off, or emails left. */
  hint?: string | null;
};

function ActionControl({
  action,
  className,
}: {
  action: PageAction;
  className: string;
}) {
  const content = (
    <>
      {action.icon}
      {action.label}
    </>
  );
  if (action.href && action.download) {
    return (
      <a href={action.href} download className={className}>
        {content}
      </a>
    );
  }
  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={action.disabled}
      title={action.disabled && action.hint ? action.hint : undefined}
      className={className}
      onClick={action.onClick}
    >
      {content}
    </button>
  );
}

const quietClass = customButtonClasses("accent", "md", "w-full gap-1.5");
const dangerClass = customButtonClasses("danger-soft", "md", "w-full gap-1.5");

/**
 * The actions part of a rail card, from tablet up: main buttons, quiet links,
 * then Delete alone under a rule. Phones get the same list in MoreMenu.
 */
export function CardActions({
  actions,
  className,
  hideOnPhone = true,
}: {
  actions: PageAction[];
  className?: string;
  /** False when phones have no other place for these (no header menu copy). */
  hideOnPhone?: boolean;
}) {
  const main = actions.filter((a) => a.kind === "primary" || a.kind === "secondary");
  const quiet = actions.filter((a) => a.kind === "quiet");
  const danger = actions.filter((a) => a.kind === "danger");

  return (
    <div className={cn(hideOnPhone && "max-md:hidden", className)}>
      {main.length > 0 && (
        <div className="grid gap-2">
          {main.map((action) => (
            <div key={action.label}>
              <ActionControl
                action={action}
                className={customButtonClasses(
                  action.kind === "primary" ? "primary" : "secondary",
                  "md",
                  "w-full gap-1.5",
                )}
              />
              {action.hint && (
                <p className="text-muted-foreground mt-1.5 text-center text-xs">
                  {action.hint}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {quiet.length > 0 && (
        <div className={cn("grid gap-1", main.length > 0 && "mt-2")}>
          {quiet.map((action) => (
            <ActionControl key={action.label} action={action} className={quietClass} />
          ))}
        </div>
      )}
      {danger.length > 0 && (
        <div className="mt-3 border-t pt-3">
          {danger.map((action) => (
            <ActionControl key={action.label} action={action} className={dangerClass} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Actions as header buttons, from tablet up; phones get MoreMenu. */
export function HeaderActions({ actions }: { actions: PageAction[] }) {
  return (
    <>
      {actions.map((action) => (
        <ActionControl
          key={action.label}
          action={action}
          className={customButtonClasses(
            action.kind === "danger"
              ? "danger-soft"
              : action.kind === "quiet"
                ? "accent"
                : action.kind,
            "sm",
            "gap-1.5",
          )}
        />
      ))}
    </>
  );
}

/** The same actions in the header's "..." menu on phones; Delete last, after a divider. */
export function MoreMenu({ actions }: { actions: PageAction[] }) {
  const order = ["primary", "secondary", "quiet", "danger"] as const;
  const sorted = order.flatMap((kind) => actions.filter((a) => a.kind === kind));
  const itemClass = "focus:bg-sidebar-accent/50 cursor-pointer gap-2 px-2 py-2";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="More actions"
        className="border-border bg-background hover:bg-muted/50 focus-visible:ring-ring flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <MoreHorizontalIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-52 p-1.5">
        {sorted.map((action, index) => (
          <Fragment key={action.label}>
            {action.kind === "danger" && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              variant={action.kind === "danger" ? "destructive" : "default"}
              disabled={action.disabled}
              asChild={Boolean(action.href)}
              onClick={action.href ? undefined : action.onClick}
              className={itemClass}
            >
              {action.href && action.download ? (
                <a href={action.href} download>
                  {action.icon}
                  {action.label}
                </a>
              ) : action.href ? (
                <Link href={action.href}>
                  {action.icon}
                  {action.label}
                </Link>
              ) : (
                <>
                  {action.icon}
                  {action.label}
                </>
              )}
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
