"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRICING,
  agencyPerPerson,
  isComingSoon,
  pricePerMonth,
  type BillingCycle,
  type ComparisonCell,
  type PlanPrice,
} from "@/lib/plans";
import { AgencyWaitlistForm } from "./agency-waitlist-form";

const EASE = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const inView = {
  initial: "hidden",
  whileInView: "visible",
  viewport: { once: true, margin: "0px 0px -10% 0px" },
} as const;

/** Dark "ink" surface for Agency, the same in both themes. */
const INK =
  "border border-transparent bg-[#0b0b0c] text-white dark:border-white/12 dark:bg-[#111113]";

function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div {...inView} variants={rise} className={className}>
      {children}
    </motion.div>
  );
}

/** A card that rises in with its siblings and lifts a touch on hover. */
function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.article
      variants={rise}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("relative flex flex-col rounded-2xl p-6 sm:p-7", className)}
    >
      {children}
    </motion.article>
  );
}

function ComingSoonTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "ml-1.5 inline-flex rounded-full border px-1.5 py-px align-middle text-[10px] font-medium whitespace-nowrap",
        className ?? "border-border text-muted-foreground",
      )}
    >
      Coming soon
    </span>
  );
}

function FeatureItem({
  children,
  checkClassName,
}: {
  children: ReactNode;
  checkClassName: string;
}) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug">
      <span
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
          checkClassName,
        )}
      >
        <CheckIcon className="size-2.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  const options: { value: BillingCycle; label: string }[] = [
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
  ];

  return (
    <div
      role="group"
      aria-label="Billing period"
      className="border-border bg-card mx-auto flex w-fit items-center rounded-full border p-1 shadow-sm"
    >
      {options.map((opt) => {
        const selected = cycle === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
              selected
                ? "text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {/* One pill shared by both buttons; it slides to the selected one. */}
            {selected && (
              <motion.span
                layoutId="billing-pill"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
                className="bg-foreground absolute inset-0 rounded-full"
              />
            )}
            <span className="relative">{opt.label}</span>
            {opt.value === "yearly" && (
              <span
                className={cn(
                  "relative rounded-full px-1.5 py-0.5 text-[11px] font-semibold transition-colors",
                  selected
                    ? "bg-background/20 text-background"
                    : "bg-primary/10 text-primary",
                )}
              >
                {PRICING.yearlyBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The big number. On Yearly it rolls to the discounted price and shows the
 * monthly price struck through beside it.
 */
function Price({
  price,
  cycle,
  suffix,
  mutedClassName,
}: {
  price: PlanPrice;
  cycle: BillingCycle;
  suffix: string;
  mutedClassName: string;
}) {
  const amount = pricePerMonth(price, cycle);

  return (
    <p className="flex flex-wrap items-baseline gap-x-1.5">
      <AnimatePresence initial={false}>
        {cycle === "yearly" && (
          <motion.s
            key="was"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className={cn(
              "font-space overflow-hidden text-xl whitespace-nowrap tabular-nums",
              mutedClassName,
            )}
          >
            <span className="sr-only">Was </span>${price.monthly}
          </motion.s>
        )}
      </AnimatePresence>
      <span className="relative inline-flex overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={amount}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="font-space text-4xl font-semibold tracking-tight tabular-nums"
          >
            ${amount}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className={cn("text-sm", mutedClassName)}>{suffix}</span>
    </p>
  );
}

const ctaBase =
  "font-space inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition-[filter,background-color,transform] active:scale-[0.98]";

function FreeCard() {
  const { free } = PRICING;
  return (
    <Card className="border-border bg-card border">
      <h3 className="font-space text-xl font-semibold tracking-tight">
        {free.name}
      </h3>
      <p className="text-muted-foreground mt-1.5 text-sm">{free.tagline}</p>

      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="font-space text-4xl font-semibold tracking-tight">
          {free.price.label}
        </span>
        <span className="text-muted-foreground text-sm">
          {free.price.sublabel}
        </span>
      </p>
      {/* Keeps the CTA level with Pro's, which has a billing note here. */}
      <p className="mt-1 min-h-5" aria-hidden="true" />

      <Link
        href={free.cta.href}
        className={cn(
          ctaBase,
          "border-border bg-card hover:bg-secondary mt-5 border",
        )}
      >
        {free.cta.label}
      </Link>

      <ul className="mt-7 flex flex-col gap-3">
        {free.features.map((text) => (
          <FeatureItem key={text} checkClassName="bg-secondary text-foreground">
            {text}
          </FeatureItem>
        ))}
      </ul>
    </Card>
  );
}

function ProCard({ cycle }: { cycle: BillingCycle }) {
  const { pro } = PRICING;
  return (
    <Card className="border-primary bg-card shadow-primary/10 border-2 shadow-xl">
      <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm">
        {pro.badge}
      </span>
      <h3 className="font-space text-xl font-semibold tracking-tight">
        {pro.name}
      </h3>
      <p className="text-muted-foreground mt-1.5 text-sm">{pro.tagline}</p>

      <div className="mt-6">
        <Price
          price={pro.price}
          cycle={cycle}
          suffix="/ month"
          mutedClassName="text-muted-foreground"
        />
      </div>
      <p className="text-muted-foreground mt-1 min-h-5 text-sm">
        {cycle === "yearly" ? "Billed yearly" : "Billed monthly"}
      </p>

      <Link
        href={pro.cta.href}
        className={cn(
          ctaBase,
          "bg-primary text-primary-foreground mt-5 hover:brightness-110",
        )}
      >
        {pro.cta.label}
      </Link>

      <p className="mt-7 text-sm font-medium">{pro.featuresHeading}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {pro.features
          .filter((f) => f.availableAtLaunch)
          .map((f) => (
            <FeatureItem
              key={f.text}
              checkClassName="bg-primary text-primary-foreground"
            >
              {f.text}
            </FeatureItem>
          ))}
      </ul>
    </Card>
  );
}

function AgencyCard({ cycle, today }: { cycle: BillingCycle; today: string }) {
  const { agency } = PRICING;
  const isLive = agency.status === "live";
  const [formOpen, setFormOpen] = useState(false);

  return (
    <Card className={INK}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-space text-xl font-semibold tracking-tight">
          {agency.name}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-2.5 py-1 text-xs font-medium text-white/85">
          {!isLive && (
            <span className="relative flex size-1.5" aria-hidden="true">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-white" />
            </span>
          )}
          {agency.badge[agency.status]}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-white/65">{agency.tagline}</p>

      <div className="mt-6">
        <Price
          price={agency.price}
          cycle={cycle}
          suffix={`/ month for ${agency.includedSeats} seats`}
          mutedClassName="text-white/60"
        />
      </div>
      <p className="mt-1 min-h-5 text-sm text-white/60">
        {agencyPerPerson(cycle)} per person · +${agency.extraSeatMonthly}/month
        per extra seat
      </p>

      <div className="mt-5">
        {isLive ? (
          <Link
            href={agency.cta.live.href}
            className={cn(ctaBase, "bg-white text-[#0b0b0c] hover:bg-white/90")}
          >
            {agency.cta.live.label}
          </Link>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {formOpen ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                <AgencyWaitlistForm autoFocus />
              </motion.div>
            ) : (
              <motion.button
                key="cta"
                type="button"
                onClick={() => setFormOpen(true)}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  ctaBase,
                  "cursor-pointer bg-white text-[#0b0b0c] hover:bg-white/90",
                )}
              >
                {agency.cta.coming_soon.label}
              </motion.button>
            )}
          </AnimatePresence>
        )}
        {!isLive && (
          <p className="mt-2.5 text-center text-xs text-white/55">
            {agency.launchNote}
          </p>
        )}
      </div>

      <p className="mt-7 text-sm font-medium">{agency.featuresHeading}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {agency.features.map((f) => (
          <FeatureItem key={f.text} checkClassName="bg-white text-[#0b0b0c]">
            {f.text}
            {/* Before launch the whole card is "Coming soon"; once live,
                only features whose date hasn't come yet are tagged. */}
            {isLive && isComingSoon(f.availableFrom, today) && (
              <ComingSoonTag className="border-white/20 text-white/70" />
            )}
          </FeatureItem>
        ))}
      </ul>
    </Card>
  );
}

function ComparisonValue({ cell }: { cell: ComparisonCell }) {
  return (
    <>
      {cell.value}
      {cell.comingSoon && <ComingSoonTag />}
    </>
  );
}

function ChooseAndCompare() {
  const { choose, comparison, pro, agency } = PRICING;

  return (
    <div className="mt-20 sm:mt-24">
      <Reveal>
        <h3 className="font-space text-center text-2xl font-semibold tracking-tight sm:text-3xl">
          {choose.title}
        </h3>
      </Reveal>

      <motion.div
        {...inView}
        variants={stagger}
        className="mt-8 grid gap-4 md:grid-cols-2"
      >
        <motion.div
          variants={rise}
          className="border-border bg-card rounded-2xl border p-6"
        >
          <p className="text-muted-foreground text-sm">
            Choose{" "}
            <span className="text-primary font-semibold">{pro.name}</span> if:
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {choose.pro.map((item) => (
              <FeatureItem
                key={item}
                checkClassName="bg-primary text-primary-foreground"
              >
                {item}
              </FeatureItem>
            ))}
          </ul>
        </motion.div>
        <motion.div variants={rise} className={cn("rounded-2xl p-6", INK)}>
          <p className="text-sm text-white/65">
            Choose{" "}
            <span className="font-semibold text-white">{agency.name}</span> if:
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {choose.agency.map((item) => (
              <FeatureItem key={item} checkClassName="bg-white text-[#0b0b0c]">
                {item}
              </FeatureItem>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* Scrolls sideways inside its own box if it ever outgrows a phone,
          so the page itself never scrolls horizontally. */}
      <Reveal className="border-border bg-card mt-4 overflow-x-auto rounded-2xl border">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Pro and Agency compared</caption>
          <thead>
            <tr className="border-border bg-secondary/50 border-b">
              <th scope="col" className="px-4 py-3 font-medium sm:px-6">
                <span className="sr-only">Feature</span>
              </th>
              <th
                scope="col"
                className="font-space text-primary px-4 py-3 font-semibold sm:px-6"
              >
                {pro.name}
              </th>
              <th
                scope="col"
                className="font-space px-4 py-3 font-semibold sm:px-6"
              >
                {agency.name}
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((row) => (
              <tr
                key={row.label}
                className="border-border hover:bg-secondary/40 border-b transition-colors last:border-b-0"
              >
                <th
                  scope="row"
                  className="text-muted-foreground px-4 py-3 font-normal sm:px-6"
                >
                  {row.label}
                </th>
                <td className="px-4 py-3 sm:px-6">
                  <ComparisonValue cell={row.pro} />
                </td>
                <td className="px-4 py-3 sm:px-6">
                  <ComparisonValue cell={row.agency} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Reveal>
    </div>
  );
}

/**
 * Landing-page pricing: Free, Pro and Agency cards with a monthly/yearly
 * toggle, then the Pro-or-Agency guide and comparison table.
 *
 * `today` (YYYY-MM-DD) comes from the server so dated "Coming soon" tags
 * render the same on the server and the client.
 */
export function PricingSection({ today }: { today: string }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <section
      id="pricing"
      className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 sm:py-28"
    >
      <Reveal className="mx-auto mb-10 max-w-2xl text-center">
        <p className="text-primary font-mono text-xs tracking-[0.14em] uppercase">
          Pricing
        </p>
        <h2 className="font-space mt-3 text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.08] font-semibold tracking-[-0.03em] text-balance">
          {PRICING.headline}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty">
          {PRICING.subheadline}
        </p>
      </Reveal>

      <Reveal className="mb-12">
        <BillingToggle cycle={cycle} onChange={setCycle} />
      </Reveal>

      <motion.div
        {...inView}
        variants={stagger}
        className="grid items-start gap-6 lg:grid-cols-3 lg:gap-4"
      >
        <FreeCard />
        <ProCard cycle={cycle} />
        <AgencyCard cycle={cycle} today={today} />
      </motion.div>

      <Reveal>
        <p className="text-muted-foreground mt-8 text-center text-sm">
          {PRICING.smallPrint}{" "}
          <Link
            href="/refund-policy"
            className="text-foreground underline underline-offset-4 hover:no-underline"
          >
            Refund Policy
          </Link>
          .
        </p>
      </Reveal>

      <ChooseAndCompare />
    </section>
  );
}
