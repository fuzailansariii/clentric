"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format-currency";
import { formatDate, formatRelativeDate } from "@/lib/format-date";
import { formatIssuer } from "@/lib/format-issuer";
import { formatPaymentMethod, hasPaymentDetails } from "@/lib/payment-methods";
import {
  markPaymentSentAction,
  respondProposalAction,
  viewProposalAction,
  type RespondResult,
} from "@/app/(dashboard)/proposals/public-actions";
import type { PublicProposal } from "@/app/(dashboard)/proposals/actions";

const DEFAULT_BRAND = "#3454d1";

type Props = {
  proposal: PublicProposal;
  token: string;
};

export function PublicProposalView({ proposal, token }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [outcome, setOutcome] = useState<RespondResult | null>(
    // A reopened link should show the answer already given rather than
    // offering the buttons again.
    proposal.status === "accepted"
      ? { response: "accepted", deposit: proposal.deposit }
      : proposal.status === "rejected"
        ? { response: "declined", deposit: null }
        : null,
  );
  const [paymentClaimed, setPaymentClaimed] = useState(proposal.paymentClaimed);
  const [paymentNote, setPaymentNote] = useState("");

  const recorded = useRef(false);

  useEffect(() => {
    // Fire-and-forget, once per mount. Recording the view is not worth
    // blocking the page on, and the action itself only ever writes the
    // first view.
    if (recorded.current) return;
    recorded.current = true;
    void viewProposalAction(token);
  }, [token]);

  const brand = /^#[0-9a-fA-F]{6}$/.test(proposal.owner.brandColor ?? "")
    ? (proposal.owner.brandColor as string)
    : DEFAULT_BRAND;

  const currency = proposal.currency;
  const depositPercent = Number(proposal.depositPercent);
  const taxRate = Number(proposal.taxRate);
  const depositAmount =
    Math.round(Number(proposal.total) * (depositPercent / 100) * 100) / 100;

  const ungrouped = proposal.items.filter((item) => !item.milestoneId);
  const sections = [
    ...proposal.milestones.map((milestone) => ({
      id: milestone.id,
      name: milestone.name as string | null,
      description: milestone.description,
      items: proposal.items.filter((item) => item.milestoneId === milestone.id),
    })),
    ...(ungrouped.length > 0
      ? [
          {
            id: "ungrouped",
            name: null,
            description: null,
            items: ungrouped,
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
        setShowDecline(false);
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
        note: paymentNote || undefined,
      });
      if (result.success) {
        setPaymentClaimed(true);
      } else {
        setError(result.error);
      }
    });
  };

  // Business name when set, else the person — the proposal's snapshot once
  // sent, so it matches what the client was sent.
  const issuer = formatIssuer(proposal.owner);
  const ownerName = issuer.title;

  return (
    <main className="bg-muted/30 min-h-dvh px-4 py-8 sm:px-6 sm:py-12">
      <div className="bg-card border-border mx-auto w-full max-w-160 overflow-hidden rounded-2xl border shadow-sm">
        {/* Branding strip. Shrinks on narrow screens but never disappears —
            it is the freelancer's identity on this page. */}
        <div className="h-1.5 w-full" style={{ backgroundColor: brand }} />

        <header className="border-border flex items-start justify-between gap-4 border-b px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex min-w-0 items-center gap-3">
            {/* AvatarInitials renders initials only, so the uploaded avatar
                is not used here. Worth revisiting if profile photos should
                appear on client-facing pages. */}
            <AvatarInitials name={ownerName} shape="circle" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{ownerName}</p>
              {proposal.viewedAt && (
                <p className="text-muted-foreground text-xs">
                  Viewed {formatRelativeDate(proposal.viewedAt)}
                </p>
              )}
            </div>
          </div>

          <StatusBadge
            status={
              outcome?.response === "accepted"
                ? "success"
                : outcome?.response === "declined"
                  ? "danger"
                  : "info"
            }
            variant="soft"
            className="shrink-0"
          >
            {outcome?.response === "accepted"
              ? "Accepted"
              : outcome?.response === "declined"
                ? "Declined"
                : "Awaiting your reply"}
          </StatusBadge>
        </header>

        <div className="flex flex-col gap-7 px-5 py-6 sm:px-8 sm:py-8">
          <div>
            <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
              Proposal
            </p>
            <h1 className="font-space mt-2 text-2xl leading-tight font-semibold tracking-tight text-balance">
              {proposal.title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Prepared for{" "}
              <span className="text-foreground font-medium">
                {proposal.clientCompany ?? proposal.clientName}
              </span>
            </p>
          </div>

          {proposal.content?.trim() && (
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
              {proposal.content}
            </p>
          )}

          {/* Rows, not a table: at phone width a four-column table either
              scrolls sideways or crushes the description. */}
          {sections.map((section) => {
            const stageTotal = section.items.reduce(
              (sum, item) => sum + Number(item.amount),
              0,
            );

            return (
              <section key={section.id}>
                {section.name && (
                  <h2 className="font-space text-base font-semibold">
                    {section.name}
                  </h2>
                )}
                {section.description && (
                  <p className="text-muted-foreground mt-1 text-sm">
                    {section.description}
                  </p>
                )}

                <ul className="mt-3 flex flex-col">
                  {section.items.map((item) => (
                    <li
                      key={item.id}
                      className="border-border flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b py-3 text-sm last:border-b-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block">{item.description}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {formatNumber(Number(item.quantity))} ×{" "}
                          {formatCurrency(item.rate, currency)}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatCurrency(item.amount, currency)}
                      </span>
                    </li>
                  ))}
                </ul>

                {section.items.length > 0 && (
                  <p className="text-muted-foreground mt-2 text-right text-xs tabular-nums">
                    Stage subtotal{" "}
                    {formatCurrency(String(stageTotal), currency)}
                  </p>
                )}
              </section>
            );
          })}

          <dl className="border-border flex flex-col gap-2 border-t pt-5 text-sm">
            <div className="text-muted-foreground flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">
                {formatCurrency(proposal.subtotal, currency)}
              </dd>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <dt>Tax{taxRate > 0 ? ` (${formatPercent(taxRate)}%)` : ""}</dt>
              <dd className="tabular-nums">
                {formatCurrency(proposal.tax, currency)}
              </dd>
            </div>
            <div className="border-border mt-1 flex items-baseline justify-between border-t pt-3">
              <dt className="font-space text-base font-semibold">Total</dt>
              <dd className="font-space text-xl font-semibold tabular-nums">
                {formatCurrency(proposal.total, currency)}
              </dd>
            </div>
            {depositPercent > 0 && (
              <div className="flex justify-between pt-1 text-[13px]">
                <dt className="text-muted-foreground">
                  Deposit to begin ({formatPercent(depositPercent)}%)
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(String(depositAmount), currency)}
                </dd>
              </div>
            )}
          </dl>

          {error && (
            <p className="text-danger-600 text-sm" role="alert">
              {error}
            </p>
          )}

          {/* Action row → confirmation panel */}
          {!outcome ? (
            <div className="flex flex-col gap-3">
              {/* Stacked full-width on phones so both are easy to tap. */}
              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => respond("accepted")}
                  disabled={isPending}
                  style={{ backgroundColor: brand }}
                  className="focus-visible:ring-ring inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 sm:flex-1"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {depositPercent > 0
                    ? `Pay ${formatPercent(depositPercent)}% deposit to begin`
                    : "Accept proposal"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowDecline((value) => !value)}
                  disabled={isPending}
                  aria-expanded={showDecline}
                  className="border-border text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring inline-flex w-full items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 sm:w-auto"
                >
                  Decline
                </button>
              </div>

              {/* Declining reveals the reason inline — it never navigates
                  away from the proposal. */}
              {showDecline && (
                <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
                  <label
                    htmlFor="decline-reason"
                    className="text-sm font-medium"
                  >
                    Anything you would like to add? (optional)
                  </label>
                  <textarea
                    id="decline-reason"
                    rows={3}
                    value={declineReason}
                    onChange={(event) => setDeclineReason(event.target.value)}
                    maxLength={2000}
                    placeholder="Budget, timing, scope — whatever is useful."
                    className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/20 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => respond("declined")}
                    disabled={isPending}
                    className="bg-foreground text-background inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send decline
                  </button>
                </div>
              )}
            </div>
          ) : outcome.response === "declined" ? (
            <div className="border-border rounded-lg border p-5 text-center">
              <p className="text-sm font-medium">Thanks for letting us know.</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Your response is recorded. {ownerName} will see it in their
                Clentric dashboard.
              </p>
            </div>
          ) : (
            <div className="border-border flex flex-col gap-4 rounded-lg border p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" style={{ color: brand }} />
                <p className="text-sm font-semibold">Proposal accepted</p>
              </div>

              {outcome.deposit ? (
                <>
                  <p className="text-sm">
                    To get started, please send{" "}
                    <strong className="tabular-nums">
                      {formatCurrency(outcome.deposit.amount, currency)}
                    </strong>{" "}
                    ({formatPercent(outcome.deposit.percent)}% deposit) using
                    the details below.
                  </p>

                  {hasPaymentDetails(outcome.deposit.payment) ? (
                    <div className="bg-muted/50 border-border rounded-lg border px-4 py-3">
                      <p className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.18em] uppercase">
                        Payment details
                      </p>
                      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed wrap-anywhere">
                        {outcome.deposit.payment.methods.map((method) => {
                          const { label, lines } = formatPaymentMethod(method);
                          return (
                            <div key={method.type}>
                              <p className="font-medium">{label}</p>
                              {lines.map((line, index) => (
                                <p
                                  key={index}
                                  className="text-muted-foreground"
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                          );
                        })}
                        {outcome.deposit.payment.instructions?.trim() && (
                          <p className="whitespace-pre-line">
                            {outcome.deposit.payment.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {ownerName} will send payment details shortly.
                    </p>
                  )}

                  {paymentClaimed ? (
                    <p className="text-muted-foreground text-sm">
                      Thanks — this is recorded on the invoice. {ownerName}
                      will confirm once the payment arrives.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={paymentNote}
                        onChange={(event) => setPaymentNote(event.target.value)}
                        maxLength={1000}
                        placeholder="Reference or note (optional)"
                        className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/20 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                      />
                      <button
                        type="button"
                        onClick={claimPayment}
                        disabled={isPending}
                        className="border-border hover:bg-muted inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
                      >
                        {isPending && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        I&rsquo;ve sent payment
                      </button>
                      <p className="text-muted-foreground text-xs">
                        This just lets {ownerName} know to look out for it. They
                        confirm once it arrives.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Your response is recorded. {ownerName} will see it in their
                  Clentric dashboard and be in touch.
                </p>
              )}
            </div>
          )}

          <section className="border-border border-t pt-6">
            <h2 className="text-muted-foreground font-mono text-[10px] font-medium tracking-[0.2em] uppercase">
              From
            </h2>
            <p className="mt-2 text-sm font-medium wrap-anywhere">
              {issuer.title}
            </p>
            {issuer.lines.length > 0 && (
              <div className="text-muted-foreground mt-1 text-sm leading-relaxed wrap-anywhere">
                {issuer.lines.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </section>

          {proposal.owner.testimonialQuote?.trim() && (
            <blockquote className="border-border border-t pt-6">
              <p className="text-sm leading-relaxed italic">
                &ldquo;{proposal.owner.testimonialQuote}&rdquo;
              </p>
              {proposal.owner.testimonialAuthor?.trim() && (
                <footer className="text-muted-foreground mt-2 text-xs">
                  — {proposal.owner.testimonialAuthor}
                </footer>
              )}
            </blockquote>
          )}
        </div>

        <footer className="border-border text-muted-foreground border-t px-5 py-4 text-center text-xs sm:px-8">
          No login required
          {proposal.expiresAt
            ? ` · Link expires ${formatDate(proposal.expiresAt)}`
            : ""}
        </footer>
      </div>
    </main>
  );
}
