"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startTrial } from "@/app/(app)/settings/actions";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import type { PaywallReason } from "@/components/app/pass/PaywallProvider";
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  StatusCard,
  TextAction,
  Tick,
  longDate,
  shortDate,
} from "@/components/app/pass/PassStatus";
import { BILLING_ON, usePassOffer, usePurchase } from "@/components/app/pass/usePassOffer";
import { Button } from "@/components/ui/Button";
import { Modal, ModalClose, ModalHeader } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { restorePurchase } from "@/lib/pass-actions";
import { PLAN_NAMES, type PassOffer, type PassPlan, type PlanKind } from "@/lib/revenuecat-client";
import { cn } from "@/lib/cn";

/** Figma's four "Every Season Pass unlocks" lines, with the PRD's eight Spaces. */
export const PASS_FEATURES = [
  "All eight Spaces active at once",
  "Enhanced Bonds with shared reflection prompts",
  "Weekly & monthly Life Wrapped recaps",
  "Chapter keepsakes to save, export or share",
];

/** One line on what they just tried to do, above the headline. */
const REASON: Record<PaywallReason, string | null> = {
  general: null,
  invite_bond: "New Bonds are part of Season Pass.",
  bond_log: "Bond Log is part of Season Pass.",
  wrapped: "Life Wrapped is part of Season Pass.",
  space_limit: "Free keeps four Spaces active. Season Pass keeps all eight.",
  create_group: "Creating a Chapter Group is part of Season Pass.",
  keepsake: "Chapter keepsakes are part of Season Pass.",
  discovery: "Stage, intent and distance filters are part of Season Pass.",
  journal_media: "Photos, voice and video entries are part of Season Pass.",
};

type Step = "choose" | "confirmTrial" | "ineligible" | "checkout" | "pending" | "success" | "failure";

/**
 * The Season Pass paywall — Figma 1546:777 (Founding selected), 1546:853
 * (Monthly), 1546:929 (Weekly), 1547:777 (Founding fully claimed) — and its
 * purchase states 1548:777 trial confirm, 1548:798 pending, 1548:804 success,
 * 1548:823 failure, 1548:843 trial ineligible. Figma's "7-day" copy is the
 * PRD's 14 days.
 */
