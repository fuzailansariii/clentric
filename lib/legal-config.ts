/**
 * Single source of truth for every fact shown on the public legal pages
 * (/privacy, /terms, /refund-policy, /contact) and in the legal footer.
 *
 * All four pages read from here so the plan names, prices, refund window and
 * support details cannot drift apart between pages.
 *
 * Values still wrapped in [SQUARE BRACKETS] are unfilled — they render
 * literally on the live pages so a missing value is impossible to miss.
 *
 * NOTE FOR MAINTAINERS (never shown to visitors): these pages are a
 * plain-English template, not legal advice. A qualified professional should
 * review them before they are relied on, especially the liability cap,
 * governing law, and the controller/processor split.
 */

export type LegalPlan = {
  name: string;
  price: string;
  cadence: string;
  summary: string;
  includes: readonly string[];
};

export const LEGAL = {
  /** Product and operator identity. */
  productName: "Clentric",
  domain: "clentric.app",
  siteUrl: "https://clentric.app",
  tagline:
    "A client-centric workspace for freelancers to manage clients, projects, invoices and proposals in one place.",

  /** The business behind the product. */
  operatorLegalName: "Mohd Fuzail Ansari",
  entityType: "Sole Proprietorship (India)",
  operatorCountry: "India",
  /** null hides the postal address everywhere rather than printing a
   * placeholder. Set a string here if Stripe later asks for one. */
  registeredAddress: null as string | null,

  /** Customer service. */
  supportEmail: "clentricapp@gmail.com",
  responseTime: "within 2 business days",

  /** Retention windows.
   *
   * legalRecordsRetentionPeriod covers billing and tax records we have to
   * keep after an account closes. Seven years is a deliberate superset of
   * the Indian rules that apply to a sole proprietorship: income-tax books
   * are generally kept six years from the end of the relevant assessment
   * year, and GST records seventy-two months. Worth confirming with an
   * accountant once there is revenue to account for.
   *
   * There is intentionally no soft-delete purge window here. The database
   * has deletedAt columns, but nothing hard-deletes those rows yet, so
   * promising a purge after N days would be a claim the app does not keep.
   * Add the value back only alongside a real purge job. */
  legalRecordsRetentionPeriod: "7 years",
  dataExportWindow: "30 days",

  /** Governing law, used on the Terms page. Naming a specific city's courts
   * is stronger than this; swap it in when you want to. */
  governingLaw:
    "the laws of India, and the courts of India have jurisdiction over any dispute",

  /** Refund and cancellation rules. These numbers are fixed — every page
   * that mentions them reads them from here. */
  refund: {
    windowHours: 48,
    reviewWithin: "3 business days",
    fundsArriveWithin: "5 to 10 business days",
  },

  /** Subscription plans, rendered as a table on the Terms page. */
  plans: [
    {
      name: "Free",
      price: "$0",
      cadence: "",
      summary: "For trying Clentric out.",
      includes: [
        "1 client",
        "1 project",
        "3 invoices per month",
        "2 proposals",
        "No PDF export, client portal or custom branding",
      ],
    },
    {
      name: "Pro",
      price: "$15",
      cadence: "per month",
      summary: "For working freelancers.",
      includes: [
        "Unlimited clients, projects, invoices and proposals",
        "PDF export",
        "Client portal",
        "Custom branding",
        "Email notifications",
      ],
    },
    {
      name: "Agency",
      price: "$25",
      cadence: "per month",
      summary: "For small teams.",
      includes: ["Everything in Pro", "Up to 3 team members"],
    },
  ] as const satisfies readonly LegalPlan[],

  currency: "USD",

  /** Third parties that process data on Clentric’s behalf. */
  processors: [
    { name: "Supabase", purpose: "Database, authentication and file storage" },
    { name: "Vercel", purpose: "Hosting" },
    {
      name: "Stripe",
      purpose: "Subscription billing for Clentric plans only",
    },
    {
      name: "Resend",
      purpose:
        "Transactional email, such as invoice and proposal notifications",
    },
    { name: "Google", purpose: "Optional Google sign-in" },
  ],

  /** Error monitoring is only disclosed once it is actually running. */
  sentryIsLive: false,
  /** Name of the analytics tool in use, or null when there is none. */
  analyticsTool: null as string | null,

  /** Routes, so links stay consistent across pages and the footer. */
  routes: {
    privacy: "/privacy",
    terms: "/terms",
    refund: "/refund-policy",
    contact: "/contact",
  },
} as const;

/** Builds a mailto: link to support, optionally with a pre-filled subject. */
export function mailtoHref(subject?: string): string {
  const base = `mailto:${LEGAL.supportEmail}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

/** The processor list, with Sentry appended only when it is really live. */
export function activeProcessors(): readonly {
  name: string;
  purpose: string;
}[] {
  const monitoring = LEGAL.sentryIsLive
    ? [{ name: "Sentry", purpose: "Error monitoring" }]
    : [];
  return [...LEGAL.processors, ...monitoring];
}
