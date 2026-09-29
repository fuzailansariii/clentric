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
  description: `How to cancel a ${LEGAL.productName} subscription, when you can get a refund, how to ask for one, and how long it takes.`,
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
          when you can get a refund, and how long a refund takes. It applies to
          the subscription you pay for {LEGAL.productName} itself.
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
            <strong>{LEGAL.refund.windowHours}-hour refund:</strong> ask within{" "}
            {LEGAL.refund.windowHours} hours of any payment and you get it back
            in full. No questions asked.
          </li>
          <li>
            <strong>Accidental or duplicate charges</strong> are always refunded
            in full, whatever the timing.
          </li>
          <li>
            We handle requests within {LEGAL.refund.reviewWithin}. Refunds
            usually reach your bank in {LEGAL.refund.fundsArriveWithin}.
          </li>
        </ul>
      </LegalCallout>

      <LegalSection id="how-to-cancel" title="1. How to cancel">
        <p>You can cancel in either of these ways:</p>
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
            from the address on your account and ask us to cancel.
          </li>
        </ol>
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
            After that, your account moves to the Free plan and you are not
            charged again.
          </li>
          <li>
            <strong>No data is deleted.</strong> Clients, projects, invoices and
            proposals you already created stay in your account, even if there
            are more than the Free plan allows. The Free plan limits only stop
            you creating new items beyond the limit.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="refunds" title="3. Refunds">
        <ul>
          <li>
            Any payment, monthly or yearly, is refunded in full if you ask
            within {LEGAL.refund.windowHours} hours of the charge.
          </li>
          <li>
            When we refund a payment, the subscription is cancelled and your
            account moves to the Free plan. Your data stays as it is.
          </li>
          <li>
            Accidental or duplicate charges are refunded in full no matter when
            you tell us, and your subscription carries on as normal.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="how-to-request" title="4. How to request a refund">
        <p>
          Email <a href={mailtoHref("Refund request")}>{LEGAL.supportEmail}</a>{" "}
          from the email address on your {LEGAL.productName} account, with the
          date of the charge. You don&apos;t need to give a reason.
        </p>
      </LegalSection>

      <LegalSection id="timeline" title="5. How long a refund takes">
        <ul>
          <li>We start the refund within {LEGAL.refund.reviewWithin}.</li>
          <li>
            Refunds go back to the original payment method through our payment
            provider, which acts as the merchant of record.
          </li>
          <li>
            The money usually appears in {LEGAL.refund.fundsArriveWithin},
            depending on your bank or card issuer.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="failed-payments" title="6. Failed renewal payments">
        <p>
          If a renewal payment fails, our payment provider retries it
          automatically and your account keeps its paid features during a grace
          period. If the payment still can&apos;t be collected, your account
          moves to the Free plan and your data is kept.
        </p>
      </LegalSection>

      <LegalSection id="no-shipping" title="7. No shipping or delivery">
        <p>
          {LEGAL.productName} is a digital service delivered over the internet.
          There is nothing to ship. Access to paid features starts as soon as
          the payment goes through.
        </p>
      </LegalSection>

      <LegalSection
        id="before-your-bank"
        title="8. Before you contact your bank"
      >
        <p>
          If a charge looks wrong, please email us first at{" "}
          <a href={mailtoHref("Question about a charge")}>
            {LEGAL.supportEmail}
          </a>
          . We can usually sort it out in a day or two, which is faster than a
          bank dispute. You keep every right to raise it with your bank or card
          issuer.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="9. Contact us">
        <p>
          Email <a href={mailtoHref()}>{LEGAL.supportEmail}</a> and we will
          reply {LEGAL.responseTime}, or use our{" "}
          <Link href={LEGAL.routes.contact}>contact page</Link>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
