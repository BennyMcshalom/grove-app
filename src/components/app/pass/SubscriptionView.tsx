"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { billingManagementUrl, startTrial } from "@/app/(app)/settings/actions";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  StatusModal,
  TextAction,
  Tick,
  WarningIcon,
  longDate,
} from "@/components/app/pass/PassStatus";
import { usePaywall, useSpaceChooser } from "@/components/app/pass/PaywallProvider";
import { BILLING_ON, usePassOffer } from "@/components/app/pass/usePassOffer";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { restorePurchase } from "@/lib/pass-actions";
import { PLAN_NAMES, planKindOf, type PassOffer, type PlanKind } from "@/lib/revenuecat-client";

export interface SubscriptionInfo {
  status: "none" | "trialing" | "active" | "past_due" | "canceled" | "expired";
  /** RevenueCat product id, or "full" for the in-app trial. */
  plan: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Where a RevenueCat plan was bought; null if they've never had one. */
  store: string | null;
  /** A referral month runs until then. */
  bonusUntil: string | null;
  hasPass: boolean;
  billingEnabled: boolean;
  /** Server time, so "days left" renders the same on both sides. */
  now: number;
}

type State = "free" | "trial" | "bonus" | "active" | "canceled" | "payfailed" | "expired" | "restored";

function stateOf(s: SubscriptionInfo): State {
  const paid = s.store !== null;
  if (s.hasPass) {
    if (paid && s.status === "past_due") return "payfailed";
    if (paid && (s.cancelAtPeriodEnd || s.status === "canceled")) return "canceled";
    if (paid && (s.status === "active" || s.status === "trialing")) return "active";
    // A granted month that outlasts the trial is the pass they really have.
    const bonusLive = s.bonusUntil !== null && Date.parse(s.bonusUntil) > s.now;
    if (s.status === "trialing" && !bonusLive) return "trial";
    return "bonus";
  }
  return s.trialStartedAt || paid || s.status === "expired" || s.status === "canceled" ? "expired" : "free";
}

const STORES: Record<string, string> = {
  rc_billing: "Card, through Grouv web billing",
  stripe: "Card, through Grouv web billing",
  app_store: "App Store",
  play_store: "Google Play",
  promotional: "Complimentary",
};

const UNLOCKED = [
  "All eight Spaces active at once",
  "Enhanced Bonds & shared reflection prompts",
  "Weekly & monthly Life Wrapped",
  "Chapter keepsakes & Wrapped sharing",
];

/** Figma's "What's included" on a plan card (1565:23291…); Spaces, not chapters, per the PRD. */
const INCLUDED = [
  "All eight Spaces active at once",
  "Advanced people discovery & matching preferences",
  "Enhanced Bonds, shared Bond Logs & reflection prompts",
  "Richer private journals with voice, photos & videos",
  "Weekly, monthly & completed-chapter Life Wrapped",
  "Styled Chapter keepsakes & Wrapped sharing or export",
];

/**
 * Settings → Subscription. Figma 1545:22030 (Free: plan comparison),
 * 1549:777 (Active), 1549:1153 (Canceled, still active), 1550:777 (Expired),
 * 1550:1153 (Payment failed), 1550:1296 (Purchase restored), 1550:22879
 * (cancel confirmation), and the PRD's post-founding layout (Monthly primary
 * once Founding is fully claimed). The in-app trial shows its exact end date;
 * a granted month reads like a paid pass ("You're on Season Pass"), without
 * an end date or a "move to Free".
 *
 * Cancel, reactivate and payment details go through RevenueCat's customer
 * portal (the management URL): Web Billing plans can only be changed there.
 * RevenueCat doesn't share card details with the app, so "Payment method"
 * says where it's billed instead of "Visa •••• 4242".
 */
