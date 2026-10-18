import type { Metadata } from "next";
import Link from "next/link";
import { ContactList, LegalPage, Mail, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The rules for using the Grouv website and app.",
};

const SECTIONS = [
  { id: "who-can-use", title: "1. Who can use Grouv" },
  { id: "what-grouv-offers", title: "2. What Grouv offers" },
  { id: "community-rules", title: "3. Community rules" },
  { id: "your-content", title: "4. Your content and privacy choices" },
  { id: "safety", title: "5. Connections, gatherings, and safety" },
  { id: "season-pass", title: "6. Free access, trial, and Season Pass" },
  { id: "third-parties", title: "7. Third-party services" },
  { id: "our-rights", title: "8. Our rights and feedback" },
  { id: "closure", title: "9. Account closure and changes" },
  { id: "disputes", title: "10. Responsibility and disputes" },
  { id: "contact", title: "11. Contact" },
];

/** Terms of Use — linked from sign-up, the paywall, Settings and the landing footer. */
export default function TermsPage() {
  return (
    <LegalPage
      current="/terms"
      title="Grouv Terms of Use"
      sections={SECTIONS}
      intro={
        <>
          <p>
            Grouv is based in Lagos, Nigeria. Questions about these Terms can be sent to <Mail to="info@grouv.app" />. In
            these Terms, &ldquo;Grouv&rdquo;, &ldquo;we&rdquo;, and &ldquo;us&rdquo; refer to the service.
          </p>
          <p>
            These Terms explain the rules for using the Grouv website and app. Please read them alongside our{" "}
            <Link href="/privacy" className="font-semibold text-primary-500 hover:underline">
              Privacy Policy
            </Link>
            . By creating an account or using Grouv, you agree to these Terms. If you do not agree, do not use the service.
          </p>
        </>
      }
    >
      <Section id="who-can-use" title="1. Who can use Grouv">
        <p>
          Grouv is for adults aged 18 or over. You must provide accurate account information, keep your sign-in details
          secure, and tell us promptly at <Mail to="support@grouv.app" /> if you believe someone has accessed your account
          without permission. You are responsible for activity on your account unless it results from a failure on our part.
        </p>
        <p>
          Do not impersonate another person, create deceptive accounts, sell or transfer your account, or use Grouv if we
          have suspended you for a serious violation unless we give you permission to return.
        </p>
      </Section>

      <Section id="what-grouv-offers" title="2. What Grouv offers">
        <p>
          Grouv helps people connect around the life chapters they are living. Depending on availability and your plan, you
          can create a profile and chapters, use Spaces and groups, post updates, make connections and Bonds, send messages
          and invitations, participate in gatherings, and keep a private Grouv Log and archive. Some features use your chosen
          location and visibility settings.
        </p>
        <p>
          Grouv is a place for connection and reflection. We cannot promise a particular match, response, friendship,
          outcome, or level of engagement. A suggested person is not a background-checked or endorsed person. We may
          improve, change, or discontinue features; if a material paid feature changes, we will give reasonable notice where
          practical and required by law.
        </p>
      </Section>

      <Section id="community-rules" title="3. Community rules">
        <p>
          Treat other people with respect and follow applicable law. You must not use Grouv to harass, threaten, stalk,
          exploit, bully, discriminate, scam, impersonate, send unwanted commercial messages, or encourage violence or
          self-harm. Do not post unlawful sexual content, non-consensual intimate material, child sexual abuse material,
          another person&rsquo;s private information without permission, or content that infringes someone else&rsquo;s
          rights.
        </p>
        <p>
          Do not scrape the service, create accounts with bots, attack its security, distribute malware, or try to evade a
          block or suspension. Do not use requests, groups, gatherings, or messages to arrange illegal activity or pressure
          people into sharing money, information, or intimacy. You must respect another person&rsquo;s decision not to
          communicate or meet.
        </p>
        <p>
          You can report content or conduct through the app or at <Mail to="support@grouv.app" />. We may remove content,
          limit its reach, restrict features, suspend accounts, or take other proportionate action to protect people and the
          service. We may act immediately in serious safety or legal cases. If you think we made a mistake, contact{" "}
          <Mail to="support@grouv.app" /> for review.
        </p>
      </Section>

      <Section id="your-content" title="4. Your content and privacy choices">
        <p>
          You keep ownership of the words, photos, recordings, and other content you create. You must have the rights needed
          to post them. You give Grouv a non-exclusive licence to store, process, transmit, and display your content as
          needed to run the features you choose, maintain security, and comply with law. This is not permission to put your
          private journal or messages in an advertisement. This licence ends when the content is deleted from active systems,
          except for copies retained as described in our Privacy Policy and copies another user has already made or shared.
        </p>
        <p>
          Before posting or sharing, check the audience shown in the app. Grouv Log entries can be shared with the audience
          you select, such as Bonds, your Circle, or Everyone. Private entries stay private unless you deliberately share
          them. A recipient can still screenshot, copy, or pass on content you share, so choose your audience carefully.
          Content involving more than one person, including messages and shared Bond content, may remain visible to the other
          participants after you delete your own account or copy.
        </p>
      </Section>

      <Section id="safety" title="5. Connections, gatherings, and safety">
        <p>
          You decide whether to accept an invitation, connect, create a Bond, join a group, or meet another user. Grouv does
          not verify every user&rsquo;s identity or guarantee their behaviour. Use care before sharing sensitive information,
          sending money, or meeting offline. If you host a gathering, you are responsible for its arrangements and for
          following applicable law. Grouv is not an emergency, medical, mental-health, financial, or legal advice service.
        </p>
        <p>
          <strong className="font-semibold text-ink-700">
            If someone is in immediate danger, contact local emergency services.
          </strong>{" "}
          A report sent to Grouv is not a substitute for emergency assistance.
        </p>
      </Section>

      <Section id="season-pass" title="6. Free access, trial, and Season Pass">
        <p>
          Grouv offers a Free plan and paid Season Pass options. The exact features available to each plan are shown in the
          app and may change with notice where required. Existing personal content should not be presented as destroyed
          merely because a paid plan ends; access to paid creation or editing features may change.
        </p>
        <p>
          At launch, eligible new users may receive a 14-day Season Pass trial{" "}
          <strong className="font-semibold text-ink-700">without entering a payment card</strong>. This card-free trial does{" "}
          <strong className="font-semibold text-ink-700">not</strong> automatically convert into a paid subscription or
          charge you when it ends. You can choose a paid plan at checkout, or continue on Free. Any separate promotional
          access period will show its own terms.
        </p>
        <p>
          The current paid options are{" "}
          <strong className="font-semibold text-ink-700">US$1.99 per week, US$7.99 per month</strong>, and a{" "}
          <strong className="font-semibold text-ink-700">
            founding annual offer of US$59 for the first year, renewing at US$69 per year
          </strong>
          . The founding offer is a one-year introductory price, not lifetime access. The price, currency, taxes, billing
          interval, renewal price, and any eligibility limits displayed at checkout are the terms of the purchase; please
          review them before confirming payment. We will not charge you merely for starting the card-free trial.
        </p>
        <p>
          Once you actively purchase a paid plan, it renews at the stated interval until cancelled. Cancel before the next
          renewal to avoid the next charge. Follow the cancellation method shown at checkout or in your billing controls; if
          you cannot find it, email <Mail to="support@grouv.app" />. Cancelling normally leaves paid access available through
          the period already paid for, unless law or the checkout terms require otherwise. Deleting the app or your account
          may not cancel a separate payment instruction, so contact us if you are unsure. We handle refund requests under our{" "}
          <Link href="/refunds" className="font-semibold text-primary-500 hover:underline">
            Refund and Cancellation Policy
          </Link>
          , applicable law, and the payment provider&rsquo;s terms; contact <Mail to="support@grouv.app" /> about a billing
          error. We will notify you of a price change as required by law before it applies.
        </p>
      </Section>

      <Section id="third-parties" title="7. Third-party services">
        <p>
          Grouv uses outside providers to run hosting, storage, email, subscriptions, and payments. Their services may have
          separate terms. Our{" "}
          <Link href="/privacy#providers" className="font-semibold text-primary-500 hover:underline">
            Privacy Policy
          </Link>{" "}
          explains the categories of providers and information they handle. Links to other websites or user-organized events
          are not endorsements by Grouv.
        </p>
      </Section>

      <Section id="our-rights" title="8. Our rights and feedback">
        <p>
          Grouv owns its software, design, name, and branding, excluding your content and material owned by others. You may
          use the service for its intended personal purposes while your account is active. Do not copy or misuse our branding
          in a way that suggests an endorsement.
        </p>
        <p>
          If you send us ideas or feedback, we may use them to improve Grouv without paying you, but we will not identify you
          publicly without permission.
        </p>
      </Section>

      <Section id="closure" title="9. Account closure and changes">
        <p>
          You can stop using Grouv and request account deletion through the app or by contacting{" "}
          <Mail to="support@grouv.app" />. The Privacy Policy explains what happens to your data, including information we may
          need to retain for legal, billing, or safety reasons. We may suspend or close an account for serious or repeated
          rule violations, non-payment, legal obligations, or a threat to others or the service. Where reasonable, we will
          explain the action and offer a way to seek review.
        </p>
        <p>
          We may update these Terms. For a material change, we will provide notice in the app, by email, or another
          reasonable method before the change takes effect where required. If you disagree with a change, you can stop using
          Grouv and cancel a paid plan before its next renewal.
        </p>
      </Section>

      <Section id="disputes" title="10. Responsibility and disputes">
        <p>
          We work to keep Grouv available and safe, but cannot guarantee uninterrupted access or that every user-generated
          statement is accurate. Nothing in these Terms removes consumer or privacy rights that the law does not allow us to
          remove. To the extent permitted by applicable law, Grouv is not responsible for losses caused solely by another
          user&rsquo;s independent conduct or by circumstances outside our reasonable control. We remain responsible where the
          law requires us to be.
        </p>
        <p>
          Please first contact <Mail to="info@grouv.app" /> with a short description of a dispute so we can try to resolve it.
          Nigerian law governs these Terms to the extent permitted, without taking away mandatory rights you have in another
          country. You can also contact an appropriate regulator or court where the law gives you that right.
        </p>
      </Section>

      <Section id="contact" title="11. Contact">
        <ContactList
          rows={[
            ["Support and safety", <Mail key="s" to="support@grouv.app" />],
            ["General and legal enquiries", <Mail key="i" to="info@grouv.app" />],
            ["Location", "Lagos, Nigeria"],
          ]}
        />
      </Section>
    </LegalPage>
  );
}
