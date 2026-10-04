/**
 * Single source of truth for Clentric's plans.
 *
 * - PLANS: limits used for server-side gating at write time.
 * - PRICING: display data for the pricing section. The UI reads prices,
 *   features and CTAs from here only, never hard-coded in JSX.
 *
 * Keep PLANS.free.limits in step with PRICING.free.features: the Free card
 * promises exactly these numbers.
 *
 * No payment provider is named here or anywhere in the UI copy.
 */

export type PlanId = "free" | "pro" | "agency";

/** Infinity means no limit. */
export type PlanLimits = {
  clients: number;
  projects: number;
  invoicesPerMonth: number;
  proposals: number;
};

export const PLANS: Record<PlanId, { limits: PlanLimits }> = {
  free: {
    limits: { clients: 1, projects: 1, invoicesPerMonth: 3, proposals: 2 },
  },
  pro: {
    limits: {
      clients: Infinity,
      projects: Infinity,
      invoicesPerMonth: Infinity,
      proposals: Infinity,
    },
  },
  agency: {
    limits: {
      clients: Infinity,
      projects: Infinity,
      invoicesPerMonth: Infinity,
      proposals: Infinity,
    },
  },
};

export const LAUNCH_DATE = "2026-10-14";
export const AGENCY_LAUNCH_DATE = "2026-10-26";

export type BillingCycle = "monthly" | "yearly";

/** A priced plan, in whole USD per month. */
export type PlanPrice = { monthly: number };

/**
 * Yearly billing takes this much off the monthly price. The yearly total
 * shown on the bill is decided later, so the cards show only the
 * per-month figure.
 */
export const YEARLY_DISCOUNT_PER_MONTH = 2;

/** "1 project", "3 invoices": keeps limit copy right when a number changes. */
export function countLabel(n: number, noun: string): string {
  return `${n} ${n === 1 ? noun : `${noun}s`}`;
}

export type ProFeature = { text: string; availableAtLaunch: boolean };

export type AgencyFeature = {
  text: string;
  /** ISO date the feature ships. Before it, a live card tags it "Coming soon". */
  availableFrom: string;
};

export type AgencyStatus = "coming_soon" | "live";

const free = {
  name: "Free",
  tagline: "Try Clentric with your first client.",
  price: { label: "$0", sublabel: "forever" },
  features: [
    countLabel(PLANS.free.limits.clients, "client"),
    countLabel(PLANS.free.limits.projects, "project"),
    `${countLabel(PLANS.free.limits.invoicesPerMonth, "invoice")} a month`,
    countLabel(PLANS.free.limits.proposals, "proposal"),
    "Shareable proposal links your client can accept without logging in",
    "Accepted proposal turns into a project and deposit invoice automatically",
    "“Made with Clentric” on your documents",
  ],
  cta: { label: "Start free", href: "/register" },
} as const;

const pro = {
  name: "Pro",
  tagline: "For freelancers working solo.",
  badge: "Most popular",
  price: { monthly: 16 } satisfies PlanPrice,
  featuresHeading: "Everything in Free, plus:",
  features: [
    {
      text: "Unlimited clients, projects, invoices and proposals",
      availableAtLaunch: true,
    },
    { text: "PDF export for invoices", availableAtLaunch: true },
    { text: "No Clentric branding on your documents", availableAtLaunch: true },
    // Not built yet: flip to true once each works.
    {
      text: "Your logo and colours on proposals and invoices",
      availableAtLaunch: true,
    },
    {
      text: "Email notifications and payment reminders",
      availableAtLaunch: false,
    },
  ] satisfies ProFeature[],
  // Until checkout exists this goes to sign-up; upgrading happens later
  // from Billing settings.
  cta: { label: "Get Pro", href: "/register?plan=pro" },
} as const;