export function Paywall({
  reason,
  initialPlan,
  onClose,
}: {
  reason: PaywallReason;
  initialPlan?: PlanKind;
  onClose: () => void;
}) {
  const viewer = useViewer();
  const router = useRouter();
  const toast = useToast();
  const offer = usePassOffer(viewer.id);
  const purchase = usePurchase(viewer.id, viewer.email);
  const [picked, setPicked] = useState<PlanKind | null>(initialPlan ?? null);
  const [step, setStep] = useState<Step>("choose");
  const [paidUntil, setPaidUntil] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [restoring, startRestoring] = useTransition();
  const [trialing, startTrialing] = useTransition();

  const plans = offer ? ([offer.founding, offer.monthly, offer.weekly].filter(Boolean) as PassPlan[]) : [];
  const selected =
    plans.find((p) => p.kind === picked) ?? offer?.founding ?? offer?.monthly ?? offer?.weekly ?? null;
  // One trial per account: anyone who has had Grouv's trial can't take the
  // Weekly plan's free days as well.
  const weeklyTrial = offer?.weekly?.trialDays ? offer.weekly.trialDays : null;
  const trialEligible = viewer.trialAvailable;

  const buy = async (plan: PassPlan) => {
    // RevenueCat's own checkout opens over this step; backing out of it
    // returns here.
    setStep("checkout");
    setPaying(true);
    const outcome = await purchase(plan, () => setStep("pending"));
    setPaying(false);
    if (outcome.kind === "cancelled") return setStep("checkout");
    if (outcome.kind === "failed") return setStep("failure");
    setPaidUntil(outcome.trialEnd ?? outcome.currentPeriodEnd);
    if (outcome.syncError) toast({ title: outcome.syncError, tone: "info" });
    setStep("success");
  };

  const continueWith = (plan: PassPlan) => {
    if (plan.kind === "weekly" && weeklyTrial) {
      setStep(trialEligible ? "confirmTrial" : "ineligible");
      return;
    }
    setStep("checkout");
  };

  const restore = () =>
    startRestoring(async () => {
      const result = await restorePurchase();
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      toast({ title: "Purchase restored — welcome back", tone: "confirm" });
      onClose();
    });

  const startFreeTrial = () =>
    startTrialing(async () => {
      const result = await startTrial();
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      toast({ title: "Your 14-day trial has started", tone: "confirm" });
      onClose();
    });

  if (step !== "choose") {
    return (
      <Modal label="Season Pass" onClose={step === "pending" ? () => {} : onClose} width="max-w-[480px]">
        {step === "confirmTrial" && selected && (
          <StatusCard
            icon={<ClockIcon />}
            title={`Start your ${weeklyTrial ?? 14}-day free trial?`}
            actions={
              <>
                <Button size="md" fullWidth onClick={() => setStep("checkout")}>
                  Start my trial
                </Button>
                <TextAction onClick={() => setStep("choose")}>Not now</TextAction>
              </>
            }
            footnote="You can cancel anytime in Settings before your trial ends."
          >
            You&rsquo;re not charged today. On day {weeklyTrial ?? 14} we&rsquo;ll start billing{" "}
            {offer?.weekly?.price}/week unless you cancel before then.
          </StatusCard>
        )}

        {step === "ineligible" && (
          <StatusCard
            icon={<AlertCircleIcon />}
            tone="neutral"
            title="You’ve already used a free trial"
            actions={
              <>
                <Button
                  size="md"
                  fullWidth
                  onClick={() => {
                    setPicked(offer?.founding ? "founding" : "monthly");
                    setStep("choose");
                  }}
                >
                  {offer?.founding ? "See Monthly & Founding options" : "See Monthly"}
                </Button>
                <TextAction onClick={onClose}>Continue with Free</TextAction>
              </>
            }
          >
            This account has already used a Season Pass trial. You can still get full access with Monthly
            {offer?.founding ? " or the Founding year" : ""}.
          </StatusCard>
        )}

        {step === "checkout" && selected && (
          <Checkout
            plan={selected}
            trialDays={selected.kind === "weekly" ? weeklyTrial : null}
            paying={paying}
            onPay={() => void buy(selected)}
            onCancel={() => setStep("choose")}
          />
        )}

        {step === "pending" && (
          <StatusCard icon={<ClockIcon />} tone="neutral" title="Setting up your Season Pass…">
            This only takes a moment. Don&rsquo;t close the app.
          </StatusCard>
        )}

        {step === "success" && selected && (
          <StatusCard
            icon={<CheckCircleIcon />}
            tone="success"
            title="You’re in."
            actions={
              <>
                <Button
                  size="md"
                  fullWidth
                  onClick={() => {
                    onClose();
                    router.refresh();
                  }}
                >
                  Start exploring
                </Button>
                <Link
                  href="/settings/subscription"
                  onClick={onClose}
                  className="rounded-pill px-4 py-2.5 font-ui text-sm font-medium text-primary-800 hover:bg-primary-50"
                >
                  View subscription details
                </Link>
              </>
            }
          >
            <p>
              {selected.kind === "weekly" && weeklyTrial
                ? `Your ${weeklyTrial}-day free trial is active. Full access is unlocked across every Space.`
                : `Your ${PLAN_NAMES[selected.kind]} is active. Full access is unlocked across every Space.`}
            </p>
            <div className="mt-5 flex flex-col gap-0.5 rounded-xl bg-ivory-100 px-4 py-3">
              <span className="font-sans text-sm font-semibold text-ink-800">
                {PLAN_NAMES[selected.kind]}
                {selected.kind === "weekly" && weeklyTrial ? " - Trial" : ""}
              </span>
              {paidUntil && (
                <span className="font-sans text-xs text-ink-300">
                  {selected.kind === "weekly" && weeklyTrial
                    ? `First charge: ${selected.price} on ${longDate(paidUntil)}. Cancel anytime before then.`
                    : `Renews at ${selected.price}/${selected.unit} on ${shortDate(paidUntil)}`}
                </span>
              )}
            </div>
          </StatusCard>
        )}

        {step === "failure" && (
          <StatusCard
            icon={<AlertCircleIcon />}
            tone="danger"
            title="We couldn’t complete this"
            actions={
              <>
                <Button size="md" fullWidth onClick={() => selected && buy(selected)}>
                  Try again
                </Button>
                <TextAction onClick={onClose}>Cancel</TextAction>
              </>
            }
          >
            Something went wrong charging your card. You have not been charged. Let&rsquo;s try again.
          </StatusCard>
        )}
      </Modal>
    );
  }

  const lead = REASON[reason];

  return (
    <Modal label="Season Pass" onClose={onClose}>
      <div className="-mb-2 flex justify-end">
        <ModalClose onClose={onClose} className="-mt-3 -mr-3" />
      </div>

      <header className="flex flex-col gap-4">
        {(lead || viewer.trialEndsAt) && (
          <p className="font-sans text-sm font-medium text-primary-700">
            {lead}
            {viewer.subscriptionStatus === "trialing" && viewer.trialEndsAt && (
              <> Your trial runs until {longDate(viewer.trialEndsAt)}.</>
            )}
            {viewer.subscriptionStatus === "expired" && viewer.trialEndsAt && (
              <> Your trial ended on {longDate(viewer.trialEndsAt)}.</>
            )}
          </p>
        )}
        <h2 className="font-display text-2xl leading-tight font-semibold text-ink-800 lg:text-3xl">
          Meet your right-now people.
          <br />
          Remember your chapters.
        </h2>
        <div className="flex flex-col gap-2">
          <span className="font-sans text-sm text-ink-300">Every Season Pass unlocks:</span>
          <ul className="flex flex-col gap-1.5">
            {PASS_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 font-sans text-sm text-ink-400">
                <Tick />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {offer === undefined ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
          ))}
        </div>
      ) : offer === null || plans.length === 0 ? (
        <p className="rounded-xl bg-ivory-100 px-4 py-3 font-sans text-sm text-ink-400">
          Season Pass plans open soon.
          {viewer.trialAvailable && " Until then, your free 14-day trial unlocks everything."}
        </p>
      ) : (
        <>
          <PlanList offer={offer} selected={selected} onPick={setPicked} weeklyTrial={weeklyTrial} />
          {selected && <DueToday plan={selected} weeklyTrial={weeklyTrial} />}
        </>
      )}

      <div className="flex flex-col items-center gap-2">
        {selected && (
          <Button size="md" fullWidth onClick={() => continueWith(selected)}>
            {selected.kind === "founding"
              ? "Get my founding year"
              : selected.kind === "monthly"
                ? "Get monthly plan"
                : weeklyTrial
                  ? `Start my ${weeklyTrial}-day trial`
                  : "Continue weekly"}
          </Button>
        )}
        {viewer.trialAvailable && (
          <Button variant={selected ? "secondary" : "primary"} size="md" fullWidth loading={trialing} onClick={startFreeTrial}>
            Start my free 14-day trial — no card
          </Button>
        )}
        <TextAction onClick={onClose}>Continue with Free</TextAction>
        <p className="flex items-center gap-2 font-sans text-xs text-ink-300">
          {BILLING_ON && (
            <>
              <button type="button" onClick={restore} disabled={restoring} className="hover:text-ink-500 hover:underline">
                {restoring ? "Restoring…" : "Restore purchase"}
              </button>
              <span aria-hidden="true">·</span>
            </>
          )}
          <Link href="/terms" onClick={onClose} className="hover:text-ink-500 hover:underline">
            Terms
          </Link>
          <span aria-hidden="true">·</span>
          <Link href="/privacy" onClick={onClose} className="hover:text-ink-500 hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </Modal>
  );
}

