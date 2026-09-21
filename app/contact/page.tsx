import type { Metadata } from "next";
import Link from "next/link";

import { LegalLayout, LegalSection } from "@/components/legal/legal-layout";
import { LEGAL, mailtoHref } from "@/lib/legal-config";
import { ContactForm } from "@/app/contact/contact-form";

export const metadata: Metadata = {
  title: `Contact · ${LEGAL.productName}`,
  description: `How to reach ${LEGAL.productName} support about billing, refunds, privacy requests or anything else.`,
  alternates: { canonical: LEGAL.routes.contact },
  robots: { index: true, follow: true },
};

export default function ContactPage() {
  return (
    <LegalLayout
      title="Contact us"
      intro={
        <p>
          We are a small operation, and the same people who build{" "}
          {LEGAL.productName} answer the email. Write to us about anything —
          billing, a refund, your data, a bug, or an idea.
        </p>
      }
    >
      <LegalSection id="about" title="About Clentric">
        <p>
          <strong>{LEGAL.productName}</strong> ({LEGAL.domain}) is{" "}
          {LEGAL.tagline.charAt(0).toLowerCase()}
          {LEGAL.tagline.slice(1)}
        </p>
        <p>
          It is operated by {LEGAL.operatorLegalName}, a {LEGAL.entityType}{" "}
          based in {LEGAL.operatorCountry}. Paid plans are subscriptions billed
          monthly in {LEGAL.currency}.
        </p>
      </LegalSection>

      <LegalSection id="support" title="Customer support">
        <p>
          Email{" "}
          <a href={mailtoHref()}>
            <strong>{LEGAL.supportEmail}</strong>
          </a>
          . We read this inbox every day and reply {LEGAL.responseTime}.
        </p>
        {LEGAL.registeredAddress && (
          <p>
            Postal address: {LEGAL.operatorLegalName}, {LEGAL.registeredAddress}
          </p>
        )}
      </LegalSection>

      <LegalSection id="where-to-send" title="Where to send your request">
        <h3>Billing, cancellations and refunds</h3>
        <p>
          Write from the email address on your account, and include the account
          email and the approximate date of the charge. A first payment can be
          refunded in full if your request reaches us within{" "}
          {LEGAL.refund.windowHours} hours of the charge — the full rules are on
          our{" "}
          <Link href={LEGAL.routes.refund}>Refund & Cancellation Policy</Link>{" "}
          page.
        </p>

        <h3>Privacy and data requests</h3>
        <p>
          To get a copy of your data, correct it, export it or delete it, email
          us from the address on your account. If you are a client who received
          a proposal or portal link, contact the freelancer who sent it first —
          they control that record. Our{" "}
          <Link href={LEGAL.routes.privacy}>Privacy Policy</Link> explains why.
        </p>

        <h3>Everything else</h3>
        <p>
          Bugs, feature requests, partnership questions, or anything that does
          not fit a box above — same address, or use the form below.
        </p>
      </LegalSection>

      <LegalSection id="form" title="Send us a message">
        <p>
          Fill this in and it reaches the same inbox. If you would rather use
          your own mail client, write to{" "}
          <a href={mailtoHref()}>{LEGAL.supportEmail}</a>.
        </p>
        <ContactForm />
      </LegalSection>

      <LegalSection id="policies" title="Our policies">
        <ul>
          <li>
            <Link href={LEGAL.routes.privacy}>Privacy Policy</Link> — what we
            collect and what you can ask us to do with it.
          </li>
          <li>
            <Link href={LEGAL.routes.terms}>Terms of Service</Link> — the
            agreement that applies when you use {LEGAL.productName}.
          </li>
          <li>
            <Link href={LEGAL.routes.refund}>Refund & Cancellation Policy</Link>{" "}
            — how to cancel, and when a payment is refundable.
          </li>
        </ul>
        <p>
          {LEGAL.operatorLegalName} · {LEGAL.entityType}
          {LEGAL.registeredAddress ? ` · ${LEGAL.registeredAddress}` : ""}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
