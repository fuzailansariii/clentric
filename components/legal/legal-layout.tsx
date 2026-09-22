import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { LEGAL } from "@/lib/legal-config";
import { LegalFooter } from "@/components/legal/legal-footer";

interface LegalLayoutProps {
  title: string;
  /** Omitted on pages that aren’t policies, such as Contact. */
  lastUpdated?: string;
  /** Short standfirst shown under the heading. */
  intro?: ReactNode;
  children: ReactNode;
}

/**
 * Page shell for the public policy pages: brand header, a readable single
 * column, and the shared legal footer.
 */
export function LegalLayout({
  title,
  lastUpdated,
  intro,
  children,
}: LegalLayoutProps) {
  return (
    <div className="bg-background text-foreground flex min-h-full flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link
            href="/"
            className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <Logo fontSize={20} />
          </Link>
          <Link
            href={LEGAL.routes.contact}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm text-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Contact
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12 sm:py-16">
        <h1 className="font-space text-3xl leading-tight font-semibold tracking-[-0.02em] text-balance sm:text-4xl">
          {title}
        </h1>

        {lastUpdated && (
          <p className="text-muted-foreground mt-3 text-sm">
            Last updated: {lastUpdated}
          </p>
        )}

        {intro && (
          <div className="text-muted-foreground mt-6 text-[15px] leading-relaxed text-pretty">
            {intro}
          </div>
        )}

        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <LegalFooter />
    </div>
  );
}

interface LegalSectionProps {
  title: string;
  /** Anchor id, so sections can be linked to directly. */
  id?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A titled section. Body copy is styled with arbitrary variants rather than
 * the typography plugin, which this project doesn’t install.
 */
export function LegalSection({
  title,
  id,
  children,
  className,
}: LegalSectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20", className)}>
      <h2 className="font-space text-xl font-semibold tracking-[-0.01em] sm:text-2xl">
        {title}
      </h2>
      <div
        className={cn(
          "mt-4 space-y-4 text-[15px] leading-relaxed",
          "[&_p]:text-muted-foreground [&_p]:text-pretty",
          "[&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-semibold",
          "[&_ul]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
          "[&_ol]:text-muted-foreground [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
          "[&_li]:text-pretty",
          "[&_strong]:text-foreground [&_strong]:font-semibold",
          "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
          "[&_a:hover]:no-underline",
          "[&_a:focus-visible]:ring-ring [&_a:focus-visible]:rounded-sm [&_a:focus-visible]:ring-2 [&_a:focus-visible]:outline-none",
        )}
      >
        {children}
      </div>
    </section>
  );
}

interface LegalCalloutProps {
  title: string;
  children: ReactNode;
}

/** Highlighted “short version” box shown at the top of a policy page. */
export function LegalCallout({ title, children }: LegalCalloutProps) {
  return (
    <aside
      className={cn(
        "border-border bg-card rounded-xl border p-5 sm:p-6",
        "text-[15px] leading-relaxed",
        "[&_p]:text-muted-foreground [&_p]:text-pretty",
        "[&_ul]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
        "[&_strong]:text-foreground [&_strong]:font-semibold",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4",
        "[&_a:hover]:no-underline",
      )}
    >
      <h2 className="font-space text-foreground text-base font-semibold">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </aside>
  );
}
