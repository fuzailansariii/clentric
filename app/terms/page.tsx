import type { Metadata } from "next";
import Link from "next/link";

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
            Paid plans are billed monthly in {LEGAL.currency} through Stripe and
            renew automatically until you cancel. You can cancel at any time.
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
          a proposal builder with private accept or decline links, and a
          read-only client portal on paid plans.
        </p>
        <p>
          Features depend on your plan. Prices are in {LEGAL.currency} and
          billing is monthly.
        </p>

        {/* Phone: one card per plan. A three-column table at this width
            either scrolls sideways or squeezes the feature column down to a
            word per line, and neither reads well. */}
        <div className="mt-6 space-y-3 sm:hidden">
          {LEGAL.plans.map((plan) => (
            <div
              key={plan.name}
              className="border-border bg-card rounded-xl border p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="mt-0! text-base font-semibold">{plan.name}</h3>
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {plan.price}
                  {plan.cadence ? ` ${plan.cadence}` : ""}
                </span>
              </div>
              <ul className="mt-3">
                {plan.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Tablet and up: the same plans as a comparison table. */}
        <div className="border-border mt-6 hidden w-full overflow-x-auto rounded-xl border sm:block">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              {LEGAL.productName} plans, prices and what each one includes
            </caption>
            <thead>
              <tr className="border-border text-foreground border-b">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Plan
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Price
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  What you get
                </th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {LEGAL.plans.map((plan) => (
                <tr
                  key={plan.name}
                  className="border-border border-b last:border-b-0"
                >
                  <th
                    scope="row"
                    className="text-foreground px-4 py-3 align-top font-medium"
                  >
                    {plan.name}
                  </th>
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    {plan.price}
                    {plan.cadence ? ` ${plan.cadence}` : ""}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <ul>
                      {plan.includes.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p>
          We improve the product over time, so features may be added, changed or
          removed. If we make a change that materially reduces what a paid plan
          gives you, we will give you advance notice.
        </p>
      </LegalSection>

      <LegalSection id="billing" title="3. Subscriptions and billing">
        <p>
          Paid plans are charged monthly in advance through Stripe Checkout.{" "}
          {LEGAL.productName} never sees or stores your card number. Your
          subscription renews automatically each month until you cancel.
        </p>
        <p>
          If a renewal payment fails, Stripe retries it and your account stays
          on its paid plan through a grace period rather than being cut off
          immediately. If the payment still cannot be collected, the account
          moves to the Free plan. Your data is kept.
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
          . After you cancel, paid features stay available until the end of the
          billing period you have already paid for, and then the account moves
          to the Free plan. Nothing is deleted.
        </p>
        <p>
          <strong>Refunds in short:</strong> we refund a customer’s first
          payment in full if the request reaches us by email within{" "}
          {LEGAL.refund.windowHours} hours of the charge. Renewal payments,
          requests after that window, and downgrades are not refundable, and we
          do not give partial or pro-rated refunds. Accidental or duplicate
          charges are always refunded in full.
        </p>
        <p>
          Refunding a first payment also cancels the subscription straight away,
          and the account moves to the Free plan with your data left as it is. A
          refund for an accidental or duplicate charge does not cancel anything.
        </p>
        <p>
          The full rules, including how to ask and how long it takes, are on our{" "}
          <Link href={LEGAL.routes.refund}>Refund & Cancellation Policy</Link>{" "}
          page.
        </p>
      </LegalSection>

      <LegalSection id="limits" title="5. Plan limits and downgrades">
        <p>
          The Free plan has limits on how many clients, projects, invoices and
          proposals you can create. If you downgrade or cancel, we do not delete
          work that is over those limits — you keep everything you already made.
          The limits only stop you creating new items beyond them until you
          upgrade again.
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
          payment” button, that is a notification to you and nothing more — it
          is not proof that any money was sent or received.
        </p>
        <p>
          We are not a party to any agreement between you and your client. We
          are not responsible for non-payment, disputes, chargebacks, the
          quality of the work, or anything else arising between you and the
          people you work for.
        </p>
        <p>
          Stripe is used only to charge you for your own {LEGAL.productName}{" "}
          subscription.
        </p>
      </LegalSection>

      <LegalSection
        id="proposals"
        title="7. Proposals are not contracts or e-signatures"
      >
        <p>
          When a client accepts a proposal, that is a simple click confirmation.
          It notifies you and creates a project in your workspace.{" "}
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
          as we need to in order to run the service for you — for example to
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
          Proposal and portal links use long random tokens, and you can revoke
          them or let them expire. Until then, anyone who has the link can open
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
            guess, scrape or enumerate other people’s proposal or portal links;
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
          subscription moves you to the Free plan; asking us to close your
          account removes it. You can export your data for{" "}
          {LEGAL.dataExportWindow} after closing your account — email us and we
          will prepare it.
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

      <LegalSection id="governing-law" title="14. Governing law">
        <p>
          These terms are governed by {LEGAL.governingLaw}. If something goes
          wrong, please email us first at{" "}
          <a href={mailtoHref("Question about the Terms")}>
            {LEGAL.supportEmail}
          </a>
          . Most problems are settled faster and more cheaply by a conversation
          than by anything formal.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="15. Changes to these terms">
        <p>
          We may update these terms as the product and the law change. The
          version on this page is always the current one, and where a change
          materially affects you we will give advance notice by email or in the
          app. If you keep using {LEGAL.productName} after a change takes
          effect, the updated terms apply to you.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="16. How to contact us">
        <p>
          Email <a href={mailtoHref()}>{LEGAL.supportEmail}</a> and we will
          reply {LEGAL.responseTime}, or use our{" "}
          <Link href={LEGAL.routes.contact}>contact page</Link>.
        </p>
        <p>
          {LEGAL.operatorLegalName} · {LEGAL.entityType}
          {LEGAL.registeredAddress ? ` · ${LEGAL.registeredAddress}` : ""}
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
