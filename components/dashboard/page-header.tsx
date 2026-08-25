"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BreadcrumbItemType = {
  label: string;
  href?: string;
};

type BreadcrumbMode = "full" | "condensed" | "hidden";

type PageHeaderProps = {
  title: string;
  subtitle?: string;

  /**
   * Used on list/index pages.
   * Detail pages use backHref instead.
   */
  icon?: ReactNode;

  /**
   * Can be a status badge, count badge, etc.
   */
  badge?: ReactNode;

  /**
   * When provided, the header behaves as a detail-page header
   * and renders a back button instead of the section icon.
   */
  backHref?: string;

  /**
   * Header action buttons.
   *
   * Desktop: displayed normally.
   * Tablet: displayed in compact form.
   * Mobile: placed inside a More menu.
   */
  actions?: ReactNode;

  breadcrumbs?: BreadcrumbItemType[];

  /**
   * Controls the breadcrumb presentation.
   *
   * full:
   *   Desktop -> full
   *   Tablet  -> condensed
   *   Mobile  -> hidden
   *
   * condensed:
   *   Desktop -> condensed
   *   Tablet  -> condensed
   *   Mobile  -> hidden
   *
   * hidden:
   *   hidden everywhere
   */
  breadcrumbMode?: BreadcrumbMode;

  /**
   * Optional className for custom page-level adjustments.
   */
  className?: string;
};

function BreadcrumbCrumb({
  item,
  isLast = false,
}: {
  item: BreadcrumbItemType;
  isLast?: boolean;
}) {
  if (item.href && !isLast) {
    return (
      <BreadcrumbItem className="font-mono text-xs">
        <BreadcrumbLink
          asChild
          className="text-foreground/70 hover:text-foreground transition-colors"
        >
          <Link href={item.href}>{item.label}</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );
  }

  return (
    <BreadcrumbItem className="font-mono text-xs">
      <BreadcrumbPage className="text-secondary-foreground max-w-45 truncate">
        {item.label}
      </BreadcrumbPage>
    </BreadcrumbItem>
  );
}

function FullBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: BreadcrumbItemType[];
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap overflow-hidden text-xs">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          return (
            <div
              key={`${item.label}-${index}`}
              className="flex min-w-0 shrink-0 items-center gap-1"
            >
              <BreadcrumbCrumb item={item} isLast={isLast} />

              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function CondensedBreadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: BreadcrumbItemType[];
}) {
  if (breadcrumbs.length === 0) {
    return null;
  }

  if (breadcrumbs.length <= 2) {
    return <FullBreadcrumbs breadcrumbs={breadcrumbs} />;
  }

  const first = breadcrumbs[0];
  const last = breadcrumbs[breadcrumbs.length - 1];

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap text-xs">
        <div className="flex shrink-0 items-center gap-1">
          <BreadcrumbCrumb item={first} />

          <BreadcrumbSeparator />

          <BreadcrumbItem className="flex items-center gap-1 font-mono text-xs">
            <span aria-hidden="true" className="text-muted-foreground px-0.5">
              ...
            </span>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbCrumb item={last} isLast />
        </div>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function MobileBreadcrumb({
  breadcrumbs,
}: {
  breadcrumbs: BreadcrumbItemType[];
}) {
  if (breadcrumbs.length === 0) {
    return null;
  }

  const last = breadcrumbs[breadcrumbs.length - 1];

  return (
    <div className="flex min-w-0 items-center gap-1 text-xs">
      <ChevronRightIcon className="text-muted-foreground h-3 w-3 shrink-0" />

      <span className="text-secondary-foreground max-w-45 truncate font-mono">
        {last.label}
      </span>
    </div>
  );
}

export default function PageHeader({
  title,
  subtitle,
  icon,
  badge,
  backHref,
  actions,
  breadcrumbs = [],
  breadcrumbMode = "full",
  className,
}: PageHeaderProps) {
  const isDetailPage = Boolean(backHref);
  const hasActions = Boolean(actions);
  const hasBreadcrumbs = breadcrumbs.length > 0 && breadcrumbMode !== "hidden";

  return (
    <header
      className={["border-border bg-background border-b", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="px-4 py-3 sm:px-5 lg:px-6">
        {/* =========================================================
            BREADCRUMBS
            ========================================================= */}

        {hasBreadcrumbs && (
          <>
            {/* Desktop: full breadcrumb trail */}
            <div className="hidden lg:block">
              {breadcrumbMode === "full" ? (
                <FullBreadcrumbs breadcrumbs={breadcrumbs} />
              ) : (
                <CondensedBreadcrumbs breadcrumbs={breadcrumbs} />
              )}
            </div>

            {/* Tablet: condensed breadcrumb trail */}
            <div className="hidden md:block lg:hidden">
              <CondensedBreadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            {/* Mobile: only current breadcrumb */}
            <div className="block md:hidden">
              <MobileBreadcrumb breadcrumbs={breadcrumbs} />
            </div>
          </>
        )}

        {/* =========================================================
            HEADER CONTENT
            ========================================================= */}

        <div
          className={[
            "mt-2 flex min-w-0 items-center justify-between gap-3",
            "md:gap-4",
          ].join(" ")}
        >
          {/* =======================================================
              LEFT SIDE
              ======================================================= */}

          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            {/* Detail page back button */}
            {isDetailPage && backHref ? (
              <Link
                href={backHref}
                aria-label="Go back"
                className={[
                  "border-border bg-background",
                  "hover:bg-muted/50",
                  "flex h-9 w-9 shrink-0 items-center justify-center",
                  "rounded-lg border",
                  "transition-colors",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                  "md:h-9 md:w-9",
                ].join(" ")}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </Link>
            ) : (
              /* List page icon */
              icon && (
                <div
                  aria-hidden="true"
                  className={[
                    "bg-primary/10 text-primary",
                    "flex h-9 w-9 shrink-0 items-center justify-center",
                    "rounded-lg",
                    "sm:h-10 sm:w-10",
                  ].join(" ")}
                >
                  {icon}
                </div>
              )
            )}

            {/* =====================================================
                TITLE + SUBTITLE
                ===================================================== */}

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <h1
                  className={[
                    "font-space",
                    "min-w-0 truncate",
                    "text-lg font-medium",
                    "md:text-2xl",
                  ].join(" ")}
                >
                  {title}
                </h1>

                {badge && <div className="min-w-0 shrink-0">{badge}</div>}
              </div>

              {subtitle && (
                <p
                  className={[
                    "text-muted-foreground",
                    "mt-0.5",
                    "line-clamp-1",
                    "text-xs sm:text-[13px]",
                    "max-w-full",
                  ].join(" ")}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* =======================================================
              DESKTOP / TABLET ACTIONS
              ======================================================= */}

          {hasActions && (
            <>
              {/* Desktop actions */}
              <div className="hidden shrink-0 items-center gap-2 lg:flex">
                {actions}
              </div>

              {/* Tablet actions */}
              <div className="hidden shrink-0 items-center gap-1.5 md:flex lg:hidden">
                {actions}
              </div>

              {/* ===================================================
                  MOBILE ACTION MENU
                  =================================================== */}

              <details className="relative shrink-0 md:hidden">
                <summary
                  aria-label="Open actions"
                  className={[
                    "border-border bg-background",
                    "hover:bg-muted/50",
                    "flex h-9 w-9 cursor-pointer list-none",
                    "items-center justify-center",
                    "rounded-lg border",
                    "transition-colors",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    "[&::-webkit-details-marker]:hidden",
                  ].join(" ")}
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </summary>

                <div
                  className={[
                    "border-border bg-background",
                    "absolute top-[calc(100%+0.5rem)] right-0 z-50",
                    "min-w-37.5",
                    "rounded-lg border p-1",
                    "shadow-lg",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-1 [&_button]:w-full [&_button]:justify-start">
                    {actions}
                  </div>
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