export function SubscriptionView({ info }: { info: SubscriptionInfo }) {
  const viewer = useViewer();
  const toast = useToast();
  const router = useRouter();
  const paywall = usePaywall();
  const chooseSpaces = useSpaceChooser();
  const offer = usePassOffer(viewer.id);
  const [restored, setRestored] = useState(false);
  const [confirm, setConfirm] = useState<"cancel" | "cancelTrial" | "change" | null>(null);
  const [busy, startBusy] = useTransition();
  const [trialPending, startTrialPending] = useTransition();

  // Restored shows its banner over the plan as it now stands (Figma 1566:33736).
  const base = stateOf(info);
  const state: State = restored && base === "active" ? "restored" : base;
  // A paid plan still in its free days — the Weekly plan's trial (1565:23291).
  const paidTrial = info.store !== null && info.status === "trialing" && info.trialEndsAt !== null;
  const bonusLive = info.bonusUntil !== null && Date.parse(info.bonusUntil) > info.now;
  const kind = planKindOf(info.plan, offer);
  const planName = kind ? PLAN_NAMES[kind] : "Season Pass";
  const price = priceFor(kind, offer);
  // "Your next payment is $69 on 3 March" — only for a paid plan that renews.
  const renews = state === "active" && info.status === "active" && !info.cancelAtPeriodEnd ? info.currentPeriodEnd : null;
  const nextPrice = kind && offer ? (offer[kind]?.price ?? null) : null;
  const paused = viewer.chapters.filter((c) => c.pausedAt).length;

  const openBilling = () =>
    startBusy(async () => {
      const result = await billingManagementUrl();
      if (result.error || !result.url) {
        toast({ title: result.error ?? "We couldn't open billing. Try again.", tone: "danger" });
        return;
      }
      window.location.assign(result.url);
    });

  const restore = () =>
    startBusy(async () => {
      const result = await restorePurchase();
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      setRestored(true);
      router.refresh();
    });

  const startFreeTrial = () =>
    startTrialPending(async () => {
      const result = await startTrial();
      toast(
        result.error
          ? { title: result.error, tone: "danger" }
          : { title: "Your 14-day trial has started", tone: "confirm" },
      );
    });

  const daysLeft = (iso: string | null) =>
    iso ? Math.max(0, Math.ceil((Date.parse(iso) - info.now) / 86_400_000)) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Subscription" back="/settings" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-5 pb-10">
          {state === "restored" && (
            <Banner tone="success" icon title="Purchase restored, welcome back">
              Your Season Pass is active again. Everything you had unlocked is back.
            </Banner>
          )}
          {state === "canceled" && info.currentPeriodEnd && (
            <Banner tone="warning" title={`Canceled — access continues until ${longDate(info.currentPeriodEnd)}`}>
              After that date you&rsquo;ll return to Free. Your existing memories always stay with you.
            </Banner>
          )}
          {state === "payfailed" && (
            <Banner tone="danger" title="We couldn’t renew your plan">
              Your last payment didn&rsquo;t go through.
              {info.currentPeriodEnd
                ? ` Update your payment method by ${longDate(info.currentPeriodEnd)} to keep your Season Pass.`
                : " Update your payment method to keep your Season Pass."}
            </Banner>
          )}
          {state === "expired" && (
            <Banner
              tone="neutral"
              title={
                info.store && info.currentPeriodEnd
                  ? `Your Season Pass ended on ${longDate(info.currentPeriodEnd)}`
                  : info.trialEndsAt
                    ? `Your Season Pass trial ended on ${longDate(info.trialEndsAt)}`
                    : "Your Season Pass has ended"
              }
            >
              You&rsquo;re back on Free. Messaging, block, report, and your existing memories stay available.
            </Banner>
          )}
          {state === "trial" && info.trialEndsAt && (
            <Banner tone="primary" title={`Your Season Pass trial ends on ${longDate(info.trialEndsAt)}`}>
              {daysLeft(info.trialEndsAt)} {daysLeft(info.trialEndsAt) === 1 ? "day" : "days"} left. All eight Spaces,
              Bonds, Bond Log and Life Wrapped are open to you — choose a plan to keep them going.
            </Banner>
          )}
          {/* Granted or paid, it reads the same: no end date, no "move to Free"
              (testing feedback, 6 Oct). Only a real renewal shows a payment. */}
          {(state === "bonus" || (state === "active" && info.status === "active")) && (
            <Banner tone="primary" title="You’re on Season Pass">
              Your subscription is active. Enjoy everything included in your plan.
              {renews &&
                (nextPrice ? (
                  <>
                    {" "}
                    Your next payment is{" "}
                    <strong className="font-semibold text-ink-700">
                      {nextPrice} on {longDate(renews)}
                    </strong>
                    .
                  </>
                ) : (
                  <> Your plan renews on {longDate(renews)}.</>
                ))}
            </Banner>
          )}

          {(state === "active" || state === "restored") && (
            <Card>
              {paidTrial && info.trialEndsAt ? (
                <PlanHeader name={planName} chip="Trial" chipTone="warning" price={`Free until ${monthDay(info.trialEndsAt)}`} />
              ) : (
                <PlanHeader name={planName} chip="Active" chipTone="success" price={price} />
              )}
              <Divider />
              <Rows>
                {paidTrial && info.trialEndsAt ? (
                  <DetailRow label="Trial ends" value={longDate(info.trialEndsAt)} />
                ) : (
                  <>
                    {bonusLive && info.bonusUntil && (
                      <DetailRow label="Referral reward" value={`Applied until ${longDate(info.bonusUntil)}`} />
                    )}
                    <DetailRow label="Renews on" value={info.currentPeriodEnd ? longDate(info.currentPeriodEnd) : "—"} />
                  </>
                )}
                {info.store && <DetailRow label="Payment method" value={STORES[info.store] ?? info.store} />}
                {paidTrial && info.trialEndsAt && nextPrice && (
                  <DetailRow label="First charge" value={`${nextPrice} on ${longDate(info.trialEndsAt)}`} />
                )}
              </Rows>
              <Divider />
              <Included />
              <Divider />
              <div className="flex flex-col items-stretch gap-2">
                <Button variant="secondary" size="md" fullWidth loading={busy} onClick={openBilling}>
                  Manage payment method
                </Button>
                {paidTrial ? (
                  <TextAction tone="danger" onClick={() => setConfirm("cancelTrial")}>
                    Cancel before trial ends
                  </TextAction>
                ) : (
                  <div className="flex flex-wrap justify-center gap-2">
                    <TextAction onClick={() => setConfirm("change")}>Change plan</TextAction>
                    <TextAction tone="danger" onClick={() => setConfirm("cancel")}>
                      Cancel season plan
                    </TextAction>
                  </div>
                )}
              </div>
            </Card>
          )}

          {state === "canceled" && (
            <Card>
              <PlanHeader name={planName} chip="Canceled" chipTone="muted" price={null} muted />
              <Rows>
                <DetailRow label="Access ends" value={info.currentPeriodEnd ? longDate(info.currentPeriodEnd) : "—"} />
                {info.store && (
                  <DetailRow label="Payment method" value={`${STORES[info.store] ?? info.store} (won’t be charged again)`} />
                )}
              </Rows>
              <Divider />
              <Included />
              <Divider />
              <Button size="md" fullWidth loading={busy} onClick={openBilling}>
                Reactivate Season Pass
              </Button>
              <Footnote>
                {kind === "founding"
                  ? "Changed your mind? Reactivating keeps your founding renewal price."
                  : `Changed your mind? Reactivate before ${info.currentPeriodEnd ? longDate(info.currentPeriodEnd) : "your plan ends"}.`}
              </Footnote>
            </Card>
          )}

          {state === "payfailed" && (
            <Card>
              <PlanHeader name={planName} chip="Payment failed" chipTone="danger" price={null} />
              <Rows>
                <DetailRow label="Access ends unless updated" value={info.currentPeriodEnd ? longDate(info.currentPeriodEnd) : "—"} />
                {info.store && <DetailRow label="Payment method on file" value={`${STORES[info.store] ?? info.store} (declined)`} />}
              </Rows>
              <Divider />
              <Included />
              <Divider />
              <Button size="md" fullWidth loading={busy} onClick={openBilling}>
                Update payment method
              </Button>
              <TextAction className="self-center" onClick={() => router.push("/settings")}>
                Not now
              </TextAction>
              <Footnote>Your existing memories always stay with you, even if access pauses.</Footnote>
            </Card>
          )}

          {state === "expired" && (
            <Card>
              <h2 className="font-display text-xl font-semibold text-ink-800">Free plan</h2>
              <ListBlock title="Now paused">
                {["More than four active Spaces", ...UNLOCKED.slice(1)].map((line) => (
                  <li key={line} className="flex items-center gap-2.5 font-sans text-sm text-ink-300">
                    <span className="h-px w-3 shrink-0 bg-ink-200" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ListBlock>
              <ListBlock title="Still yours">
                {[
                  "Four active Spaces & your profile",
                  "All your existing saved memories",
                  "Private text journaling",
                  "Privacy, blocking, reporting & account controls",
                ].map((line) => (
                  <li key={line} className="flex items-center gap-2.5 font-sans text-sm text-ink-400">
                    <Tick className="text-success-60" />
                    {line}
                  </li>
                ))}
              </ListBlock>
              <div className="flex flex-col items-stretch gap-2">
                <Button size="md" fullWidth onClick={() => paywall("general")}>
                  Resubscribe to Season Pass
                </Button>
                {/* Once locked in, the four can't be swapped on Free. */}
                {paused > 0 && !viewer.spacesLocked && (
                  <Button variant="secondary" size="md" fullWidth onClick={() => chooseSpaces()}>
                    Choose which Spaces stay active
                  </Button>
                )}
                <TextAction className="self-center" onClick={() => router.push("/settings")}>
                  Continue with Free
                </TextAction>
              </div>
            </Card>
          )}

          {(state === "free" || state === "trial" || state === "bonus") && (
            <>
              {state === "free" && offer?.foundingSoldOut && offer.monthly && (
                <Card>
                  <div className="flex flex-col gap-1.5">
                    <span className="font-sans text-xs font-medium tracking-wide text-ink-300 uppercase">
                      Founding offer has ended
                    </span>
                    <h2 className="font-display text-xl font-semibold text-ink-800">
                      Choose Monthly{offer.weekly ? " or Weekly" : ""}
                    </h2>
                    <p className="font-sans text-sm text-ink-400">
                      Founding spots are full for now. Monthly{offer.weekly ? " and Weekly give" : " gives"} you everything
                      else Season Pass includes.
                    </p>
                  </div>
                  <Button size="md" className="self-start" onClick={() => paywall("general", { plan: "monthly" })}>
                    Choose Monthly · {offer.monthly.price}/mo
                  </Button>
                </Card>
              )}
              <Comparison
                current={state === "free" ? "free" : "pass"}
                trialAvailable={viewer.trialAvailable}
                trialPending={trialPending}
                onPlans={() => paywall("general")}
                onTrial={startFreeTrial}
                // A granted pass has no end date on show, so no "after it ends".
                passCta={state === "bonus" ? "See Season Pass plans" : undefined}
              />
            </>
          )}

          {BILLING_ON && info.billingEnabled && state !== "restored" && (
            <TextAction className="self-center" disabled={busy} onClick={restore}>
              Restore purchase
            </TextAction>
          )}
        </div>
      </div>

      {confirm === "cancel" && (
        <StatusModal
          label="Cancel Season Pass"
          onClose={() => setConfirm(null)}
          icon={<WarningIcon />}
          tone="warning"
          title="Cancel your Season Pass?"
          actions={
            <>
              <Button size="md" fullWidth onClick={() => setConfirm(null)}>
                Keep my plan
              </Button>
              <TextAction tone="danger" disabled={busy} onClick={openBilling}>
                Cancel plan
              </TextAction>
            </>
          }
        >
          You&rsquo;ll keep full access until {info.currentPeriodEnd ? longDate(info.currentPeriodEnd) : "your plan period ends"}.
          After that you&rsquo;ll return to Free and keep your existing memories — journaling, saved memories, and safety
          tools always stay available.
        </StatusModal>
      )}
      {/* Figma 1566:34533 / 1801:37812. The trial copy never says "return to
          Free" (the owner's trial rule); cancelling happens in billing. */}
      {confirm === "cancelTrial" && (
        <StatusModal
          label="Cancel free trial"
          onClose={() => setConfirm(null)}
          icon={<WarningIcon />}
          tone="warning"
          title="Cancel your free trial?"
          actions={
            <>
              <Button size="md" fullWidth onClick={() => setConfirm(null)}>
                Keep my trial
              </Button>
              <TextAction tone="danger" disabled={busy} onClick={openBilling}>
                Cancel trial
              </TextAction>
            </>
          }
        >
          You&rsquo;ll keep trial access until {info.trialEndsAt ? longDate(info.trialEndsAt) : "your trial ends"}. You will not
          be charged, and your existing memories always stay with you.
        </StatusModal>
      )}
      {confirm === "change" && (
        <StatusModal
          label="Change plan"
          onClose={() => setConfirm(null)}
          icon={<AlertCircleIcon />}
          tone="neutral"
          title="Switching plans"
          actions={
            <>
              <Button size="md" fullWidth loading={busy} onClick={openBilling}>
                Open billing
              </Button>
              <TextAction onClick={() => setConfirm(null)}>Not now</TextAction>
            </>
          }
        >
          Cancel this plan in billing — you keep full access until{" "}
          {info.currentPeriodEnd ? longDate(info.currentPeriodEnd) : "it ends"} — then choose your new Season Pass here
          once it has ended. You&rsquo;re never charged for two at once.
        </StatusModal>
      )}
    </div>
  );
}

/** "Oct 14" */
const monthDay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function priceFor(kind: PlanKind | null, offer: PassOffer | null | undefined) {
  const plan = kind && offer ? offer[kind] : null;
  return plan ? `${plan.price}/${plan.unit}` : null;
}

/** Free vs Season Pass, side by side from lg (Figma 1545:22030). */
function Comparison({
  current,
  trialAvailable,
  trialPending,
  onPlans,
  onTrial,
  passCta = "Keep Season Pass after it ends",
}: {
  current: "free" | "pass";
  trialAvailable: boolean;
  trialPending: boolean;
  onPlans: () => void;
  onTrial: () => void;
  /** The button under Season Pass when it is theirs. */
  passCta?: string;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      {/* On a phone the plan they have leads; side by side on desktop. */}
      <Card className={current === "pass" ? "order-2 lg:order-1" : undefined}>
        <div className="flex flex-col gap-2">
          <span className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink-800 lg:text-3xl">Free plan</h2>
            {current === "free" && <Chip tone="primary">Current plan</Chip>}
          </span>
          <p className="font-sans text-base text-ink-400">
            {current === "free" ? "You’re on the free plan" : "What Free includes"}
          </p>
        </div>
        <Divider />
        <ListBlock title="What’s included">
          {[
            "Your profile & four active Spaces",
            "All eight Spaces to choose from — Career, Spiritual, Wealth, Adventure, Health, Creative, Learning, Relationships",
            "Public conversations & posting through Just Grouv",
            "Core people discovery, introductions & messaging",
            "Private text journaling, plus your chapter today updates",
            "Access to your existing saved memories",
            "Privacy, blocking, reporting & account-data controls",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5 font-sans text-sm text-ink-400">
              <Tick className="mt-0.5" />
              {line}
            </li>
          ))}
        </ListBlock>
      </Card>

      <Card className={current === "pass" ? "order-1 lg:order-2" : undefined}>
        {/* Figma 1801:42868: a subtitle, then the same ticked list as Free. */}
        <div className="flex flex-col gap-2">
          <span className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-semibold text-ink-800 lg:text-3xl">Season Pass</h2>
            {current === "pass" && <Chip tone="primary">Current plan</Chip>}
          </span>
          <p className="font-sans text-base text-ink-400">
            Unlock more ways to connect, &amp; preserve the moments that matter
          </p>
        </div>
        <Divider />
        <Included />
        <Divider />
        {current === "free" && (
          <div className="flex flex-col items-stretch gap-2">
            <Button size="md" fullWidth onClick={onPlans}>
              See Season Pass plans
            </Button>
            {trialAvailable && (
              <Button variant="secondary" size="md" fullWidth loading={trialPending} onClick={onTrial}>
                Start my 14-day trial instead
              </Button>
            )}
            <Footnote>No payment today. See exactly what changes before you choose a plan.</Footnote>
          </div>
        )}
        {current === "pass" && (
          <Button size="md" fullWidth onClick={onPlans}>
            {passCta}
          </Button>
        )}
      </Card>
    </div>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("flex w-full flex-col gap-5 rounded-lg bg-surface p-5 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] lg:p-6", className)}>
      {children}
    </section>
  );
}

