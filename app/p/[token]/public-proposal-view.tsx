"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Mail } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { resolveBrandColor, textOnBrandColor } from "@/lib/brand-color";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatPercent } from "@/lib/format-currency";
import { formatDate } from "@/lib/format-date";
import { formatIssuer } from "@/lib/format-issuer";
import { formatPaymentMethod, hasPaymentDetails } from "@/lib/payment-methods";
import { cn } from "@/lib/utils";
import {
  markPaymentSentAction,
  respondProposalAction,
  viewProposalAction,
  type RespondResult,
} from "@/app/(dashboard)/proposals/public-actions";
import { depositAmounts } from "@/lib/deposit-amounts";
import type { PublicProposal } from "@/app/(dashboard)/proposals/actions";

type Props = {
  proposal: PublicProposal;
  token: string;
};

const qty = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const labelClass =
  "text-muted-foreground text-[11px] font-semibold tracking-[0.12em] uppercase";
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const inputClass =
  "border-border bg-background focus-visible:border-ring focus-visible:ring-ring/20 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none";

export function PublicProposalView({ proposal, token }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [outcome, setOutcome] = useState<RespondResult | null>(
    // A reopened link shows the answer already given, not the buttons again.
    proposal.status === "accepted"
      ? { response: "accepted", deposit: proposal.deposit }
      : proposal.status === "rejected"
        ? { response: "declined", deposit: null }
        : null,
  );
  const [acceptedAt, setAcceptedAt] = useState(proposal.acceptedAt);
  const [paymentClaimed, setPaymentClaimed] = useState(proposal.paymentClaimed);
  const [paymentNote, setPaymentNote] = useState("");

  const recorded = useRef(false);
  useEffect(() => {
    // Fire-and-forget, once per mount; the action only writes the first view.
    if (recorded.current) return;
    recorded.current = true;
    void viewProposalAction(token);
  }, [token]);

  const brand = resolveBrandColor(proposal.owner.brandColor);
  const onBrand = textOnBrandColor(brand);
  const currency = proposal.currency;
  const money = (value: string | number) =>
    formatCurrency(String(value), currency);
  const depositPercent = Number(proposal.depositPercent);
  const taxRate = Number(proposal.taxRate);
  const depositAmount = depositAmounts(
    proposal.subtotal,
    proposal.total,
    depositPercent,
  ).total;

  const issuer = formatIssuer(proposal.owner);
  const ownerName = issuer.title;
  const clientLabel = proposal.clientCompany ?? proposal.clientName;

  const stages = [
    ...proposal.milestones.map((stage) => ({
      ...stage,
      name: stage.name as string | null,
      items: proposal.items.filter((item) => item.milestoneId === stage.id),
    })),
    ...(proposal.items.some((item) => !item.milestoneId)
      ? [
          {
            id: "ungrouped",
            name: null,
            description: null,
            timeframe: null,
            items: proposal.items.filter((item) => !item.milestoneId),
          },
        ]
      : []),
  ];

  const respond = (response: "accepted" | "declined") => {
    setError(null);
    startTransition(async () => {
      const result = await respondProposalAction({
        token,
        response,
        declineReason: response === "declined" ? declineReason : undefined,
      });
      if (result.success) {
        setOutcome(result.data);
        if (response === "accepted") setAcceptedAt(new Date());
        setDeclining(false);
      } else {
        setError(result.error);
      }
    });
  };

  const claimPayment = () => {
    setError(null);
    startTransition(async () => {
      const result = await markPaymentSentAction({
        token,
        note: paymentNote.trim(),
      });
      if (result.success) setPaymentClaimed(true);
      else setError(result.error);
    });
  };

  const status =
    outcome?.response === "accepted"
      ? { tone: "success" as const, label: "Accepted" }
      : outcome?.response === "declined"
        ? { tone: "danger" as const, label: "Declined" }
        : { tone: "info" as const, label: "Awaiting your reply" };

  return (
    <main className="bg-muted/30 min-h-dvh px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-195 flex-col gap-4">
        <article className="bg-card overflow-hidden rounded-xl border shadow-sm">
          <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />

          <header className="flex items-start justify-between gap-4 border-b px-5 py-5 sm:px-8 sm:py-6">
            <div className="flex min-w-0 items-center gap-3">
              <BrandLogo
                src={proposal.owner.logoSrc}
                name={ownerName}
                fallbackShape="circle"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold wrap-anywhere sm:truncate">
                  {ownerName}
                </p>
                {issuer.lines.length > 0 && (
                  <p className="text-muted-foreground text-xs wrap-anywhere sm:truncate">
                    {issuer.lines.slice(0, 2).join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={status.tone} variant="soft" className="shrink-0">
              {status.label}
            </StatusBadge>
          </header>

          <div className="flex flex-col gap-7 px-5 py-6 sm:px-8 sm:py-8">
            <div>
              <p
                className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                style={{ color: brand }}
              >
                Proposal for {clientLabel}
              </p>
              <h1 className="font-space mt-2 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-[34px]">
                {proposal.title}
              </h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {proposal.expiresAt
                  ? `Open until ${formatDate(proposal.expiresAt)}`
                  : "No expiry"}
              </p>
            </div>

            {proposal.content?.trim() && (
              <p className="text-sm leading-relaxed text-pretty whitespace-pre-line">
                {proposal.content}
              </p>
            )}

            {stages.map((stage) => {
              const subtotal = stage.items.reduce(
                (sum, item) => sum + Number(item.amount),
                0,
              );
              return (
                <section key={stage.id}>
                  {stage.name && (
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-4">
                      <h2 className="font-space text-base font-semibold">
                        {stage.name}
                      </h2>
                      {stage.timeframe && (
                        <span className="text-muted-foreground text-[13px]">
                          {stage.timeframe}
                        </span>
                      )}
                    </div>
                  )}
                  {stage.description && (
                    <p className="text-muted-foreground mb-2 text-[13.5px] text-pretty whitespace-pre-line">
                      {stage.description}
                    </p>
                  )}
                  {/* Rows, not a table: at phone width four columns crush the description. */}
                  <ul className="flex flex-col">
                    {stage.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-3 text-sm"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block">{item.description}</span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {qty.format(Number(item.quantity))} ×{" "}
                            {money(item.rate)}
                          </span>
                        </span>
                        <span className="font-space shrink-0 font-medium tabular-nums">
                          {money(item.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {stage.name && stage.items.length > 0 && (
                    <p className="text-muted-foreground mt-2 text-right text-[13px]">
                      Stage subtotal{" "}
                      <span className="font-space text-foreground font-medium tabular-nums">
                        {money(subtotal)}
                      </span>
                    </p>
                  )}
                </section>
              );
            })}

            <dl className="ml-auto flex w-full max-w-80 flex-col gap-1.5 text-sm">
              <div className="text-muted-foreground flex justify-between">
                <dt>Subtotal</dt>
                <dd className="font-space text-foreground tabular-nums">
                  {money(proposal.subtotal)}
                </dd>
              </div>
              {taxRate > 0 && (
                <div className="text-muted-foreground flex justify-between">
                  <dt>Tax ({formatPercent(taxRate)}%)</dt>
                  <dd className="font-space text-foreground tabular-nums">
                    {money(proposal.tax)}
                  </dd>
                </div>
              )}
              <div className="mt-1 flex items-baseline justify-between border-t pt-2.5 font-semibold">
                <dt>Total</dt>
                <dd className="font-space text-xl font-medium tabular-nums">
                  {money(proposal.total)}
                </dd>
              </div>
              {depositPercent > 0 && (
                <div
                  className="flex justify-between font-medium"
                  style={{ color: brand }}
                >
                  <dt>Deposit to begin ({formatPercent(depositPercent)}%)</dt>
                  <dd className="font-space tabular-nums">
                    {money(depositAmount)}
                  </dd>
                </div>
              )}
              {proposal.deliveryDays ? (
                <div className="text-muted-foreground flex justify-between">
                  <dt>Delivery time</dt>
                  <dd className="text-foreground">
                    {plural(proposal.deliveryDays, "day")}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </article>

        {error && (
          <p className="text-danger-600 text-sm" role="alert">
            {error}
          </p>
        )}

        {!outcome ? (
          <section className="bg-card rounded-xl border p-5 shadow-sm sm:p-6">
            {declining ? (
              <div className="flex flex-col gap-3">
                <label htmlFor="decline-reason" className="text-sm font-medium">
                  Why are you declining?{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional, shared with {ownerName})
                  </span>
                </label>
                <textarea
                  id="decline-reason"
                  rows={3}
                  value={declineReason}
                  onChange={(event) => setDeclineReason(event.target.value)}
                  maxLength={2000}
                  placeholder="Budget, timing, scope, whatever is useful."
                  className={inputClass}
                />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeclining(false)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => respond("declined")}
                    disabled={isPending}
                    className="bg-danger-600 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    Decline proposal
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold">Ready to go ahead?</h2>
                <p className="text-muted-foreground mt-1 text-sm text-pretty">
                  Accepting starts the project.
                  {depositPercent > 0 &&
                    ` A ${formatPercent(depositPercent)}% deposit invoice (${money(depositAmount)}) follows.`}
                </p>
                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setDeclining(true)}
                    disabled={isPending}
                    className="text-foreground hover:bg-muted rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-60 sm:py-2.5"
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() => respond("accepted")}
                    disabled={isPending}
                    style={{ backgroundColor: brand, color: onBrand }}
                    className="focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 sm:py-2.5"
                  >
                    {isPending && <Loader2 className="size-4 animate-spin" />}
                    Accept proposal
                  </button>
                </div>
              </>
            )}
          </section>
        ) : outcome.response === "declined" ? (
          <p className="bg-danger-600/12 text-danger-600 rounded-xl px-5 py-4 text-sm">
            You declined this proposal. {ownerName} has been told.
          </p>
        ) : (
          <>
            <p className="bg-success-600/12 text-success-600 rounded-xl px-5 py-4 text-sm">
              You accepted this proposal
              {acceptedAt ? ` on ${formatDate(acceptedAt)}` : ""}. {ownerName}{" "}
              has been told and the project is set up.
            </p>

            {outcome.deposit && (
              <section className="bg-card flex flex-col gap-4 rounded-xl border p-5 shadow-sm sm:p-6">
                <div>
                  <p className={labelClass}>Deposit</p>
                  <p className="font-space mt-1 text-[32px] leading-tight font-medium tracking-tight tabular-nums">
                    {money(outcome.deposit.amount)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Invoice{" "}
                    <span className="font-mono">
                      {outcome.deposit.invoiceNumber}
                    </span>
                    {outcome.deposit.dueDate &&
                      ` · due ${formatDate(outcome.deposit.dueDate)}`}
                  </p>
                </div>

                <div className="bg-muted/40 rounded-lg border p-4 text-sm">
                  <p className={cn(labelClass, "mb-2")}>How to pay</p>
                  {hasPaymentDetails(outcome.deposit.payment) ? (
                    <div className="flex flex-col gap-1.5 wrap-anywhere">
                      {outcome.deposit.payment.methods.map((method) => {
                        const { label, lines } = formatPaymentMethod(method);
                        return (
                          <p key={method.type}>
                            <strong className="font-medium">{label}</strong>
                            {lines.length > 0 && ` · ${lines.join(", ")}`}
                          </p>
                        );
                      })}
                      {outcome.deposit.payment.instructions?.trim() && (
                        <p className="text-muted-foreground whitespace-pre-line">
                          {outcome.deposit.payment.instructions}
                        </p>
                      )}
                      <p className="mt-0.5 font-mono text-xs">
                        Reference: {outcome.deposit.invoiceNumber}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      {ownerName} will send payment details shortly.
                    </p>
                  )}
                </div>

                {outcome.deposit.emailedTo && (
                  <p className="text-muted-foreground flex items-start gap-2 text-sm wrap-anywhere">
                    <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <span>
                      A PDF copy is on its way to{" "}
                      <span className="text-foreground font-medium">
                        {outcome.deposit.emailedTo}
                      </span>
                      .
                    </span>
                  </p>
                )}

                {proposal.depositPaid ? (
                  <p className="bg-success-600/12 text-success-600 rounded-lg px-4 py-3 text-sm">
                    Deposit received. Work is underway.
                  </p>
                ) : paymentClaimed ? (
                  <p className="bg-warning-600/12 text-warning-600 rounded-lg px-4 py-3 text-sm">
                    Thanks. {ownerName} will confirm once the payment arrives.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="payment-reference"
                      className="text-sm font-medium"
                    >
                      Payment reference
                    </label>
                    <input
                      id="payment-reference"
                      type="text"
                      value={paymentNote}
                      onChange={(event) => setPaymentNote(event.target.value)}
                      maxLength={200}
                      required
                      placeholder="e.g. transaction ID or UTR number"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={claimPayment}
                      disabled={isPending || paymentNote.trim().length < 3}
                      className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: brand, color: onBrand }}
                    >
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      I&rsquo;ve made the payment
                    </button>
                    <p className="text-muted-foreground text-xs">
                      Only tap this after paying. {ownerName} checks the
                      reference before confirming.
                    </p>
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {proposal.owner.testimonialQuote?.trim() && (
          <blockquote className="text-muted-foreground px-1 text-sm">
            <p className="italic">&ldquo;{proposal.owner.testimonialQuote}&rdquo;</p>
            {proposal.owner.testimonialAuthor?.trim() && (
              <footer className="mt-1 text-xs">
                - {proposal.owner.testimonialAuthor}
              </footer>
            )}
          </blockquote>
        )}

        <p className="text-muted-foreground text-center text-xs">
          No login required
          {proposal.owner.clentricBranding && (
            <>
              {" · "}
              <Link href="/" className="hover:text-foreground underline underline-offset-2">
                Made with Clentric
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