const agency = {
  name: "Agency",
  tagline: "For teams. Invite people, control what gets sent.",
  /** Flip to "live" to switch the card's badge, CTA and feature tags. */
  status: "coming_soon" as AgencyStatus,
  badge: { coming_soon: "Coming soon", live: "For teams" },
  launchDateLabel: "26 October 2026",
  price: { monthly: 29 } satisfies PlanPrice,
  includedSeats: 3,
  extraSeatMonthly: 6,
  featuresHeading: "Everything in Pro, plus:",
  features: [
    {
      text: "3 team seats, +$6/month per extra seat",
      availableFrom: AGENCY_LAUNCH_DATE,
    },
    { text: "Roles: Owner, Admin, Member", availableFrom: AGENCY_LAUNCH_DATE },
    { text: "Assign clients to teammates", availableFrom: AGENCY_LAUNCH_DATE },
    {
      text: "Approve proposals and invoices before they are sent",
      availableFrom: AGENCY_LAUNCH_DATE,
    },
    {
      text: "Shared templates for the whole team",
      availableFrom: "2026-11-01",
    },
    {
      text: "Activity log: who did what, and when",
      availableFrom: "2026-11-01",
    },
    {
      text: "Team reports: revenue by client and by teammate",
      availableFrom: "2026-11-01",
    },
    { text: "Priority support", availableFrom: "2026-11-01" },
  ] satisfies AgencyFeature[],
  cta: {
    coming_soon: { label: "Join the Agency waitlist" },
    live: { label: "Get Agency", href: "/register?plan=agency" },
  },
} as const;

/** A comparison-table cell; `comingSoon` adds a small tag beside the value. */
export type ComparisonCell = { value: string; comingSoon?: boolean };

export const PRICING = {
  headline: "Simple pricing",
  subheadline: "Start free. Upgrade when you need more.",
  yearlyBadge: `Save $${YEARLY_DISCOUNT_PER_MONTH}/mo`,
  smallPrint: "Prices in USD. Cancel anytime. See our",
  free,
  pro,
  agency,
  choose: {
    title: "Pro or Agency?",
    pro: [
      "You are the only one who talks to your clients",
      "You write and send every proposal and invoice yourself",
      "You want unlimited everything and no Clentric branding",
    ],
    agency: [
      "Other people work on your clients with you",
      "You want to check a quote before a teammate sends it",
      "You need to see who is handling which client, and what they did",
    ],
  },
  comparison: [
    {
      label: "People who can log in",
      pro: { value: "Just you" },
      agency: { value: "3 included, add more" },
    },
    {
      label: "Roles and permissions",
      pro: { value: "—" },
      agency: { value: "Owner, Admin, Member" },
    },
    {
      label: "Approval before sending",
      pro: { value: "—" },
      agency: { value: "Yes" },
    },
    {
      label: "Assign clients to teammates",
      pro: { value: "—" },
      agency: { value: "Yes" },
    },
    {
      label: "Shared templates",
      pro: { value: "—" },
      agency: { value: "Yes" },
    },
    { label: "Activity log", pro: { value: "—" }, agency: { value: "Yes" } },
    {
      // Reports aren't built yet on either plan.
      label: "Reports",
      pro: { value: "By client", comingSoon: true },
      agency: { value: "By client and teammate", comingSoon: true },
    },
    {
      label: "Support",
      pro: { value: "Email" },
      agency: { value: "Priority" },
    },
  ] satisfies { label: string; pro: ComparisonCell; agency: ComparisonCell }[],
} as const;

/** Per-month price for the chosen cycle: Pro is 16 monthly, 14 yearly. */
export function pricePerMonth(price: PlanPrice, cycle: BillingCycle): number {
  return cycle === "monthly"
    ? price.monthly
    : price.monthly - YEARLY_DISCOUNT_PER_MONTH;
}

/** Agency cost per included seat for the chosen cycle, e.g. "$9.67". */
export function agencyPerPerson(cycle: BillingCycle): string {
  const { price, includedSeats } = PRICING.agency;
  return `$${(pricePerMonth(price, cycle) / includedSeats).toFixed(2)}`;
}

/** True when a dated Agency feature hasn't shipped yet on `today`. */
export function isComingSoon(availableFrom: string, today: string): boolean {
  return today < availableFrom;
}