function Banner({
  tone,
  title,
  icon,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral" | "primary";
  title: string;
  icon?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col gap-1 rounded-lg px-4 py-3.5",
        tone === "success" && "bg-success-5 text-success-70",
        tone === "warning" && "bg-warning-5 text-warning-70",
        tone === "danger" && "bg-destructive-5 text-destructive-60",
        tone === "neutral" && "bg-ivory-200 text-ink-800",
        tone === "primary" && "bg-primary-50 text-primary-800",
      )}
    >
      <span className="flex items-center gap-2 font-sans text-sm font-semibold">
        {icon && <CheckCircleIcon className="size-4" />}
        {title}
      </span>
      <span className="font-sans text-xs text-ink-400 lg:text-sm">{children}</span>
    </div>
  );
}

function PlanHeader({
  name,
  chip,
  chipTone,
  price,
  muted = false,
}: {
  name: string;
  chip: string;
  chipTone: "success" | "muted" | "danger" | "warning";
  price: string | null;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex flex-wrap items-center gap-3">
        <h2 className={cn("font-display text-xl font-semibold", muted ? "text-ink-400" : "text-ink-800")}>{name}</h2>
        <Chip tone={chipTone}>{chip}</Chip>
      </span>
      {price && <span className="font-sans text-sm text-ink-300">{price}</span>}
    </div>
  );
}

