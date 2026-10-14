import Link from "next/link";
import PageHeader from "@/components/dashboard/page-header";
import { customButtonClasses } from "@/components/ui/custom-button";

export const UPGRADE_HREF = "/settings/billing";

/** Stands in for a "New ..." form when the Free plan has no room left. */
export function PlanLimitPage({
  title,
  section,
  sectionHref,
  message,
}: {
  /** e.g. "New client". */
  title: string;
  /** e.g. "Clients". */
  section: string;
  sectionHref: string;
  message: string;
}) {
  return (
    <>
      <PageHeader
        title={title}
        backHref={sectionHref}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: section, href: sectionHref },
          { label: "New" },
        ]}
      />
      <div className="px-2 py-5 sm:px-3 md:px-5 lg:px-10">
        <div className="bg-card mx-auto max-w-190 rounded-lg border shadow-xs">
          <div className="flex max-w-130 flex-col items-start gap-2.5 px-6 py-11">
            <h2 className="text-base font-semibold">
              You&apos;ve reached the Free plan limit
            </h2>
            <p className="text-muted-foreground text-sm text-pretty">
              {message} Everything you already have stays editable.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2 max-sm:w-full">
              <Link
                href={UPGRADE_HREF}
                className={customButtonClasses("primary", "sm", "max-sm:h-11 max-sm:flex-1")}
              >
                Upgrade to Pro
              </Link>
              <Link
                href={sectionHref}
                className={customButtonClasses("secondary", "sm", "max-sm:h-11 max-sm:flex-1")}
              >
                Back to {section.toLowerCase()}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
