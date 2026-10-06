import type { ReactNode } from "react";
import { SettingsSection } from "@/components/settings/settings-section";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import type { BillingState } from "@/lib/billing";
import { proAccessEndsAt } from "@/lib/billing/resolve-plan";
import { formatDate } from "@/lib/format-date";
import { PRICING, pricePerMonth } from "@/lib/plans";
import { getPlanUsage } from "./queries";
import { CheckoutReturn, ManageBillingButton, UpgradeButtons } from "./billing-buttons";

// Whole-number counts ("1,204"); formatNumber is for money-style decimals.
const countFormat = new Intl.NumberFormat("en-US");

const UPGRADE_OPTIONS = [
  {
    interval: "monthly" as const,
    label: `Upgrade monthly - $${pricePerMonth(PRICING.pro.price, "monthly")}/month`,
  },
  {
    interval: "yearly" as const,
    label: `Upgrade yearly - $${pricePerMonth(PRICING.pro.price, "yearly") * 12}/year`,
  },
];

function planSummary(state: BillingState): {
  badge: string;
  tone: StatusTone;
  description: string;
} {
  const sub = state.subscription;
  switch (state.source) {
    case "beta":
      return {
        badge: "Free during beta",
        tone: "success",
        description:
          "Everything is unlocked while Clentric is in beta. Founding members get a discount when paid plans launch.",
      };
    case "grant":
      return {
        badge: "Pro",
        tone: "success",
        description: state.grant?.expiresAt
          ? `Pro, gifted to you until ${formatDate(state.grant.expiresAt)}.`
          : "Pro, gifted to you.",
      };
    case "subscription": {
      const end = sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd) : null;
      const billed = sub?.interval === "yearly" ? "Billed yearly" : "Billed monthly";
      const ending = sub?.cancelAtPeriodEnd || sub?.status === "cancelled";
      let description = `${billed}.`;
      const graceEnd = sub?.status === "on_hold" ? proAccessEndsAt(sub) : null;
      if (graceEnd) {
        description = `${billed}. The renewal payment failed: Pro stays until ${formatDate(graceEnd)}.`;
      } else if (sub?.status === "past_due") {
        description = `${billed}. The renewal payment failed and is being retried.`;
      } else if (end) {
        description = ending ? `Pro until ${end}. It won't renew.` : `${billed}. Renews on ${end}.`;
      }
      return { badge: "Pro", tone: "success", description };
    }
    default:
      return {
        badge: "Free",
        tone: "neutral",
        description: "You're on the Free plan. Upgrade for unlimited clients, projects, proposals and invoices.",
      };
  }
}

export async function PlanSection() {
  const usage = await getPlanUsage();
  const state = usage.billing;
  const summary = planSummary(state);

  const paymentFailed =
    state.row?.status === "on_hold" || state.row?.status === "past_due";
  const canUpgrade = state.source === "free" && !paymentFailed;

  const tiles = [
    { label: "Clients", value: usage.clients },
    { label: "Proposals", value: usage.proposals },
    { label: "Projects", value: usage.projects },
    { label: "Invoices this month", value: usage.invoicesThisMonth },
  ];

  let footnote: ReactNode = null;
  if (state.source === "beta") {
    footnote = "No limits apply during the beta. We'll email you before anything changes.";
  }

  return (
    <SettingsSection
      title="Your plan"
      badge={<StatusBadge status={summary.tone}>{summary.badge}</StatusBadge>}
      description={summary.description}
    >
      <div className="@container flex flex-col gap-4">
        <CheckoutReturn isPro={state.source === "subscription"} />

        {paymentFailed && (
          <div
            role="alert"
            className="border-warning-600/30 bg-warning-600/10 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
          >
            <p className="text-sm">
              Your last payment didn&apos;t go through. Update your card to keep Pro.
            </p>
            <ManageBillingButton variant="primary" />
          </div>
        )}

        <dl className="grid grid-cols-2 gap-3 @[560px]:grid-cols-4">
          {tiles.map((tile) => (
            <div
              key={tile.label}
              className="bg-secondary/40 flex min-w-0 flex-col-reverse gap-1 rounded-lg border px-4 py-3.5"
            >
              <dt className="text-muted-foreground truncate text-sm">
                {tile.label}
              </dt>
              <dd className="font-space text-2xl font-medium tabular-nums @[560px]:text-3xl">
                {countFormat.format(tile.value)}
              </dd>
            </div>
          ))}
        </dl>

        {canUpgrade && <UpgradeButtons options={UPGRADE_OPTIONS} />}
        {footnote && <p className="text-muted-foreground text-xs">{footnote}</p>}
      </div>
    </SettingsSection>
  );
}
