import Link from "next/link";
import { MailIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { LEGAL, mailtoHref } from "@/lib/legal-config";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/#how", label: "How it works" },
      { href: "/#dashboard", label: "Dashboard" },
      { href: "/#pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: LEGAL.routes.privacy, label: "Privacy" },
      { href: LEGAL.routes.terms, label: "Terms" },
      { href: LEGAL.routes.refund, label: "Refunds" },
    ],
  },
  {
    title: "Support",
    links: [
      { href: LEGAL.routes.contact, label: "Contact" },
      { href: "/unsubscribe", label: "Unsubscribe" },
    ],
  },
];

// Landing frame colour inside .lp, the app border everywhere else.
const LINE = "border-[var(--lp-frame,var(--border))]";

const LINK =
  "text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none";

interface LegalFooterProps {
  /** Lets a host page match its own container width. */
  containerClassName?: string;
}

/**
 * Shared site footer: brand, product links, and the policy links payment
 * providers expect to find on every public page.
 */
export function LegalFooter({ containerClassName }: LegalFooterProps) {
  return (
    <footer className={cn("border-t text-sm", LINE)}>
      <div
        className={cn(
          "mx-auto w-full max-w-6xl sm:border-x",
          LINE,
          containerClassName,
        )}
      >
        <div className="grid sm:grid-cols-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div
            className={cn(
              "flex flex-col items-start gap-4 border-b p-6 sm:col-span-3 sm:p-8 lg:col-span-1 lg:border-r lg:border-b-0",
              LINE,
            )}
          >
            <Link
              href="/"
              aria-label={`${LEGAL.productName} home`}
              className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
            >
              <Logo aria-hidden="true" className="block h-7" />
            </Link>
            <p className="text-muted-foreground max-w-xs text-pretty">
              Proposals, projects and invoices for freelancers, in one place.
            </p>
            <a
              href={mailtoHref()}
              className="bg-card hover:bg-muted focus-visible:ring-ring inline-flex h-9 items-center gap-2 rounded-md border px-3 font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <MailIcon
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
              {LEGAL.supportEmail}
            </a>
          </div>

          {COLUMNS.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className={cn(
                "min-w-0 border-b px-6 py-5 last:border-b-0 sm:border-r sm:border-b-0 sm:p-8 sm:last:border-r-0",
                LINE,
              )}
            >
              <h2 className="text-foreground font-medium">{column.title}</h2>
              <ul className="mt-3 flex flex-col gap-2.5 sm:mt-4">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div
          className={cn(
            "text-muted-foreground flex flex-col gap-1 border-t px-6 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8",
            LINE,
          )}
        >
          <span>
            © {new Date().getFullYear()} {LEGAL.productName}. All rights
            reserved.
          </span>
          <span>{LEGAL.entityType}</span>
        </div>
      </div>
    </footer>
  );
}
