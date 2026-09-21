import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalCallout,
  LegalLayout,
  LegalSection,
} from "@/components/legal/legal-layout";
import { LEGAL, mailtoHref } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: `Refund & Cancellation Policy · ${LEGAL.productName}`,
  description: `When a ${LEGAL.productName} subscription payment can be refunded, how to cancel, how to ask for a refund, and how long it takes.`,
  alternates: { canonical: LEGAL.routes.refund },
  robots: { index: true, follow: true },
};

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Refund & Cancellation Policy"
      intro={
        <p>
          This page explains how to cancel a {LEGAL.productName} subscription,
          when a payment can be refunded, and how long a refund takes. It
          applies to the subscription you pay us for {LEGAL.productName} itself.
        </p>
      }
    >
      <LegalCallout title="At a glance">
        <ul>
          <li>
            <strong>Cancel any time</strong> from your billing settings, or by
            emailing us. You keep paid features until the end of the period you
            have already paid for.
          </li>
          <li>
            <strong>First payment:</strong> refunded in full if your request
            reaches us within {LEGAL.refund.windowHours} hours of the charge.
            Once per customer.
          </li>
          <li>
            <strong>Not refundable:</strong> renewal payments, requests after
            the {LEGAL.refund.windowHours}-hour window, and downgrades. No
            partial or pro-rated refunds.
          </li>
          <li>
            <strong>Always refunded:</strong> accidental or duplicate charges,
            in full, whatever the timing.
          </li>
          <li>
            We review requests within {LEGAL.refund.reviewWithin}, and approved
            refunds usually reach your bank in {LEGAL.refund.fundsArriveWithin}.
          </li>
        </ul>
      </LegalCallout>

      <LegalSection id="how-to-cancel" title="1. How to cancel">
        <p>You can cancel your subscription in either of these ways:</p>
        <ol>
          <li>
            Open your billing settings inside {LEGAL.productName} and cancel
            there.
          </li>
          <li>
            Email{" "}
            <a href={mailtoHref("Cancel my subscription")}>
              {LEGAL.supportEmail}
            </a>{" "}
            from the address on your account and ask us to cancel it.
          </li>
        </ol>
        <p>
          Please cancel well before your renewal date rather than on the day. A
          cancellation that arrives after the renewal has been charged applies
          to the next period, and the renewal payment itself is not refundable.
        </p>
      </LegalSection>

      <LegalSection
        id="after-you-cancel"
        title="2. What happens after you cancel"
      >
        <ul>
          <li>
            Your paid features keep working until the end of the billing period
            you have already paid for.
          </li>
          <li>
            After that, the account moves to the Free plan. You are not charged
            again.
          </li>
          <li>
            <strong>No data is deleted.</strong> Clients, projects, invoices and
            proposals you already created stay in your account, even if there
            are more of them than the Free plan allows.
          </li>
          <li>
            The Free plan limits only stop you creating new items beyond the
            limit. Upgrade again at any time and the limits lift.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="refundable" title="3. When a payment is refundable">
        <h3>Refundable</h3>
        <ul>
          <li>
            <strong>
              Your first payment, if the request reaches us within{" "}
              {LEGAL.refund.windowHours} hours.
            </strong>{" "}
            We refund it in full. The {LEGAL.refund.windowHours} hours are
            measured from the time Stripe charged your card, not from when we
            reply. This is available once per customer.
          </li>
          <li>
            <strong>Accidental or duplicate charges.</strong> If you were
            charged twice, or charged by mistake, we refund it in full no matter
            when you tell us.
          </li>
        </ul>

        <h3>Not refundable</h3>
        <ul>
          <li>Renewal payments, including the first renewal.</li>
          <li>
            Requests that arrive after the {LEGAL.refund.windowHours}-hour
            window has passed.
          </li>
          <li>
            Downgrades from a paid plan to a cheaper plan, or to the Free plan.
          </li>
          <li>
            Partial or pro-rated amounts for time you did not use. We do not
            issue them.
          </li>
        </ul>

        <h3>What happens to your subscription</h3>
        <p>
          When we refund a first payment, we also cancel the subscription
          straight away and the account moves to the Free plan. Your data stays
          as it is. You are welcome to subscribe again at any time, though the
          first-payment refund is available once per customer.
        </p>
        <p>
          Refunds for accidental or duplicate charges do not cancel anything —
          your subscription carries on as normal.
        </p>
      </LegalSection>

      <LegalSection id="examples" title="4. A couple of worked examples">
        <p>
          <strong>First payment.</strong> If you were charged at 10:00 on
          Monday, your request must reach us before 10:00 on Wednesday. Send it
          at 09:00 on Wednesday and it qualifies; send it at 11:00 and it does
          not.
        </p>
        <p>
          <strong>Renewal.</strong> If you subscribed in March and your
          subscription renewed on 5 May, the May payment is a renewal, so it is
          not refundable — even if you email us the same day. Cancelling then
          stops the next charge and you keep paid features until the period you
          paid for ends.
        </p>
      </LegalSection>

      <LegalSection id="how-to-request" title="5. How to request a refund">
        <p>
          Email <a href={mailtoHref("Refund request")}>{LEGAL.supportEmail}</a>{" "}
          from the email address on your {LEGAL.productName} account, and
          include:
        </p>
        <ul>
          <li>
            the account email address, if it differs from the one you send from;
          </li>
          <li>the approximate date and time of the charge;</li>
          <li>a line about what happened, so we can fix the cause too.</li>
        </ul>
        <p>
          There is no form to fill in and you do not need a reason. Writing from
          the account email is what lets us match the request to the charge
          quickly.
        </p>
      </LegalSection>

      <LegalSection id="timeline" title="6. How long a refund takes">
        <ul>
          <li>
            We review your request and, if it qualifies, start the refund within{" "}
            {LEGAL.refund.reviewWithin}.
          </li>
          <li>
            Refunds go back to the original payment method through Stripe. We
            cannot send them anywhere else.
          </li>
          <li>
            Once started, the money usually appears in{" "}
            {LEGAL.refund.fundsArriveWithin}, depending on your bank or card
            issuer. That last part is out of our hands.
          </li>
          <li>
            We will email you either way, including when a request does not
            qualify, and we will explain why.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="failed-payments" title="7. Failed renewal payments">
        <p>
          If a renewal payment fails, Stripe retries it automatically and your
          account keeps its paid features through a grace period rather than
          being cut off straight away. If the payment still cannot be collected,
          the account moves to the Free plan and your data is kept.
        </p>
      </LegalSection>

      <LegalSection id="no-shipping" title="8. No shipping or delivery">
        <p>
          {LEGAL.productName} is a digital service delivered over the internet.
          There is nothing to ship, so no shipping, delivery or return charges
          apply. Access to paid features starts as soon as the payment goes
          through.
        </p>
      </LegalSection>

      <LegalSection
        id="before-your-bank"
        title="9. Before you contact your bank"
      >
        <p>
          If a charge looks wrong, please email us first at{" "}
          <a href={mailtoHref("Question about a charge")}>
            {LEGAL.supportEmail}
          </a>
          . We can usually sort it out in a day or two, which is faster than a
          bank dispute, and we would genuinely rather fix a mistake than argue
          about one. You keep every right you have to raise the matter with your
          bank or card issuer.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="10. How to contact us">
        <p>
          Email <a href={mailtoHref()}>{LEGAL.supportEmail}</a> and we will
          reply {LEGAL.responseTime}. You can also use our{" "}
          <Link href={LEGAL.routes.contact}>contact page</Link>, or read the
          wider <Link href={LEGAL.routes.terms}>Terms of Service</Link>.
        </p>
        <p>
          {LEGAL.operatorLegalName} · {LEGAL.entityType}
          {LEGAL.registeredAddress ? ` · ${LEGAL.registeredAddress}` : ""}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