function Chip({ tone, children }: { tone: "primary" | "success" | "muted" | "danger" | "warning"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-pill px-2 py-0.5 font-sans text-[11px] font-medium uppercase",
        tone === "primary" && "bg-primary-100 text-primary-700",
        tone === "success" && "bg-success-10 text-success-70",
        tone === "muted" && "bg-ivory-300 text-ink-400",
        tone === "danger" && "bg-destructive-10 text-destructive-60",
        tone === "warning" && "bg-warning-10 text-warning-70",
      )}
    >
      {children}
    </span>
  );
}

function Divider() {
  return <hr className="border-ivory-600" />;
}

function Rows({ children }: { children: React.ReactNode }) {
  return <dl className="flex flex-col gap-2">{children}</dl>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-0.5 font-sans text-sm">
      <dt className="text-ink-400">{label}</dt>
      <dd className="text-ink-800">{value}</dd>
    </div>
  );
}

function Included() {
  return (
    <ListBlock title="What’s included">
      {INCLUDED.map((line) => (
        <li key={line} className="flex items-start gap-2.5 font-sans text-sm text-ink-400">
          <Tick className="mt-0.5" />
          {line}
        </li>
      ))}
    </ListBlock>
  );
}

function ListBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-sans text-sm font-medium text-ink-300">{title}</span>
      <ul className="flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function Footnote({ children }: { children: React.ReactNode }) {
  return <p className="font-sans text-xs text-ink-300">{children}</p>;
}
