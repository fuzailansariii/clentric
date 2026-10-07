"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  FileText,
  Receipt,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";
import {
  clearSetupHiddenCookie,
  setSetupHiddenCookie,
} from "@/lib/setup-hidden-cookie";
import { cn } from "@/lib/utils";

export type OnboardingProgress = {
  hasClient: boolean;
  hasInvoice: boolean;
  hasProposal: boolean;
};

type Step = {
  title: string;
  hint: string;
  action: string;
  href: string;
  icon: LucideIcon;
  done: boolean;
  /** Link shown once done, to what the step created. */
  doneLabel: string;
  doneHref: string;
};

export function OnboardingSteps({
  progress,
  userId,
  initiallyHidden,
}: {
  progress: OnboardingProgress;
  /** For the hidden-setup cookie, which is kept per account. */
  userId: string;
  /** From that cookie, read on the server so there's no flash. */
  initiallyHidden: boolean;
}) {
  const steps: Step[] = [
    {
      title: "Add a client",
      hint: "Save their details once. Every proposal and invoice fills them in for you.",
      action: "Add client",
      // returnTo: each create flow comes back here when it's done.
      href: "/clients/new?returnTo=/dashboard",
      icon: UserPlus,
      done: progress.hasClient,
      doneLabel: "View clients",
      doneHref: "/clients",
    },
    {
      title: "Create a proposal",
      hint: "Scope and price a project. When it's ready, share one link your client can accept online.",
      action: "New proposal",
      href: "/proposals/new?returnTo=/dashboard",
      icon: FileText,
      done: progress.hasProposal,
      doneLabel: "View proposals",
      doneHref: "/proposals",
    },
    {
      title: "Create your first invoice",
      hint: "Bill for the work with line items and a due date. Save a draft or send it straight away.",
      action: "New invoice",
      href: "/invoices/new?returnTo=/dashboard",
      icon: Receipt,
      done: progress.hasInvoice,
      doneLabel: "View invoices",
      doneHref: "/invoices",
    },
  ];

  // Only the first unfinished step gets the primary button.
  const nextIndex = steps.findIndex((step) => !step.done);
  const doneCount = steps.filter((step) => step.done).length;

  // The cookie lets the server render it folded on the next visit.
  const [hidden, setHidden] = useState(initiallyHidden);

  const toggle = () => {
    if (hidden) clearSetupHiddenCookie();
    else setSetupHiddenCookie(userId);
    setHidden(!hidden);
  };

  return (
    <MotionConfig reducedMotion="user">
      {/* Container query: the open sidebar eats into the width. */}
      <section
        aria-labelledby="get-set-up-title"
        className="border-border bg-card @container overflow-hidden rounded-xl border shadow-sm"
      >
        <header className="flex items-start justify-between gap-3 px-4 py-3 @3xl:items-center @3xl:px-5">
          <div className="min-w-0">
            <h2 id="get-set-up-title" className="text-sm font-medium">
              Get set up
            </h2>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={hidden ? "hidden" : "shown"}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.15 }}
                className="text-muted-foreground mt-0.5 text-xs"
              >
                {hidden
                  ? "Hidden for now. Your steps are still in the + New menu."
                  : "Everything you need to get paid, in the order you'll need it."}
              </motion.p>
            </AnimatePresence>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StepTracker done={doneCount} total={steps.length} />
            <button
              type="button"
              onClick={toggle}
              aria-expanded={!hidden}
              aria-controls="get-set-up-steps"
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring cursor-pointer rounded-md px-1.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {hidden ? "Show" : "Hide"}
            </button>
          </div>
        </header>

        <AnimatePresence initial={false}>
          {!hidden && (
            <motion.div
              id="get-set-up-steps"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {/* Narrow: stacked rows. Wide: three columns. */}
              <ol className="divide-border border-border grid divide-y border-t @3xl:grid-cols-3 @3xl:divide-x @3xl:divide-y-0">
                {steps.map((step, index) => (
                  <StepItem
                    key={step.title}
                    step={step}
                    number={index + 1}
                    isNext={index === nextIndex}
                  />
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </MotionConfig>
  );
}

function StepTracker({ done, total }: { done: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-xs tabular-nums">
        {done} of {total}
        {/* "done" only where there's room; screen readers always hear it. */}
        <span className="sr-only @md:not-sr-only"> done</span>
      </span>
      {/* One segment per step; the text above already says the same. */}
      <div aria-hidden="true" className="flex gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 w-4 rounded-full @md:w-5",
              index < done ? "bg-success-600" : "bg-foreground/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}

function StepItem({
  step,
  number,
  isNext,
}: {
  step: Step;
  number: number;
  isNext: boolean;
}) {
  const Icon = step.done ? Check : step.icon;

  return (
    <li
      className={cn(
        // Narrow: one row. Wide: a column with the button at the bottom.
        "flex items-center gap-3 p-4",
        "@3xl:flex-col @3xl:items-stretch @3xl:gap-4 @3xl:p-5",
      )}
    >
      <div className="flex shrink-0 items-center justify-between self-start @3xl:self-stretch">
        <IconTile tone={step.done ? "success" : "info"} size="md">
          <Icon />
        </IconTile>
        <span className="text-muted-foreground hidden font-mono text-[10px] font-medium tracking-[0.08em] uppercase @3xl:inline">
          Step {number}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* On narrow cards the step number sits above the title instead. */}
        <span className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.08em] uppercase @3xl:hidden">
          Step {number}
        </span>
        <h3
          className={cn(
            "text-sm font-medium",
            step.done && "text-muted-foreground line-through",
          )}
        >
          {step.title}
        </h3>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {step.hint}
        </p>
      </div>

      <div className="shrink-0 @3xl:mt-auto">
        {step.done ? (
          // The tile's check already says done; link to what was made.
          <Link
            href={step.doneHref}
            className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex h-8 items-center gap-1 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {step.doneLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <Button asChild variant={isNext ? "default" : "outline"}>
            <Link href={step.href}>{step.action}</Link>
          </Button>
        )}
      </div>
    </li>
  );
}