/** The three radio cards; Founding greys out once fully claimed (1547:777). */
function PlanList({
  offer,
  selected,
  onPick,
  weeklyTrial,
}: {
  offer: PassOffer;
  selected: PassPlan | null;
  onPick: (kind: PlanKind) => void;
  weeklyTrial: number | null;
}) {
  const saving =
    offer.founding && offer.monthly
      ? Math.round((1 - offer.founding.firstPriceMicros / (offer.monthly.priceMicros * 12)) * 100)
      : 0;

  return (
    <div role="radiogroup" aria-label="Season Pass plans" className="flex flex-col gap-3">
      {offer.founding ? (
        <PlanCard
          plan={offer.founding}
          checked={selected?.kind === "founding"}
          onPick={onPick}
          badge={<span className="rounded-pill bg-primary-500 px-2 py-0.5 font-sans text-[11px] font-medium text-white uppercase">Founding offer</span>}
          price={`${offer.founding.firstPrice} for your first year`}
          body="Full Season Pass access for 12 months."
          extra={
            <span className="flex flex-wrap items-center gap-2 font-sans text-xs text-ink-300">
              Planned renewal: {offer.founding.price}/year after your first year.
              {saving > 0 && (
                <span className="rounded-pill bg-primary-100 px-2 py-0.5 font-medium text-primary-700">Save {saving}%</span>
              )}
            </span>
          }
        />
      ) : (
        <div className="flex flex-col gap-1 rounded-xl bg-ivory-100 px-4 py-3.5 ring-1 ring-ivory-600">
          <span className="flex items-center justify-between gap-3">
            <span className="font-sans text-base font-medium text-ink-300">{PLAN_NAMES.founding}</span>
            <span className="rounded-pill bg-ivory-300 px-2 py-0.5 font-sans text-[11px] font-medium text-ink-400 uppercase">
              Fully claimed
            </span>
          </span>
          <span className="font-sans text-xs text-ink-300">All founding spots for this offer have been claimed.</span>
        </div>
      )}
      {offer.monthly && (
        <PlanCard
          plan={offer.monthly}
          checked={selected?.kind === "monthly"}
          onPick={onPick}
          price={`${offer.monthly.price}/month`}
          body="Full Season Pass access, billed monthly."
        />
      )}
      {offer.weekly && (
        <PlanCard
          plan={offer.weekly}
          checked={selected?.kind === "weekly"}
          onPick={onPick}
          price={weeklyTrial ? `${weeklyTrial} days free, then ${offer.weekly.price}/week` : `${offer.weekly.price}/week`}
          body={weeklyTrial ? "Full Season Pass access. Trial for eligible new subscribers." : "Full Season Pass access, billed weekly."}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  checked,
  onPick,
  badge,
  price,
  body,
  extra,
}: {
  plan: PassPlan;
  checked: boolean;
  onPick: (kind: PlanKind) => void;
  badge?: React.ReactNode;
  price: string;
  body: string;
  extra?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={() => onPick(plan.kind)}
      className={cn(
        "flex flex-col gap-1 rounded-xl px-4 py-3.5 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600",
        checked ? "bg-primary-50 ring-2 ring-primary-500" : "bg-surface ring-1 ring-ivory-600 hover:bg-ivory-100",
      )}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5">
          <span
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded-full border",
              checked ? "border-primary-500 bg-primary-500" : "border-ink-100 bg-surface",
            )}
            aria-hidden="true"
          >
            {checked && <span className="size-1.5 rounded-full bg-white" />}
          </span>
          <span className="font-sans text-base font-medium text-ink-800">{PLAN_NAMES[plan.kind]}</span>
        </span>
        {badge}
      </span>
      <span className="font-display text-lg font-semibold text-ink-800">{price}</span>
      <span className="font-sans text-sm text-ink-400">{body}</span>
      {extra}
    </button>
  );
}

