import type { Metadata } from "next";
import Link from "next/link";
import { ContactList, LegalPage, Mail, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Refund and Cancellation Policy",
  description: "How the Grouv Season Pass trial, cancellations, billing mistakes, and refunds work.",
};

const SECTIONS = [
  { id: "trial", title: "The 14-day trial" },
  { id: "subscriptions", title: "Paid subscriptions and cancellation" },
  { id: "when-to-request", title: "When to request a refund" },
  { id: "how-we-handle", title: "How we handle a request" },
  { id: "contact", title: "Contact" },
];

const strong = "font-semibold text-ink-700";

/** Refund and Cancellation Policy — linked from the paywall, Settings, the Terms and the landing footer. */
export default function RefundsPage() {
  return (
    <LegalPage
      current="/refunds"
      title="Grouv Refund and Cancellation Policy"
      sections={SECTIONS}
      intro={
        <>
          <p>
            Grouv is based in Lagos, Nigeria. For billing or refund questions, contact <Mail to="support@grouv.app" />.
          </p>
          <p>
            This policy explains how the Grouv Season Pass trial, cancellations, billing mistakes, and refunds work. It applies
            to purchases made through Grouv&rsquo;s own checkout. If Grouv later offers purchases through an app store, that
            store&rsquo;s refund process may also apply. Your rights under applicable consumer law are not reduced by this
            policy.
          </p>
        </>
      }
    >
      <Section id="trial" title="The 14-day trial">
        <p>
          Grouv&rsquo;s introductory 14-day Season Pass trial requires <strong className={strong}>no payment card</strong>.
          It ends without charging you. If you want to keep Season Pass, you must actively choose and pay for a plan.
          Otherwise, you can continue on Free. There is no trial payment to refund.
        </p>
      </Section>

      <Section id="subscriptions" title="Paid subscriptions and cancellation">
        <p>
          The current options are <strong className={strong}>US$1.99 weekly</strong>,{" "}
          <strong className={strong}>US$7.99 monthly</strong>, and a{" "}
          <strong className={strong}>founding annual offer of US$59 for the first year, renewing at US$69 per year</strong>.
          The checkout shows the price, currency, taxes, billing interval, and renewal terms that apply to your purchase.
          After you actively subscribe, the plan renews until you cancel it.
        </p>
        <p>
          Cancel before your next renewal to prevent the next charge. Follow the cancellation method shown at checkout or in
          your billing controls. If you cannot find it, email <Mail to="support@grouv.app" /> from the address linked to your
          Grouv account and ask us to help. Cancellation normally stops future renewal; it does not automatically refund a
          period already paid for. You normally keep Season Pass until that paid period ends, unless a refund is issued or the
          law requires a different result. Deleting the app or your account may not cancel a separate payment instruction, so
          contact us if you are unsure.
        </p>
      </Section>

      <Section id="when-to-request" title="When to request a refund">
        <p>
          Email <Mail to="support@grouv.app" /> if you believe you were charged twice, charged an amount different from what
          checkout showed, charged after a cancellation that should have taken effect, or paid for Season Pass but did not
          receive the access you purchased. Please also contact us if the service was materially unavailable or you have
          another billing concern. We will investigate and provide a correction, refund, or other remedy where required by law
          or appropriate to the circumstances.
        </p>
        <p>
          If you simply change your mind after a correctly disclosed paid purchase, you may still ask us to review your
          request. We will consider it fairly, but cancellation alone does not guarantee a refund or a prorated credit for
          unused time. This does not affect any mandatory refund or cancellation right you have under applicable law.
        </p>
      </Section>

      <Section id="how-we-handle" title="How we handle a request">
        <p>
          Send us your Grouv account email, the charge date and amount, and a short explanation. A receipt or transaction
          reference helps. <strong className={strong}>Do not email your full card number or password.</strong> We may ask for
          information needed to verify the purchase and prevent fraud. If we approve a refund, it will normally return through
          the original payment method; the time it takes to appear depends on the payment provider and your bank. Refunding
          the current paid period may end Season Pass access immediately. We will tell you what happens to access and renewal
          when we resolve the request.
        </p>
        <p>
          If another payment provider or app store controls the transaction, we may need to direct you to its refund process,
          but <Mail to="support@grouv.app" /> remains the place to contact us for help identifying the correct route.
        </p>
        <p>
          See also our{" "}
          <Link href="/terms#season-pass" className="font-semibold text-primary-500 hover:underline">
            Terms of Use
          </Link>
          , section 6.
        </p>
      </Section>

      <Section id="contact" title="Contact">
        <ContactList
          rows={[
            ["Billing and refunds", <Mail key="s" to="support@grouv.app" />],
            ["General enquiries", <Mail key="i" to="info@grouv.app" />],
            ["Location", "Lagos, Nigeria"],
          ]}
        />
      </Section>
    </LegalPage>
  );
}
