import type { Metadata } from "next";
import { ContactList, LegalPage, Lead, Mail, Section } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What information Grouv handles, why, who can see it, and the choices you have.",
};

const SECTIONS = [
  { id: "information-we-collect", title: "1. Information we collect" },
  { id: "why-we-use-it", title: "2. Why we use information" },
  { id: "who-sees-it", title: "3. Who sees your information" },
  { id: "providers", title: "4. Providers and other disclosures" },
  { id: "where-processed", title: "5. Where information is processed" },
  { id: "retention", title: "6. How long we keep information" },
  { id: "security", title: "7. Security" },
  { id: "your-rights", title: "8. Your choices and rights" },
  { id: "children", title: "9. Children" },
  { id: "changes", title: "10. Changes and contact" },
];

const strong = "font-semibold text-ink-700";

/** Privacy Policy — linked from sign-up, the paywall, Settings and the landing footer. */
export default function PrivacyPage() {
  return (
    <LegalPage
      current="/privacy"
      title="Grouv Privacy Policy"
      sections={SECTIONS}
      intro={
        <>
          <p>
            Grouv is based in Lagos, Nigeria. Contact us about privacy at <Mail to="support@grouv.app" />. In this policy,
            &ldquo;Grouv&rdquo;, &ldquo;we&rdquo;, and &ldquo;us&rdquo; refer to the service.
          </p>
          <p>
            Grouv helps adults meet people living similar life chapters and preserve a digital record of their own seasons and
            experiences. This policy explains what information we handle, why, who can see it, and the choices you have. It
            covers our website, app, waitlist, and related support communications.
          </p>
        </>
      }
    >
      <Section id="information-we-collect" title="1. Information we collect">
        <p>
          <Lead>Account and profile.</Lead>
          We collect the details you provide to sign up and use Grouv, such as your name or username, email address,
          password or sign-in identifier, profile image, approximate location, chosen Spaces, life chapters, interests, and
          preferences. You may add other profile details voluntarily.
        </p>
        <p>
          <Lead>Content and connections.</Lead>
          We process posts, comments, photos, videos, journal and Grouv Log entries, archived chapters, invitations,
          requests, messages, Bonds, group participation, and other information you choose to create or share. A post about a
          life chapter can reveal sensitive information even if you do not label it as such. Other users may provide
          information about you when they invite, mention, message, or report you.
        </p>
        <p>
          <Lead>Location and gatherings.</Lead>
          We may infer an approximate location from your connection. If you enable Nearby or another location feature and
          grant device permission, we may process more precise location to provide it. You can withdraw device permission,
          but that feature may then stop working. We process gathering participation and RSVPs when you use those features.
        </p>
        <p>
          <Lead>Subscription and support.</Lead>
          We receive your plan, trial, purchase, renewal, and cancellation status from RevenueCat and the checkout provider.
          We also keep messages you send to support and information needed to respond or investigate a report. Payment
          details are submitted through the checkout provider; Grouv receives the transaction and entitlement information
          needed to manage your plan.
        </p>
        <p>
          <Lead>Technical information.</Lead>
          We process IP address, browser or device details, app version, page and feature usage, security events, crash
          reports, and error logs to operate and protect Grouv. Railway and Supabase hold some operational and error logs.
          Cookies or similar technologies may be used for sign-in, security, and remembering preferences. Any non-essential
          analytics or advertising technologies should be disclosed and controlled separately if introduced.
        </p>
      </Section>

      <Section id="why-we-use-it" title="2. Why we use information and our lawful grounds">
        <p>
          We use information to create and secure accounts; provide chapters, Spaces, posts, messages, Bonds, groups,
          journals, archive, and Nearby; show people and content relevant to your chosen interests and chapter; process
          subscriptions; send essential service notices; respond to support requests; investigate abuse; and maintain
          reliability. We may use aggregate or de-identified information to understand how the product works.
        </p>
        <p>
          Where a legal basis is required, we rely on providing the service you request, complying with legal obligations,
          our legitimate interests in keeping Grouv secure and improving it, and your consent for optional processing where
          required, such as precise device location or marketing email. You may withdraw consent for optional processing
          without losing unrelated features. Some user content could reveal health, religion, finances, relationships, or
          other sensitive matters. We ask you to consider your audience carefully and use extra protections or consent where
          the law requires them.
        </p>
        <p>
          Grouv <strong className={strong}>does not currently use AI</strong> to generate Your Life Wrapped, analyse private
          journals, or make decisions about users. Ordinary software may organize feeds or suggest relevant people based on
          the information and settings you provide. If we introduce AI later, we will explain the new processing and update
          this policy before it starts.
        </p>
      </Section>

      <Section id="who-sees-it" title="3. Who sees your information">
        <p>
          You choose the audience shown when you post or share. Grouv Log visibility can be set to{" "}
          <strong className={strong}>Bonds, Circle, or Everyone</strong>. Private journal and archive content is not shown to
          other users unless you deliberately share it. Messages and shared Bond content are visible to the participants
          indicated in the feature. Public profile fields, posts, comments, or group activity may be visible to other users
          according to the settings shown in the app.
        </p>
        <p>
          No privacy setting can stop someone you allowed to see information from taking a screenshot, copying it, or sharing
          it outside Grouv. We may access limited account or content information when necessary for support, security, abuse
          investigations, legal obligations, or to operate a feature you requested. We do not treat a post marked anonymous to
          other users as anonymous to Grouv.
        </p>
      </Section>

      <Section id="providers" title="4. Providers and other disclosures">
        <p>
          We use <strong className={strong}>Cloudflare</strong> for the domain, <strong className={strong}>Railway</strong>{" "}
          to host the frontend and backend, <strong className={strong}>Supabase</strong> for the database,{" "}
          <strong className={strong}>Resend</strong> to send email, and <strong className={strong}>RevenueCat</strong> to
          manage subscriptions and access. The payment provider shown at checkout processes payment details. Cloudflare may
          also receive connection information if its proxy or security services are enabled. These providers process
          information needed for their role under their own contractual and technical arrangements.
        </p>
        <p>
          We may disclose information to other users according to your settings; to service providers working for Grouv; to
          professional advisers under confidentiality; and to authorities or others where required by law or reasonably
          necessary to protect people, investigate fraud or abuse, or defend rights. If Grouv is reorganized or sold,
          information may transfer subject to appropriate safeguards and notice where required. We will not give another
          company your private journal for its independent advertising use without your permission.
        </p>
      </Section>

      <Section id="where-processed" title="5. Where information is processed">
        <p>
          Grouv launches in Nigeria but can be used elsewhere. Our providers may store or process information outside
          Nigeria. This includes the region selected for our Supabase database and locations used by our other service
          providers. We use safeguards required by applicable law for international transfers. Contact{" "}
          <Mail to="support@grouv.app" /> with a question about transfers.
        </p>
      </Section>

      <Section id="retention" title="6. How long we keep information">
        <p>
          We keep account and content information while your account is active and as needed to provide the archive you
          choose to maintain. You can delete individual content or request account deletion in the app. After an account
          deletion request, we aim to remove or de-identify remaining account data from our active systems and routine
          backups within <strong className={strong}>three months</strong>, except information that must be retained for
          billing, tax, security, disputes, or other legal reasons and content independently retained by another participant.
        </p>
        <p>
          Some transaction, consent, security, and moderation records may be held for longer where law or a genuine safety
          need requires it. Deleting your account does not necessarily erase copies another user has already made outside
          Grouv.
        </p>
      </Section>

      <Section id="security" title="7. Security">
        <p>
          We use reasonable technical and organizational measures to protect information, including access controls and
          protections provided by our hosting and database services. No online service is completely secure. Keep your
          sign-in details private and report suspected unauthorized access to <Mail to="support@grouv.app" />. We will
          respond to incidents and make notices required by law.
        </p>
      </Section>

      <Section id="your-rights" title="8. Your choices and rights">
        <p>
          You can edit profile details, choose a post&rsquo;s audience, turn off optional device permissions, and request
          access to, correction of, export of, or deletion of your personal information through available app controls or{" "}
          <Mail to="support@grouv.app" />. You may also object to or request restriction of certain processing, withdraw a
          consent you gave, and unsubscribe from marketing emails. Essential security and account messages may still be sent.
        </p>
        <p>
          We may need to verify your identity before fulfilling a request and may retain information where law requires it.
          We will respond within the period required by applicable law. People in Nigeria can complain to the Nigeria Data
          Protection Commission at{" "}
          <a href="https://ndpc.gov.ng/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-500 hover:underline">
            ndpc.gov.ng
          </a>
          . If another country&rsquo;s privacy law applies, you may have additional rights under that law.
        </p>
      </Section>

      <Section id="children" title="9. Children">
        <p>
          Grouv is intended for adults aged 18 or over. We do not knowingly allow a child to create an account. If you believe
          a child has provided personal information, contact <Mail to="support@grouv.app" /> so we can investigate and take
          appropriate action.
        </p>
      </Section>

      <Section id="changes" title="10. Changes and contact">
        <p>
          We will update this policy if our practices change, including if we add AI, new payment methods, or new data uses.
          For a material change, we will notify users through the app, email, or another appropriate method before it takes
          effect where required. We will identify when a revised policy takes effect.
        </p>
        <ContactList
          rows={[
            ["Privacy and support", <Mail key="s" to="support@grouv.app" />],
            ["General enquiries", <Mail key="i" to="info@grouv.app" />],
            ["Location", "Lagos, Nigeria"],
          ]}
        />
      </Section>
    </LegalPage>
  );
}