function DueToday({ plan, weeklyTrial }: { plan: PassPlan; weeklyTrial: number | null }) {
  const trial = plan.kind === "weekly" && weeklyTrial;
  const zero = new Intl.NumberFormat("en-US", { style: "currency", currency: plan.pkg.webBillingProduct.price.currency }).format(0);
  const then =
    plan.kind === "founding"
      ? `Then ${plan.price}/year, auto-renews yearly. Cancel anytime before renewal.`
      : trial
        ? `Then ${plan.price}/week after your ${weeklyTrial}-day trial, auto-renews weekly. Cancel anytime.`
        : `Then ${plan.price}/${plan.unit}, auto-renews ${plan.unit === "month" ? "monthly" : plan.unit === "week" ? "weekly" : "yearly"}. Cancel anytime.`;

  return (
    <div className="flex flex-col gap-1 rounded-xl bg-ivory-100 px-4 py-3">
      <span className="flex items-center justify-between gap-3 font-sans text-sm">
        <span className="text-ink-400">Due today</span>
        <span className="font-semibold text-ink-800">{trial ? zero : plan.firstPrice}</span>
      </span>
      <span className="font-sans text-xs text-ink-300">{then}</span>
      {trial && <span className="font-sans text-xs text-primary-700">Your trial starts only after you confirm on the next step.</span>}
    </div>
  );
}

