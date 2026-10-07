import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

import {
  LegalCallout,
  LegalLayout,
  LegalSection,
} from "@/components/legal/legal-layout";
import { LEGAL, mailtoHref } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: `Terms of Service · ${LEGAL.productName}`,
  description: `The terms that apply when you use ${LEGAL.productName}, including subscriptions, cancellation, refunds and acceptable use.`,
  alternates: { canonical: LEGAL.routes.terms },
  robots: { index: true, follow: true },
};

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated={LEGAL.lastUpdated}
      intro={
        <p>
          These terms are the agreement between you and{" "}
          {LEGAL.operatorLegalName}, the {LEGAL.entityType} that operates{" "}
          {LEGAL.productName}. By creating an account or using the service, you
          agree to them. We have tried to write them in plain English.
        </p>
      }
    >
      <LegalCallout title="The key points">
        <ul>
          <li>
            {LEGAL.productName} is a workspace for managing clients, projects,
            invoices and proposals. You need to be 18 or older to use it.
          </li>
          <li>
            Paid plans are billed monthly or yearly in {LEGAL.currency} through
            our payment provider and renew automatically until you cancel. You
            can cancel at any time.
          </li>
          <li>
            <strong>
              We never handle the money between you and your clients.
            </strong>{" "}
            They pay you directly, outside {LEGAL.productName}.
          </li>
          <li>
            Accepting a proposal is a click confirmation, not an electronic
            signature, and {LEGAL.productName} does not provide contract or
            e-signature services.
          </li>
          <li>
            Your content stays yours. We only host and process it so we can run
            the service for you.
          </li>
        </ul>
      </LegalCallout>

      <LegalSection id="who-can-use" title="1. Who can use Clentric">
        <p>
          You must be at least 18 years old and able to enter into a contract.
          You are responsible for everything that happens under your account,
          including keeping your password safe and your email address current.
          Tell us promptly if you think someone else has access to your account.
        </p>
        <p>
          On the Agency plan, the account owner invites team members and stays
          responsible for what those team members do in the workspace, and for
          the subscription fees.
        </p>
      </LegalSection>

      <LegalSection id="the-service" title="2. What the service includes">
        <p>
          {LEGAL.productName} gives you a client manager, a project tracker with
          milestones, an invoice generator with line items, tax and PDF export,
          and a proposal builder with private accept or decline links.
        </p>
        <p>
          Features depend on your plan. Prices are in {LEGAL.currency}. Paid
          plans are billed monthly or yearly, depending on the option you
          choose.
        </p>

        {/* One card per plan: stacked on phones, three across from md up.
            The `!` overrides beat LegalSection's prose list styles
            (bullets, indent, muted text), which don't suit a card. */}
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {LEGAL.plans.map((plan) => (
            <div
              key={plan.name}
              className="border-border bg-card flex flex-col rounded-xl border p-5"
            >
              <h3 className="mt-0! text-base font-semibold">{plan.name}</h3>
              {plan.note && (
                <p className="text-primary! mt-0.5 text-xs font-medium">
                  {plan.note}
                </p>
              )}
              <p className="mt-0.5 text-sm">{plan.summary}</p>

              <p className="mt-4">
                <span className="font-space text-foreground text-2xl font-semibold tracking-tight">
                  {plan.price}
                </span>{" "}
                <span className="text-sm">{plan.cadence}</span>
              </p>
              {plan.yearlyNote && (
                <p className="mt-0.5 text-xs">{plan.yearlyNote}</p>
              )}

              <ul className="border-border mt-4 list-none! space-y-2! border-t pt-4 pl-0!">
                {plan.includes.map((item) => (
                  <li
                    key={item}
                    className="text-foreground flex items-start gap-2 text-sm"
                  >
                    <CheckIcon
                      className="text-primary mt-0.5 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p>
          We improve the product over time, so features may be added, changed or
          removed. If we make a change that materially reduces what a paid plan
          gives you, we will give you advance notice.
        </p>
      </LegalSection>

      <LegalSection id="billing" title="3. Subscriptions and billing">
        <p>
          Paid plans are charged in advance, monthly or yearly, by our payment
          provider, which acts as the merchant of record. That means it is the
          official seller of your {LEGAL.productName} subscription and handles
          payment, invoices and sales tax. {LEGAL.productName} never sees or
          stores your card number.
        </p>
        <p>
          Prices are set in USD. Checkout may show and charge them in your
          local currency, converted at the time of payment, with local tax
          (such as VAT or GST) added where it applies.
        </p>
        <p>
          Your subscription renews automatically at the end of each billing
          period until you cancel.
        </p>
        <p>
          If a renewal payment fails, our payment provider retries it and your
          account stays on its paid plan during a grace period rather than being
          cut off immediately.
        </p>
        <p>
          If we change our prices, we will give you advance notice before the
          new price applies to your subscription.
        </p>
      </LegalSection>

      <LegalSection id="cancellation" title="4. Cancellation and refunds">
        <p>
          You can cancel at any time from your billing settings, or by emailing{" "}
          <a href={mailtoHref("Cancel my subscription")}>
            {LEGAL.supportEmail}
          </a>
          .
        </p>
        <p>
          After you cancel, paid features stay available until the end of the
          billing period you have already paid for, and you are not charged
          again.
        </p>
        <p>
          You can get a full refund of any payment if you ask within{" "}
          {LEGAL.refund.windowHours} hours of the charge. See our{" "}
          <Link href={LEGAL.routes.refund}>Refund Policy</Link> for details.
        </p>
      </LegalSection>

      <LegalSection id="limits" title="5. Plan limits and downgrades">
        <p>
          The Free plan has limits on how many clients, projects, invoices and
          proposals you can create. If you downgrade or cancel, we do not delete
          work that is over those limits - you keep everything you already made.
          The limits only stop you creating new items beyond them until you
          upgrade again.
        </p>
        <p>
          During the beta, paid plans are switched off: every account gets all
          features and no limits apply. We will email you before limits or paid
          plans start, and nothing you made during the beta will be deleted.
        </p>
      </LegalSection>

      <LegalSection
        id="client-payments"
        title="6. Payments between you and your clients"
      >
        <p>
          This is important, so we will be blunt about it.{" "}
          <strong>
            {LEGAL.productName} does not process, hold, guarantee or collect any
            payment between you and your clients.
          </strong>{" "}
          There is no payment gateway, no escrow and no connected payments
          feature for client invoices.
        </p>
        <p>
          You enter your own bank, PayPal or Wise details, and we show them on
          the invoices you send. Your clients pay you directly, outside{" "}
          {LEGAL.productName}. An invoice only becomes “Paid” when you mark it
          as paid yourself. If your client clicks the optional “I’ve sent
          payment” button, that is a notification to you and nothing more - it
          is not proof that any money was sent or received.
        </p>
        <p>
          We are not a party to any agreement between you and your client. We
          are not responsible for non-payment, disputes, chargebacks, the
          quality of the work, or anything else arising between you and the
          people you work for.
        </p>
        <p>
          Our payment provider is used only to charge you for your own{" "}
          {LEGAL.productName} subscription.
        </p>
      </LegalSection>

      <LegalSection
        id="proposals"
        title="7. Proposals are not contracts or e-signatures"
      >
        <p>
          When a client accepts a proposal, that is a simple click confirmation.
          It records their acceptance in your workspace and creates a project.{" "}
          <strong>
            It is not a legally binding electronic signature, and{" "}
            {LEGAL.productName} is not an e-signature or contract service.
          </strong>
        </p>
        <p>
          If you need a signed contract, use a proper contract or e-signature
          service alongside {LEGAL.productName}. We make no claim that a
          proposal acceptance will be enforceable anywhere.
        </p>
      </LegalSection>

      <LegalSection id="your-content" title="8. Your content and your data">
        <p>
          You own the content you put into {LEGAL.productName}: your clients,
          projects, invoices, proposals, notes and files. You give us a limited
          licence to store, copy, display and process that content only so far
          as we need to in order to run the service for you - for example to
          show a proposal at the link you shared, or to generate an invoice PDF.
          That licence ends when you delete the content or close your account.
        </p>
        <p>
          You are responsible for the content you add, including any personal
          data about your own clients. You confirm you have the right to hold it
          and to share it through {LEGAL.productName}. How we handle personal
          data is explained in our{" "}
          <Link href={LEGAL.routes.privacy}>Privacy Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection id="public-links" title="9. Public links and sharing">
        <p>
          Proposal links use long random tokens, and you can revoke them or let
          them expire. Until then, anyone who has the link can open
          the page without signing in. Send links only to the people you mean to
          send them to, and revoke a link if it goes astray.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="10. Acceptable use">
        <p>While using {LEGAL.productName}, you agree not to:</p>
        <ul>
          <li>use it for anything illegal, or to store illegal content;</li>
          <li>send spam or unsolicited bulk messages through the service;</li>
          <li>
            harass, abuse or impersonate anyone, or use it to defraud someone;
          </li>
          <li>
            upload content that infringes someone else’s intellectual property
            or privacy;
          </li>
          <li>
            attack, probe or try to break the security of the service, or
            interfere with other people using it;
          </li>
          <li>
            guess, scrape or enumerate other people’s proposal links;
          </li>
          <li>
            resell or rent the service, or copy it to build a competing product.
          </li>
        </ul>
        <p>
          If you see something on {LEGAL.productName} that breaks these rules,
          please tell us at{" "}
          <a href={mailtoHref("Report abuse")}>{LEGAL.supportEmail}</a>.
        </p>
      </LegalSection>

      <LegalSection id="ending" title="11. Ending your account">
        <p>
          You can stop using {LEGAL.productName} at any time. Cancelling your
          subscription moves you to the Free plan. You can download your data
          and delete your account yourself in Settings: the account is locked at
          once and permanently deleted {LEGAL.accountPurgeAfter} later, and you
          can restore it until then.
        </p>
        <p>
          We may suspend or close an account that breaks these terms, is used
          illegally, or puts the service or other users at risk. Unless the
          situation is serious or urgent, we will contact you first and give you
          a chance to put it right. If we close your account for reasons that
          are not your fault, we will refund any unused part of the period you
          have paid for.
        </p>
      </LegalSection>

      <LegalSection id="disclaimers" title="12. Disclaimers">
        <p>
          {LEGAL.productName} is provided “as is”. We work hard to keep it
          available and accurate, but we cannot promise it will never be
          interrupted, error-free, or fit every purpose you have in mind. Keep
          your own copies of anything you cannot afford to lose.
        </p>
        <p>
          {LEGAL.productName} is a tool, not an adviser. Nothing in the product
          or on these pages is legal, tax or accounting advice. Invoice
          templates, tax fields and proposal text are starting points, and you
          are responsible for checking that what you send is correct for your
          situation.
        </p>
        <h3>The beta</h3>
        <p>
          While {LEGAL.productName} is in beta, features may change, stop
          working or be removed without notice, and data may occasionally be
          lost. Use the export in Settings to keep your own copies of anything
          important.
        </p>
        <h3>Services run by others</h3>
        <p>
          {LEGAL.productName} relies on services operated by other companies,
          including hosting, sign-in, email delivery, file storage and payment
          processing, and on banks, payment apps and email providers that you
          and your clients choose. We are not responsible for their outages,
          delays, errors or decisions, such as an email landing in spam or a
          payment being held by a bank.
        </p>
        <h3>You and your clients</h3>
        <p>
          You decide what you invoice, what you quote, and what you agree with
          your clients. The accuracy of your invoices and proposals, the taxes
          you charge and report, whether you get paid, and any dispute with a
          client are your responsibility, not ours.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="13. Limitation of liability">
        <p>
          To the extent the law allows, {LEGAL.productName} is not liable for
          indirect or consequential losses, lost profits, lost business, lost
          income, or lost or corrupted data arising from your use of the
          service.
        </p>
        <p>
          Where we are liable, our total liability to you for all claims in any
          twelve-month period is limited to the amount you paid us for the
          service in the twelve months before the claim arose.
        </p>
        <p>
          Nothing in these terms limits liability that cannot be limited by law,
          such as liability for fraud, or for death or personal injury caused by
          negligence. If you are a consumer, you keep any rights your local law
          gives you.
        </p>
      </LegalSection>

      <LegalSection id="indemnity" title="14. Your responsibility to us">
        <p>
          If someone makes a claim against us because of content you put into{" "}
          {LEGAL.productName}, personal data you entered about your clients,
          documents you sent through the service, your dealings with your
          clients, or your breach of these terms or of the law, you agree to
          cover the reasonable costs and losses that result, including
          reasonable legal fees. We will tell you about the claim promptly and
          let you take part in dealing with it. This does not apply where the
          claim is caused by our own fault.
        </p>
      </LegalSection>

      <LegalSection id="force-majeure" title="15. Events outside our control">
        <p>
          We are not responsible for delays or failures caused by events we
          cannot reasonably control, such as outages of internet, hosting or
          other providers, cyber attacks, power cuts, natural disasters, strikes,
          or actions of governments or authorities.
        </p>
      </LegalSection>

      <LegalSection id="governing-law" title="16. Disputes and governing law">
        <p>
          If something goes wrong, please contact us first at{" "}
          <a href={mailtoHref("Dispute")}>{LEGAL.supportEmail}</a> or through
          our Grievance Officer, and give us at least 30 days to try to resolve
          it before starting any formal proceedings. Most problems are settled
          faster and more cheaply by a conversation than by anything formal.
        </p>
        <p>These terms are governed by {LEGAL.governingLaw}.</p>
      </LegalSection>

      <LegalSection id="changes" title="17. Changes to these terms">
        <p>
          We may update these terms as the product and the law change. The
          version on this page is always the current one, and where a change
          materially affects you we will give advance notice by email or in the
          app. If you keep using {LEGAL.productName} after a change takes
          effect, the updated terms apply to you.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="18. How to contact us">
        <p>
          Email <a href={mailtoHref()}>{LEGAL.supportEmail}</a> and we will
          reply {LEGAL.responseTime}, or use our{" "}
          <Link href={LEGAL.routes.contact}>contact page</Link>.
        </p>
        <p>
          Complaints go to our Grievance Officer,{" "}
          {LEGAL.grievanceOfficer.name}, at{" "}
          <a href={mailtoHref("Grievance")}>{LEGAL.supportEmail}</a>. We
          acknowledge them within {LEGAL.grievanceOfficer.acknowledgeWithin} and
          aim to resolve them within {LEGAL.grievanceOfficer.resolveWithin}.
        </p>
        <p>
          {LEGAL.operatorLegalName} · {LEGAL.entityType}
          {LEGAL.registeredAddress ? ` · ${LEGAL.registeredAddress}` : ""}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
