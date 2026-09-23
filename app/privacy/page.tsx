import type { Metadata } from "next";
import Link from "next/link";

import {
  LegalCallout,
  LegalLayout,
  LegalSection,
} from "@/components/legal/legal-layout";
import { LEGAL, activeProcessors, mailtoHref } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: `Privacy Policy · ${LEGAL.productName}`,
  description: `How ${LEGAL.productName} collects, uses and protects personal data for freelancers and the clients they work with.`,
  alternates: { canonical: LEGAL.routes.privacy },
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  const processors = activeProcessors();

  return (
    <LegalLayout
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal data {LEGAL.productName} collects,
          why we collect it, who we share it with, and what you can ask us to do
          with it. It covers both freelancers who hold a {LEGAL.productName}{" "}
          account and the clients they invite to view a proposal or a portal
          link.
        </p>
      }
    >
      <LegalCallout title="The short version">
        <ul>
          <li>
            We collect what we need to run your account: your details, the work
            you create in {LEGAL.productName}, and basic technical logs.
          </li>
          <li>We never sell your data, and we don’t run ad cookies.</li>
          <li>
            Card numbers never reach us. Stripe handles subscription payments
            for {LEGAL.productName} plans.
          </li>
          <li>
            The data you enter about <strong>your</strong> clients is yours. You
            decide what to collect; we store and process it for you.
          </li>
          <li>
            You can ask for a copy of your data, or ask us to delete it, by
            emailing{" "}
            <a href={mailtoHref("Privacy request")}>{LEGAL.supportEmail}</a>.
          </li>
        </ul>
      </LegalCallout>

      <LegalSection id="who-we-are" title="1. Who we are">
        <p>{LEGAL.tagline}</p>
        <p>
          The service is operated by {LEGAL.operatorLegalName}, a{" "}
          {LEGAL.entityType} based in {LEGAL.operatorCountry}. You can reach us
          at <a href={mailtoHref()}>{LEGAL.supportEmail}</a>, and we aim to
          reply {LEGAL.responseTime}.
        </p>
        {LEGAL.registeredAddress && (
          <p>Registered address: {LEGAL.registeredAddress}</p>
        )}
      </LegalSection>

      <LegalSection id="two-roles" title="2. Two kinds of people, two roles">
        <p>
          {LEGAL.productName} holds data about two groups of people, and our
          responsibilities differ between them.
        </p>

        <h3>Freelancers who hold an account</h3>
        <p>
          For your own account, profile and billing data, we decide how and why
          the data is used. In data-protection language, we are the{" "}
          <strong>controller</strong> of that data.
        </p>

        <h3>The clients a freelancer adds</h3>
        <p>
          For the data you enter about your own clients and projects, you decide
          what to collect and why. We store and process it on your instructions,
          which makes us a <strong>processor</strong> and you the controller.
          You are responsible for having a lawful reason to hold that data and
          for telling your clients how you use it.
        </p>
        <p>
          If you are a client who received a proposal or portal link and you
          want your details changed or removed, please contact the freelancer
          who sent it — they control that record. If you cannot reach them,
          email{" "}
          <a href={mailtoHref("Client data request")}>{LEGAL.supportEmail}</a>{" "}
          and we will help where we can.
        </p>
      </LegalSection>

      <LegalSection
        id="freelancer-data"
        title="3. Data we collect from freelancers"
      >
        <ul>
          <li>
            <strong>Account data:</strong> email address, name, profile photo,
            profession and timezone, from email signup or Google sign-in.
          </li>
          <li>
            <strong>Business profile data:</strong> your business name, and any
            payment details you choose to add — such as bank, PayPal or Wise
            details — so they can be shown on your invoices.
          </li>
          <li>
            <strong>Content you create:</strong> clients, projects, milestones,
            invoices, proposals, notes and uploaded files.
          </li>
          <li>
            <strong>Subscription data:</strong> your plan, your subscription
            status, and your Stripe customer and subscription identifiers. We
            never receive or store card numbers.
          </li>
          <li>
            <strong>Usage and technical data:</strong> IP address, browser type,
            timestamps, activity logs and error logs.
          </li>
        </ul>
      </LegalSection>

      <LegalSection
        id="client-data"
        title="4. Data we hold about a freelancer’s clients"
      >
        <p>
          Most of this is entered by the freelancer rather than collected from
          the client directly.
        </p>
        <ul>
          <li>
            Details the freelancer entered, such as name, email address and
            company.
          </li>
          <li>
            When a proposal or portal page was viewed, and whether it was
            accepted or declined.
          </li>
          <li>
            Where those features are used: an optional reason given when
            declining, an optional name typed when accepting, and an optional
            note saying a payment has been sent.
          </li>
          <li>
            IP address and basic technical data, used for security and to limit
            abusive traffic.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="how-we-use-data" title="5. How we use data, and why">
        <ul>
          <li>
            <strong>To provide the service</strong> — creating your account,
            storing your work, generating invoices and proposals, and sending
            the links you ask us to send. We need this to perform our contract
            with you.
          </li>
          <li>
            <strong>To handle billing</strong> — starting, renewing and
            cancelling subscriptions through Stripe, and keeping the records we
            are required to keep. This is both contractual and a legal
            obligation.
          </li>
          <li>
            <strong>To send service email</strong> — invoice and proposal
            notifications, a welcome email, and messages about your account.
          </li>
          <li>
            <strong>To keep the service safe and working</strong> — security,
            rate limiting, fraud prevention, debugging and error logs. These are
            our legitimate interests in running a reliable service.
          </li>
          <li>
            <strong>To answer you</strong> — when you email support, we use your
            message and account details to reply.
          </li>
        </ul>
        <p>
          We do not use your data, or your clients’ data, to build advertising
          profiles, and we do not sell it.
        </p>
      </LegalSection>

      <LegalSection id="sharing" title="6. Who we share data with">
        <p>
          We share data with a small number of service providers that help us
          run {LEGAL.productName}. They may only use it to provide their service
          to us.
        </p>
        <ul>
          {processors.map((processor) => (
            <li key={processor.name}>
              <strong>{processor.name}</strong> — {processor.purpose}.
            </li>
          ))}
        </ul>
        {LEGAL.analyticsTool && (
          <p>
            We also use {LEGAL.analyticsTool} to understand how the site is
            used.
          </p>
        )}
        <p>
          We may also disclose data where the law requires it, or to protect our
          rights or the safety of others. If {LEGAL.productName} is ever sold or
          transferred, account data would move with it, and we would tell you
          first.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="7. Cookies">
        <p>
          We use essential cookies only: the ones that keep you signed in and
          help protect the service. We do not use advertising cookies and we do
          not sell data to advertisers.
          {LEGAL.analyticsTool
            ? ` We also set cookies for ${LEGAL.analyticsTool}, which we use to measure how the site is used.`
            : ""}
        </p>
      </LegalSection>

      <LegalSection id="retention" title="8. How long we keep data">
        <ul>
          <li>We keep your data for as long as your account is active.</li>
          <li>
            When you delete an item inside {LEGAL.productName}, it is marked as
            deleted and hidden from your account straight away. A copy stays in
            our database until your account is closed, and is then removed with
            the rest of your data.
          </li>
          <li>
            After you close your account, we delete or anonymise your data,
            except records we must keep for legal, tax or fraud-prevention
            reasons. Those are kept for {LEGAL.legalRecordsRetentionPeriod} and
            then removed.
          </li>
          <li>
            You can export your data for {LEGAL.dataExportWindow} after closing
            your account. Email us and we will prepare it for you.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="your-rights" title="9. Your rights over your data">
        <p>
          You can ask us to give you a copy of your data, correct it, export it,
          or delete it. Email{" "}
          <a href={mailtoHref("Privacy request")}>{LEGAL.supportEmail}</a> from
          the address on your account and we will reply {LEGAL.responseTime}.
          Account deletion and data export are handled by hand at the moment, so
          please allow a little time.
        </p>

        <h3>If you are in the EU or the UK</h3>
        <p>
          Under the GDPR and UK GDPR you have the right to access your data, to
          have it corrected or erased, to restrict or object to how we use it,
          and to receive it in a portable format. Where we rely on consent, you
          can withdraw it at any time. You also have the right to complain to
          your local data protection authority.
        </p>

        <h3>If you are in California</h3>
        <p>
          You can ask what personal information we have collected about you, ask
          us to delete it, and ask us to correct it. We do not sell personal
          information, and we do not share it for cross-context behavioural
          advertising. We will not treat you differently for making a request.
        </p>
        <p>
          If your request concerns data a freelancer entered about you, please
          contact that freelancer first — they decide what is held about you.
        </p>
      </LegalSection>

      <LegalSection id="security" title="10. How we protect data">
        <p>
          We use sensible, standard protections: traffic is encrypted in transit
          over HTTPS, access to data is restricted, database row-level security
          keeps accounts separated, and proposal content is stored and displayed
          as plain text rather than as markup that could carry anything
          executable.
        </p>
        <p>
          We would rather be honest than reassuring: no online service can be
          perfectly secure, and we do not claim any formal security
          certification. If you think someone else has reached your account,
          email us straight away at{" "}
          <a href={mailtoHref("Security concern")}>{LEGAL.supportEmail}</a>.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="11. Where your data is processed">
        <p>
          {LEGAL.productName} is operated from {LEGAL.operatorCountry}, and the
          providers listed above process data in the countries where they
          operate. That means your data may be stored or handled outside the
          country you live in. We only use providers that offer appropriate
          protections for international transfers.
        </p>
      </LegalSection>

      <LegalSection id="children" title="12. Children">
        <p>
          {LEGAL.productName} is a business tool and is not intended for anyone
          under 18. We do not knowingly collect data from children. If you
          believe a child has given us data, email us and we will remove it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes to this policy">
        <p>
          We may update this policy as the product changes. The version on this
          page is always the current one, and where a change materially affects
          you we will give advance notice by email or in the app.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="14. How to contact us">
        <p>
          Email <a href={mailtoHref("Privacy request")}>{LEGAL.supportEmail}</a>{" "}
          and we will reply {LEGAL.responseTime}. You can also use the form on
          our <Link href={LEGAL.routes.contact}>contact page</Link>.
        </p>
        <p>
          {LEGAL.operatorLegalName} · {LEGAL.entityType}
          {LEGAL.registeredAddress ? ` · ${LEGAL.registeredAddress}` : ""}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
