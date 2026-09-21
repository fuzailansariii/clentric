import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { LEGAL } from "@/lib/legal-config";

const FOOTER_LINKS = [
  { href: LEGAL.routes.privacy, label: "Privacy" },
  { href: LEGAL.routes.terms, label: "Terms" },
  { href: LEGAL.routes.refund, label: "Refunds" },
  { href: LEGAL.routes.contact, label: "Contact" },
];

interface LegalFooterProps {
  /** Lets a host page match its own container width and padding. */
  containerClassName?: string;
  /** Extra links (e.g. Unsubscribe) rendered after the legal links. */
  children?: ReactNode;
}

/**
 * Shared footer carrying the four public policy links Stripe expects to find
 * on the site, plus the operating business name.
 */
export function LegalFooter({
  containerClassName,
  children,
}: LegalFooterProps) {
  return (
    <footer className="border-border border-t">
      <div
        className={cn(
          "text-muted-foreground mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between",
          containerClassName,
        )}
      >
        <div className="flex flex-col gap-1">
          <span>
            © {new Date().getFullYear()} {LEGAL.productName}
          </span>
          <span className="text-xs">
            Operated by {LEGAL.operatorLegalName} · {LEGAL.entityType}
          </span>
        </div>

        <nav
          aria-label="Legal and support"
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-foreground focus-visible:ring-ring rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            >
              {link.label}
            </Link>
          ))}
          {children}
        </nav>
      </div>
    </footer>
  );
}
