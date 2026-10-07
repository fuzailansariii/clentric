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

const STORAGE = [
  {
    name: "sb-…-auth-token",
    kind: "Cookie",
    purpose: "Keeps you signed in (set by Supabase, our authentication provider)",
    lasts: "Until you sign out, up to 400 days",
  },
  {
    name: "sidebar_collapsed",
    kind: "Cookie",
    purpose: "Remembers whether the app sidebar is open or collapsed",
    lasts: "1 year",
  },
  {
    name: "clentric_setup_hidden",
    kind: "Cookie",
    purpose: "Remembers that you hid the dashboard set-up steps",
    lasts: "1 year",
  },
  {
    name: "theme",
    kind: "Local storage",
    purpose: "Remembers light, dark or system theme",
    lasts: "Until you clear it",
  },
  {
    name: "auth_login_* / auth_register_*",
    kind: "Session storage",
    purpose:
      "Keeps the sign-in step and email while you enter the one-time code",
    lasts: "Until the tab is closed or you finish signing in",
  },
] as const;

export default function PrivacyPolicyPage() {
  const processors = activeProcessors();
  const officer = LEGAL.grievanceOfficer;

  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated={LEGAL.lastUpdated}
      intro={
        <p>
          This policy explains what personal data {LEGAL.productName} collects,
          why we collect it, who we share it with, and what you can ask us to do
          with it. It covers both freelancers who hold a {LEGAL.productName}{" "}
          account and the clients they send a proposal link to.
        </p>
      }
    >
      <LegalCallout title="The short version">
        <ul>
          <li>
            We collect what we need to run your account: your details, the work
            you create in {LEGAL.productName}, and basic technical logs.
          </li>
          <li>
            We never sell your data, and we use no advertising or analytics
            cookies.
          </li>
          <li>
            Card numbers never reach us. Our payment provider handles
            subscription payments for {LEGAL.productName} plans.
          </li>
          <li>
            The data you enter about <strong>your</strong> clients is yours. You
            decide what to collect; we store and process it for you.
          </li>
          <li>
            You can export your data or delete your account yourself in
            Settings, and email{" "}
            <a href={mailtoHref("Privacy request")}>{LEGAL.supportEmail}</a>{" "}
            for anything else.
          </li>
        </ul>
      </LegalCallout>

      <LegalSection id="who-we-are" title="1. Who we are">
        <p>{LEGAL.tagline}</p>
        <p>
          The service is operated by {LEGAL.operatorLegalName}, a{" "}
          {LEGAL.entityType} based in {LEGAL.operatorCountry}. Under India’s
          Digital Personal Data Protection Act, 2023 we are the{" "}
          <strong>Data Fiduciary</strong> for your account data. You can reach
          us at <a href={mailtoHref()}>{LEGAL.supportEmail}</a>, and we aim to
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
          the data is used. We are the <strong>controller</strong> (Data
          Fiduciary) of that data.
        </p>

        <h3>The clients a freelancer adds</h3>
        <p>
          For the data you enter about your own clients and projects, you decide
          what to collect and why. We store and process it on your instructions,
          which makes us a <strong>processor</strong> and you the controller.
          You are responsible for having a lawful reason to hold that data, for
          telling your clients how you use it, for keeping it accurate, and for
          answering their requests about it.
        </p>
        <p>
          We do not check, and are not responsible for, what a freelancer
          enters about their clients or how they use it outside{" "}
          {LEGAL.productName}. Our{" "}
          <Link href={LEGAL.routes.terms}>Terms of Service</Link> explain what
          happens if that data causes a claim against us.
        </p>
        <p>
          If you are a client who received a proposal link and you want your
          details changed or removed, please contact the freelancer who sent it
          - they control that record. If you cannot reach them, email{" "}
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
            <strong>Account data:</strong> email address, name and profession,
            and your profile photo if you sign in with Google.
          </li>
          <li>
            <strong>Business profile:</strong> business name, business email,
            website, country, logo, brand colour and an optional testimonial,
            shown on your proposals and invoices.
          </li>
          <li>
            <strong>Payment details you choose to add:</strong> bank account
            holder, bank name, account number and routing code, PayPal email,
            Wise account, UPI ID and free-text payment instructions, so your
            clients know how to pay you.
          </li>
          <li>
            <strong>Content you create:</strong> clients, projects, milestones,
            invoices, proposals and notes.
          </li>
          <li>
            <strong>Subscription data:</strong> your plan, subscription status,
            and the customer and subscription identifiers from our payment
            provider. We never receive or store card numbers.
          </li>
          <li>
            <strong>Agreement record:</strong> the date you first used{" "}
            {LEGAL.productName} after agreeing to our Terms and this policy, and
            which version applied.
          </li>
          <li>
            <strong>Usage and technical data:</strong> a log of actions in your
            account (such as invoice sent or proposal accepted), a record of
            emails sent on your behalf (recipient, time, status), and error
            reports. Error reports leave out cookies, request contents and your
            identity.
          </li>
        </ul>

        <h3>People who join the waitlist or contact us</h3>
        <ul>
          <li>
            <strong>Waitlist:</strong> your email, how you found us if you say,
            and whether you want the Agency plan. We use it only to tell you
            about the launch, and you can{" "}
            <Link href="/unsubscribe">unsubscribe</Link> at any time.
          </li>
          <li>
            <strong>Contact form:</strong> your name, email and message, sent to
            our support inbox so we can reply.
          </li>
        </ul>
      </LegalSection>

      <LegalSection
        id="client-data"
        title="4. Data we hold about a freelancer’s clients"
      >
        <p>
          This is entered by the freelancer, except where a client uses a
          proposal link.
        </p>
        <ul>
          <li>
            Details the freelancer entered: name, email address, phone, company,
            country, hourly rate and private notes.
          </li>
          <li>
            When a proposal link was viewed, and whether it was accepted or
            declined.
          </li>
          <li>
            Anything the client types on the proposal page: an optional reason
            when declining, and the payment reference when they say they have
            paid a deposit.
          </li>
          <li>
            The client’s IP address, used briefly to limit abusive traffic and
            not stored in our database.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="how-we-use-data" title="5. How we use data, and why">
        <ul>
          <li>
            <strong>To provide the service</strong> - creating your account,
            storing your work, generating invoices and proposals, and sending
            the emails you ask us to send. We need this to perform our contract
            with you.
          </li>
          <li>
            <strong>To handle billing</strong> - starting, renewing and
            cancelling subscriptions through our payment provider, and keeping
            the records we are required to keep. This is both contractual and a
            legal obligation.
          </li>
          <li>
            <strong>To send service email</strong> - sign-in codes, invoice and
            proposal emails to your clients, and messages about your account.
          </li>
          <li>
            <strong>To keep the service safe and working</strong> - security,
            rate limiting, fraud prevention and fixing errors.
          </li>
          <li>
            <strong>To answer you</strong> - when you email support or use the
            contact form, we use your message and details to reply.
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
              <strong>{processor.name}</strong> - {processor.purpose}.
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

      <LegalSection id="cookies" title="7. Cookies and browser storage">
        <p>
          We use only what the service needs to work. There are no advertising
          or analytics cookies, so there is nothing to opt out of.
          {LEGAL.analyticsTool
            ? ` We also set cookies for ${LEGAL.analyticsTool}, which we use to measure how the site is used.`
            : ""}
        </p>
        {/* Phones: one card per item; the four-column table needs width. */}
        <ul className="list-none! space-y-3! pl-0! sm:hidden">
          {STORAGE.map((row) => (
            <li key={row.name} className="border-border rounded-lg border p-3">
              <p className="text-foreground! font-mono text-xs">{row.name}</p>
              <p className="mt-1 text-xs">
                {row.kind} · {row.lasts}
              </p>
              <p className="mt-1 text-sm">{row.purpose}</p>
            </li>
          ))}
        </ul>
        <div className="hidden sm:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 pr-4 font-semibold">Type</th>
                <th className="py-2 pr-4 font-semibold">Why</th>
                <th className="py-2 font-semibold">How long</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {STORAGE.map((row) => (
                <tr key={row.name} className="border-border border-b align-top">
                  <td className="text-foreground py-2 pr-4 font-mono text-xs">
                    {row.name}
                  </td>
                  <td className="py-2 pr-4">{row.kind}</td>
                  <td className="py-2 pr-4">{row.purpose}</td>
                  <td className="py-2">{row.lasts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          You can clear these at any time in your browser settings; you will
          simply be signed out.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="8. How long we keep data">
        <ul>
          <li>We keep your data for as long as your account is active.</li>
          <li>
            When you delete an item inside {LEGAL.productName}, it is hidden
            from your account straight away. A copy stays in our database until
            your account is deleted, and is then removed with the rest of your
            data.
          </li>
          <li>
            When you delete your account in Settings, it is locked at once and
            permanently deleted {LEGAL.accountPurgeAfter} later. Until then you
            can sign in and restore it.
          </li>
          <li>
            Records we must keep for legal, tax or fraud-prevention reasons are
            kept for {LEGAL.legalRecordsRetentionPeriod} and then removed.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="your-rights" title="9. Your rights over your data">
        <p>
          You can do the main things yourself: download all your data as JSON
          or CSV, and delete your account, in <strong>Settings → Account</strong>
          . For anything else - a summary of what we hold, a correction, or a
          question - email{" "}
          <a href={mailtoHref("Privacy request")}>{LEGAL.supportEmail}</a> from
          the address on your account and we will reply {LEGAL.responseTime}.
        </p>

        <h3>If you are in India</h3>
        <p>
          Under the Digital Personal Data Protection Act, 2023 you have the
          right to:
        </p>
        <ul>
          <li>
            get a summary of the personal data we process about you, what we do
            with it, and who we have shared it with;
          </li>
          <li>have your data corrected, completed, updated or erased;</li>
          <li>
            withdraw consent where we rely on it, as easily as you gave it;
          </li>
          <li>
            nominate another person to exercise these rights for you if you die
            or become unable to;
          </li>
          <li>
            have a grievance resolved by our Grievance Officer (section 10), and
            if you are not satisfied, complain to the Data Protection Board of
            India.
          </li>
        </ul>

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
          contact that freelancer first - they decide what is held about you.
        </p>
      </LegalSection>

      <LegalSection id="grievance-officer" title="10. Grievance Officer">
        <p>
          For any complaint about how we handle personal data or about content
          on {LEGAL.productName}, contact our Grievance Officer:
        </p>
        <ul>
          <li>
            <strong>{officer.name}</strong>, {officer.designation}
          </li>
          <li>
            Email:{" "}
            <a href={mailtoHref("Grievance")}>{LEGAL.supportEmail}</a> (subject
            “Grievance”)
          </li>
        </ul>
        <p>
          We acknowledge every grievance within {officer.acknowledgeWithin} and
          aim to resolve it within {officer.resolveWithin}.
        </p>
      </LegalSection>

      <LegalSection id="security" title="11. How we protect data">
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
          <a href={mailtoHref("Security concern")}>{LEGAL.supportEmail}</a>. If
          a breach affects your data, we will tell you and the authorities as
          the law requires.
        </p>
      </LegalSection>

      <LegalSection id="transfers" title="12. Where your data is processed">
        <p>
          {LEGAL.productName} is operated from {LEGAL.operatorCountry}, and the
          providers listed above process data in the countries where they
          operate. That means your data may be stored or handled outside the
          country you live in. We only use providers that offer appropriate
          protections for international transfers.
        </p>
      </LegalSection>

      <LegalSection id="children" title="13. Children">
        <p>
          {LEGAL.productName} is a business tool and is not intended for anyone
          under 18. We do not knowingly collect data from children. If you
          believe a child has given us data, email us and we will remove it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="14. Changes to this policy">
        <p>
          We may update this policy as the product changes. The date at the top
          shows the current version, and where a change materially affects you
          we will give advance notice by email or in the app.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="15. How to contact us">
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