/** "Oct 7, 2026" — days from now, for the first charge after a trial. */
const inDays = (days: number) => shortDate(new Date(Date.now() + days * 86_400_000).toISOString());

/**
 * "Add payment method" — Figma 1564:23122 (Trial, Weekly), 1564:23212
 * (Monthly), 1564:23299 (Founding); phone 1801:37106/37169/37202. Figma draws
 * a card form, but RevenueCat Web Billing collects the card itself (we never
 * see card numbers), so this step keeps Figma's summary, security note and
 * pay button, and the button opens RevenueCat's secure checkout.
 */
function Checkout({
  plan,
  trialDays,
  paying,
  onPay,
  onCancel,
}: {
  plan: PassPlan;
  trialDays: number | null;
  paying: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  const zero = new Intl.NumberFormat("en-US", { style: "currency", currency: plan.pkg.webBillingProduct.price.currency }).format(0);
  const summary = trialDays
    ? `You won't be charged today. We'll bill ${plan.price}/week automatically starting ${inDays(trialDays)}, you can cancel anytime before then.`
    : plan.kind === "founding"
      ? `You'll be charged ${plan.firstPrice} today for your founding year, then ${plan.price}/year automatically starting ${inDays(365)} — cancel anytime before renewal.`
      : `You'll be charged ${plan.firstPrice} today, then ${plan.price}/${plan.unit} automatically until you cancel.`;

  return (
    <div className="flex flex-col gap-5">
      <ModalHeader title="Add payment method" onClose={onCancel} />
      <p className="flex items-start gap-2.5 rounded-xl bg-primary-50 px-4 py-3.5 font-sans text-sm text-primary-700">
        <CardIcon />
        {summary}
      </p>
      <div className="flex flex-col gap-1">
        <span className="font-sans text-base font-semibold text-ink-800">{PLAN_NAMES[plan.kind]}</span>
        <span className="font-sans text-sm text-ink-400">
          You&rsquo;ll enter your card on our secure checkout next. Visa, Mastercard &amp; Amex accepted.
        </span>
      </div>
      <p className="flex items-center gap-2 font-sans text-xs text-ink-300">
        <LockIcon />
        Payments are encrypted and processed securely. We never store your full card number.
      </p>
      <div className="flex flex-col items-stretch gap-2">
        <Button size="md" fullWidth loading={paying} onClick={onPay}>
          {trialDays ? `Start my trial — ${zero} due today` : `Pay ${plan.firstPrice} & subscribe`}
        </Button>
        <TextAction onClick={onCancel}>Cancel</TextAction>
      </div>
    </div>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-0.5 size-4 shrink-0" aria-hidden="true">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 8h15M5.5 12.5h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4 shrink-0" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}
