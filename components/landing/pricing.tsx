"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { CheckIcon, MinusIcon, PlusIcon } from "lucide-react";
import { LEGAL } from "@/lib/legal-config";
import {
  AGENCY_LAUNCH_DATE,
  PRICING,
  isComingSoon,
  pricePerMonth,
  type BillingCycle,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SECTION, SectionHead } from "./parts";
import { useOpenWaitlist } from "./waitlist-context";

const { free, pro, agency } = PRICING;
const MAX_SEATS = 25;
const AGENCY_SHORT_DATE = new Date(`${AGENCY_LAUNCH_DATE}T00:00:00Z`).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const CTA =
  "mt-5 flex h-10 w-full cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-[filter,scale] duration-150 hover:brightness-[.94] active:scale-[.98]";
const CTA_PLAIN = "bg-card text-foreground border-(--lp-border-strong)";
const CTA_HOT = "bg-primary text-primary-foreground border-primary";

export function Pricing({ today }: { today: string }) {
  const openWaitlist = useOpenWaitlist();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [seats, setSeats] = useState<number>(agency.includedSeats);
  const yearly = cycle === "yearly";
  const proPrice = pricePerMonth(pro.price, cycle);
  const agencyPrice =
    pricePerMonth(agency.price, cycle) +
    (seats - agency.includedSeats) * agency.extraSeatMonthly;
  const agencyLive = agency.status === "live";

  return (
    <section id="pricing" aria-labelledby="pricing-h" className={SECTION}>
      <SectionHead
        eyebrow="Pricing"
        title={PRICING.subheadline}
        titleId="pricing-h"
        aside={
          <SegmentedControl
            label="Billing period"
            value={cycle}
            onChange={setCycle}
            className="border-(--lp-border-strong)"
            itemClassName="px-4.5"
            options={[
              { value: "monthly", label: "Monthly" },
              {
                value: "yearly",
                label: (
                  <>
                    Yearly
                    <span className="group-aria-pressed/seg:bg-background/15 group-aria-pressed/seg:text-background rounded-sm bg-(--lp-success-bg) px-1.5 py-0.5 text-[11.5px] font-semibold text-(--lp-success-fg) transition-colors duration-200">
                      {PRICING.yearlyBadge}
                    </span>
                  </>
                ),
              },
            ]}
          />
        }
      />

      <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(min(100%,290px),1fr))] items-stretch gap-5">
        <PlanCard
          rv="0"
          name={free.name}
          desc={free.tagline}
          price={free.price.label}
          per={free.price.sublabel}
          bill="No card needed"
          cta={
            <button type="button" onClick={() => openWaitlist()} className={cn(CTA, CTA_PLAIN)}>
              {free.cta.label}
            </button>
          }
        >
          {free.features.map((f) => (
            <Feature key={f}>{f}</Feature>
          ))}
        </PlanCard>

        <PlanCard
          rv="120"
          hot
          name={pro.name}
          badge={<Badge>{pro.badge}</Badge>}
          desc={pro.tagline}
          price={`$${proPrice}`}
          per="/ month"
          bill={yearly ? `$${proPrice * 12} billed yearly` : "Billed monthly"}
          inc={pro.featuresHeading}
          cta={
            <button type="button" onClick={() => openWaitlist()} className={cn(CTA, CTA_HOT)}>
              {pro.cta.label}
            </button>
          }
        >
          {pro.features.map((f) => (
            <Feature key={f.text} soon={!f.availableAtLaunch}>
              {f.text}
            </Feature>
          ))}
        </PlanCard>

        <PlanCard
          rv="240"
          name={agency.name}
          badge={<Badge soon={!agencyLive}>{agency.badge[agency.status]}</Badge>}
          desc={agency.tagline}
          price={`$${agencyPrice}`}
          per="/ month"
          bill={`${seats} seats · +$${agency.extraSeatMonthly}/month per extra${agencyLive ? "" : ` · launches ${AGENCY_SHORT_DATE}`}`}
          inc={agency.featuresHeading}
          seats={
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border bg-(--lp-sunk) py-2 pr-2 pl-3.5">
              <span className="text-sm">Team seats</span>
              <span className="flex items-center gap-1">
                <SeatButton label="Remove a seat" disabled={seats <= agency.includedSeats} onClick={() => setSeats((s) => s - 1)}>
                  <MinusIcon className="size-4" aria-hidden="true" />
                </SeatButton>
                <span aria-live="polite" className="font-space min-w-8 text-center font-medium tabular-nums">
                  {seats}
                </span>
                <SeatButton label="Add a seat" disabled={seats >= MAX_SEATS} onClick={() => setSeats((s) => s + 1)}>
                  <PlusIcon className="size-4" aria-hidden="true" />
                </SeatButton>
              </span>
            </div>
          }
          cta={
            agencyLive ? (
              <Link href={agency.cta.live.href} className={cn(CTA, CTA_PLAIN)}>
                {agency.cta.live.label}
              </Link>
            ) : (
              <button type="button" onClick={() => openWaitlist("agency")} className={cn(CTA, CTA_PLAIN)}>
                {agency.cta.coming_soon.label}
              </button>
            )
          }
        >
          {agency.features.map((f) => (
            <Feature key={f.text} soon={agencyLive && isComingSoon(f.availableFrom, today)}>
              {f.text}
            </Feature>
          ))}
        </PlanCard>
      </div>

      <p data-rv="0" className="mt-5 text-[13.5px] text-pretty text-(--lp-muted)">
        {PRICING.smallPrint}{" "}
        <Link href={LEGAL.routes.refund} className="hover:text-foreground underline underline-offset-2">
          refund policy
        </Link>
        .
      </p>
    </section>
  );
}

function PlanCard({
  rv,
  name,
  badge,
  desc,
  price,
  per,
  bill,
  inc,
  seats,
  cta,
  hot = false,
  children,
}: {
  rv: string;
  name: string;
  badge?: ReactNode;
  desc: string;
  price: string;
  per: string;
  bill: string;
  inc?: string;
  seats?: ReactNode;
  cta: ReactNode;
  hot?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-rv={rv}
      className={cn(
        "bg-card flex flex-col rounded-[14px] border p-7",
        hot && "border-primary shadow-[0_0_0_1px_var(--primary),var(--lp-lift)]",
      )}
    >
      <div className="flex min-h-6 items-center justify-between gap-2">
        <h3 className="font-space text-[22px] font-medium tracking-[-0.02em]">{name}</h3>
        {badge}
      </div>
      <p className="mt-1.5 text-[14.5px] text-pretty text-(--lp-muted)">{desc}</p>
      <div className="mt-6 flex items-baseline gap-1.5">
        {/* Keyed so a new price or bill line rolls in instead of swapping. */}
        <span key={price} className="font-space text-[42px] leading-none font-medium tracking-[-0.04em] tabular-nums animate-[lp-in_.4s_cubic-bezier(.2,.7,.2,1)_both]">
          {price}
        </span>
        <span className="text-sm text-(--lp-muted)">{per}</span>
      </div>
      <div key={bill} className="mt-2 min-h-5.25 text-[13.5px] text-(--lp-muted) animate-[lp-in_.4s_cubic-bezier(.2,.7,.2,1)_both]">
        {bill}
      </div>
      {seats}
      {cta}
      <ul className="mt-6 flex flex-col gap-2.5 border-t pt-5">
        {inc && <li className="text-[13.5px] text-(--lp-muted)">{inc}</li>}
        {children}
      </ul>
    </div>
  );
}

function Badge({ soon = false, children }: { soon?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-xl px-2.5 text-xs font-medium whitespace-nowrap",
        soon ? "bg-(--lp-warning-bg) text-(--lp-warning-fg)" : "bg-(--lp-accent-bg) text-(--lp-accent-fg)",
      )}
    >
      {children}
    </span>
  );
}

function Feature({ children, soon = false }: { children: ReactNode; soon?: boolean }) {
  return (
    <li className="flex items-start gap-2.5 text-[14.5px]">
      <CheckIcon className="text-primary mt-0.75 size-4 flex-none" strokeWidth={2.2} aria-hidden="true" />
      <span>
        {children}
        {soon && (
          <span className="ml-2 inline-flex h-5 items-center rounded-full bg-(--lp-neutral-bg) px-2 align-[1px] text-[11.5px] font-medium whitespace-nowrap text-(--lp-neutral-fg)">
            Coming soon
          </span>
        )}
      </span>
    </li>
  );
}

function SeatButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="bg-card grid size-9 cursor-pointer place-items-center rounded-md border border-(--lp-border-strong) transition-[background-color,scale] duration-150 hover:bg-(--lp-hover) enabled:active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
