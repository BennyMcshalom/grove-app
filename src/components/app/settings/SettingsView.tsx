"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Avatar } from "@/components/app/Avatar";
import { ProfileBanner as BannerStrip } from "@/components/app/ProfileBanner";
import { BannerPicker } from "@/components/app/settings/BannerPicker";
import { setSpaceLabelStyle, useSpaceLabelStyle } from "@/components/app/SpaceLabel";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import {
  changePassword,
  changePasswordWithCode,
  passwordStatus,
  sendPasswordCode,
  deleteAccount,
  billingManagementUrl,
  refreshBilling,
  startTrial,
  updatePreferences,
} from "@/app/(app)/settings/actions";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { applyTheme } from "@/lib/theme";
import { isCancelled, planPackage, priceLabel, purchasesFor } from "@/lib/revenuecat-client";
import { AURAS, LOG_VISIBILITY, auraLabel, type LogVisibility } from "@/lib/profile";
import {
  BlockedAccountsCard,
  PrivacyAiCard,
  type BlockedAccount,
  type PrivacySettings,
} from "@/components/app/settings/PrivacySections";

/**
 * Settings — Figma frame 390:13507.
 *
 * A 1096px scrolling column of white 8px cards: the profile banner, then
 * PROFILE / APPEARANCE / ACCOUNT / NOTIFICATION / SUBSCRIPTION / PRIVACY and
 * the danger zone. All labels and helper copy are Figma's (frame 391:14241).
 */
export interface SettingsPrompts {
  honestTension: string | null;
  sittingWith: string | null;
  openTo: string | null;
}

export interface SettingsPreferences {
  theme: "light" | "dark";
  logVisibility: LogVisibility;
  chapterPrompt: boolean;
  waveReceived: boolean;
  emailUpdates: boolean;
}

export interface SettingsBilling {
  /** RevenueCat keys and entitlement are configured. */
  enabled: boolean;
  /** Pre-fills RevenueCat's checkout. */
  email: string | null;
  trialUsed: boolean;
  /** Where their RevenueCat plan was bought; null if they've never had one. */
  store: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** A granted Season Pass (referral or bonus month) runs until then. */
  bonusUntil?: string | null;
}

export function SettingsView({
  prompts,
  preferences,
  isStaff,
  billing,
  privacy = { discoverable: true, activityMatching: true },
  blocked = [],
}: {
  prompts: SettingsPrompts;
  preferences: SettingsPreferences;
  isStaff: boolean;
  billing: SettingsBilling;
  /** Privacy & AI toggles and blocked accounts (PRD §12). */
  privacy?: PrivacySettings;
  blocked?: BlockedAccount[];
}) {
  const toast = useToast();
  const [prefs, setPrefs] = useState(preferences);
  const [changingPassword, setChangingPassword] = useState(false);

  // Optimistic: flip it now, put it back if the save fails. Appearance also
  // repaints the page straight away, rather than waiting for the round trip.
  const savePreference = async (patch: Partial<SettingsPreferences>) => {
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    if (patch.theme) applyTheme(patch.theme);
    const result = await updatePreferences(patch);
    if (result.error) {
      setPrefs(previous);
      if (patch.theme) applyTheme(previous.theme);
      toast({ title: result.error, tone: "danger" });
    }
  };

  const profileFields = [
    { label: "Honest tension", value: prompts.honestTension },
    { label: "Sitting with", value: prompts.sittingWith },
    { label: "Open to", value: prompts.openTo },
  ];

  const notifications = [
    {
      title: "Chapter prompt",
      body: "Weekly reflection nudge",
      on: prefs.chapterPrompt,
      onChange: () => savePreference({ chapterPrompt: !prefs.chapterPrompt }),
    },
    {
      title: "Wave received",
      body: "When someone waves at you nearby",
      on: prefs.waveReceived,
      onChange: () => savePreference({ waveReceived: !prefs.waveReceived }),
    },
    // Locked on in the database too (notification_preferences check).
    { title: "Bond invitation", body: "Always on, required for safety", on: true },
    // Not in Figma: requests and invitations also arrive by email.
    {
      title: "Email updates",
      body: "Requests, invitations and suggestions by email",
      on: prefs.emailUpdates,
      onChange: () => savePreference({ emailUpdates: !prefs.emailUpdates }),
    },
  ];

  const lightMode = prefs.theme === "light";
  const visibility = LOG_VISIBILITY.find((v) => v.value === prefs.logVisibility) ?? LOG_VISIBILITY[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Settings" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col items-center gap-6 pb-10">
          <ProfileBanner />

          <Card>
            <SectionLabel>Profile</SectionLabel>
            <div className="flex flex-col gap-4">
              {profileFields.map((field) => (
                <div key={field.label} className="flex flex-col gap-1.5">
                  <span className="font-sans text-sm font-medium text-ink-500">
                    {field.label}
                  </span>
                  <span
                    className={cn(
                      "rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]",
                      field.value ? "text-ink-400" : "text-ink-200",
                    )}
                  >
                    {field.value ?? "Not shared yet — add it in Edit Profile."}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>Appearance</SectionLabel>
            <Row
              title={lightMode ? "Light Mode" : "Dark Mode"}
              body={lightMode ? "Switch to dark mode" : "Switch to light mode"}
              trailing={
                <Toggle
                  label="Dark mode"
                  on={!lightMode}
                  onChange={() => savePreference({ theme: lightMode ? "dark" : "light" })}
                />
              }
              divider
            />
            <PostLabelsRow />
          </Card>

          <Card>
            <SectionLabel>Account</SectionLabel>
            <Row
              title="Edit Profile"
              body="Make your profile feel more like you."
              href="/settings/edit-profile"
              divider
            />
            <Row
              title="Change password"
              body="Update your password to keep your account secure."
              onClick={() => setChangingPassword(true)}
              divider={isStaff}
            />
            {isStaff && (
              <Row title="Moderation" body="Review what people have reported." href="/moderation" />
            )}
          </Card>

          <Card>
            <SectionLabel>Notification</SectionLabel>
            {notifications.map((row, i) => (
              <Row
                key={row.title}
                title={row.title}
                body={row.body}
                divider={i < notifications.length - 1}
                trailing={
                  <Toggle
                    label={row.title}
                    on={row.on}
                    onChange={row.onChange}
                    disabled={!row.onChange}
                  />
                }
              />
            ))}
          </Card>

          <Card>
            <SectionLabel>Subscription</SectionLabel>
            <SubscriptionRow billing={billing} />
            {/* Plans, dates, restore, cancel (Figma 1545:22030…) and referrals. */}
            <Row
              title="Manage Season Pass"
              body="Compare plans, see your access dates, restore or cancel."
              href="/settings/subscription"
              divider
            />
            <Row
              title="Invite a friend"
              body="Bring someone into their next chapter. Earn a month of Season Pass."
              href="/settings/invite"
            />
          </Card>

          <Card>
            <SectionLabel>Privacy</SectionLabel>
            <Row
              title="Log visibility"
              body={`Who can see your Grouv Log · ${visibility.body}`}
              divider
              trailing={
                <label className="relative shrink-0">
                  <span className="sr-only">Log visibility</span>
                  <select
                    value={prefs.logVisibility}
                    onChange={(e) =>
                      savePreference({ logVisibility: e.target.value as LogVisibility })
                    }
                    className="appearance-none rounded-lg bg-ivory-100 py-2 pr-8 pl-3 font-sans text-sm text-ink-500 outline-none focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
                  >
                    {LOG_VISIBILITY.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <CaretIcon className="pointer-events-none absolute top-1/2 right-1.5 size-5 -translate-y-1/2 rotate-90 text-ink-400" />
                </label>
              }
            />
            <Row
              title="Grouv’s Promise"
              body="Making every season feel a little less alone."
              href="/privacy"
              trailing={<CaretIcon className="size-6 text-ink-400" />}
            />
          </Card>

          <PrivacyAiCard initial={privacy} />
          <BlockedAccountsCard initial={blocked} />

          <DangerZone />

          <div className="flex flex-col items-center">
            <div className="flex gap-2.5">
              <Link href="/privacy" className="rounded-full px-5 py-2 font-sans text-sm text-ink-300 hover:bg-ivory-200">
                Privacy
              </Link>
              <Link href="/terms" className="rounded-full px-5 py-2 font-sans text-sm text-ink-300 hover:bg-ivory-200">
                Terms
              </Link>
              <Link
                href="/privacy"
                className="rounded-full px-5 py-2 font-sans text-sm text-ink-300 hover:bg-ivory-200"
              >
                Our Promise
              </Link>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-full px-5 py-6 font-sans text-sm font-medium text-primary-600 hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {changingPassword && <ChangePasswordModal onClose={() => setChangingPassword(false)} />}
    </div>
  );
}

/**
 * Figma 404:15075 (desktop) / 643:31506 (phone).
 *
 * The avatar hangs off the banner strip — the person's chosen colour or
 * drawn wallpaper (testing feedback, 2 Oct 2026; it was a peach gradient) —
 * with the name and chips below its edge, so they never sit on the art, and
 * the actions to the right on desktop. "Change banner" sits on the strip.
 */
function ProfileBanner() {
  const viewer = useViewer();
  const [picking, setPicking] = useState(false);

  return (
    <section className="relative w-full overflow-hidden rounded-lg bg-surface shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <BannerStrip banner={viewer.banner} seed={viewer.id} className="h-20 lg:h-[107px]" />
      <button
        type="button"
        onClick={() => setPicking(true)}
        className="absolute top-3 right-3 rounded-full bg-surface/90 px-3 py-1.5 font-sans text-xs font-medium text-ink-700 shadow-sm transition-colors hover:bg-surface"
      >
        Change banner
      </button>
      <div className="flex flex-col gap-4 px-5 pb-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="flex min-w-0 items-start gap-4">
          <ProfileIdentity />
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:pt-4">
          <Button size="sm" href="/settings/your-grouv">
            Enter my Grouv
          </Button>
          <Button variant="secondary" size="sm" href="/settings/edit-profile">
            Edit Profile
          </Button>
        </div>
      </div>
      {picking && <BannerPicker banner={viewer.banner} seed={viewer.id} onClose={() => setPicking(false)} />}
    </section>
  );
}

/** Avatar, name, aura chips and location — the same in both layouts. */
function ProfileIdentity() {
  const viewer = useViewer();
  const aura = AURAS.find((a) => a.value === viewer.aura);

  return (
    <>
      <span className="relative -mt-8 size-16 shrink-0 rounded-full">
        <Avatar
          src={viewer.avatarUrl}
          name={viewer.firstName}
          userId={viewer.id}
          aura={viewer.aura}
          sizes="64px"
          className="size-full"
        />
        <span className="absolute right-0 bottom-0 size-4 rounded-full border-[1.5px] border-surface bg-success-60" />
      </span>
      <div className="flex min-w-0 flex-col gap-3 pt-3">
        <span className="font-sans text-base font-semibold text-ink-800">
          {viewer.firstName}
        </span>
        <div className="flex flex-wrap gap-4">
          {viewer.chapters[0] && <Chip>{viewer.chapters[0].phase}</Chip>}
          <Chip dot={aura?.dot}>
            {auraLabel(viewer.aura)}
          </Chip>
        </div>
        {viewer.locationLabel && (
          <span className="flex items-center gap-2 font-sans text-sm font-medium text-ink-400">
            <PinIcon className="size-5" />
            {viewer.locationLabel}
          </span>
        )}
      </div>
    </>
  );
}

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long" });

/**
 * Figma only draws "Start trial". Subscribing opens RevenueCat's checkout over
 * the page; "Manage billing" goes to wherever the plan was bought (RevenueCat's
 * portal for web purchases, or the App Store / Google Play).
 */
function SubscriptionRow({ billing }: { billing: SettingsBilling }) {
  const { id: viewerId, subscriptionStatus, trialEndsAt, hasPass } = useViewer();
  const toast = useToast();
  const [pending, startPending] = useTransition();
  const [price, setPrice] = useState<string | null>(null);

  // The price comes from RevenueCat's current offering.
  useEffect(() => {
    if (!billing.enabled) return;
    let live = true;
    purchasesFor(viewerId)
      .then(planPackage)
      .then((pkg) => {
        if (live && pkg) setPrice(priceLabel(pkg));
      })
      .catch((error: unknown) => console.warn("[billing] couldn't load the plan price", error));
    return () => {
      live = false;
    };
  }, [billing.enabled, viewerId]);

  const subscribeNow = () =>
    startPending(async () => {
      try {
        const purchases = await purchasesFor(viewerId);
        const pkg = await planPackage(purchases);
        if (!pkg) {
          toast({ title: "The plan isn't available right now. Try again later.", tone: "danger" });
          return;
        }
        await purchases.purchase({ rcPackage: pkg, customerEmail: billing.email ?? undefined });
      } catch (error) {
        if (await isCancelled(error)) return;
        console.error("[billing] purchase failed", error);
        toast({ title: "The payment didn't go through. Try again.", tone: "danger" });
        return;
      }
      const result = await refreshBilling();
      toast(
        result.error
          ? { title: result.error, tone: "danger" }
          : { title: "You're subscribed. Thank you!", tone: "confirm" },
      );
    });

  const manageNow = () =>
    startPending(async () => {
      const result = await billingManagementUrl();
      if (result.error || !result.url) {
        toast({ title: result.error ?? "We couldn't open billing. Try again.", tone: "danger" });
        return;
      }
      window.location.assign(result.url);
    });

  const startTrialNow = () =>
    startPending(async () => {
      const result = await startTrial();
      toast(
        result.error
          ? { title: result.error, tone: "danger" }
          : { title: "Your 14-day trial has started", tone: "confirm" },
      );
    });

  const hasPlan = billing.store !== null;
  const priceNote = price ? ` ${price}.` : "";
  const subscribe = billing.enabled && (
    <Button size="sm" loading={pending} onClick={subscribeNow}>
      Subscribe
    </Button>
  );
  const manage = billing.enabled && hasPlan && (
    <Button variant="secondary" size="sm" loading={pending} onClick={manageNow}>
      Manage billing
    </Button>
  );

  // A granted pass (outlasting any trial) reads like a paid one: no end date,
  // no "subscribe to keep it" (testing feedback, 6 Oct).
  const granted =
    hasPass &&
    !hasPlan &&
    (subscriptionStatus !== "trialing" ||
      (billing.bonusUntil != null && trialEndsAt !== null && Date.parse(billing.bonusUntil) > Date.parse(trialEndsAt)));
  if (granted) {
    return (
      <Row title="You’re on Season Pass" body="Your subscription is active. Enjoy everything included in your plan." />
    );
  }

  if (subscriptionStatus === "trialing" && trialEndsAt) {
    return hasPlan ? (
      <Row
        title="Free trial"
        body={`Full access until ${longDate(trialEndsAt)}, then your plan starts.${priceNote}`}
        trailing={manage}
      />
    ) : (
      <Row
        title="Free trial"
        body={`Full access until ${longDate(trialEndsAt)}.${billing.enabled ? ` Subscribe to keep it after that.${priceNote}` : ""}`}
        trailing={subscribe}
      />
    );
  }
  if (subscriptionStatus === "active") {
    const renewal = billing.currentPeriodEnd
      ? ` Your plan ${billing.cancelAtPeriodEnd ? "ends" : "renews"} on ${longDate(billing.currentPeriodEnd)}.`
      : "";
    return <Row title="You’re on Season Pass" body={`Your subscription is active.${renewal}`} trailing={manage} />;
  }
  if (subscriptionStatus === "past_due") {
    return (
      <Row
        title="Payment needed"
        body="Update your payment details to keep full access."
        trailing={
          billing.enabled &&
          hasPlan && (
            <Button size="sm" loading={pending} onClick={manageNow}>
              Update payment
            </Button>
          )
        }
      />
    );
  }

  if (!billing.trialUsed && subscriptionStatus === "none") {
    return (
      <Row
        title="No active plan"
        body={`Start a free trial to unlock everything.${billing.enabled ? ` Or subscribe now.${priceNote}` : ""}`}
        trailing={
          <div className="flex flex-wrap justify-end gap-2">
            {subscribe && (
              <Button variant="secondary" size="sm" loading={pending} onClick={subscribeNow}>
                Subscribe
              </Button>
            )}
            <Button size="sm" loading={pending} onClick={startTrialNow}>
              Start trial
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <Row
      title={subscriptionStatus === "canceled" ? "Plan ended" : "Your trial has ended"}
      body={billing.enabled ? `Subscribe to get full access back.${priceNote}` : "Subscriptions open soon."}
      trailing={
        (manage || subscribe) && (
          <div className="flex flex-wrap justify-end gap-2">
            {manage}
            {subscribe}
          </div>
        )
      }
    />
  );
}

function DangerZone() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [deleting, startDeleting] = useTransition();

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <span className="font-sans text-sm text-destructive-60 uppercase">
          Danger zone
        </span>
        <p className="font-sans text-sm text-ink-300">
          Permanently deletes your account, all your data, bonds, and
          posts. This cannot be undone.
        </p>
      </div>
      <FormError message={error} />
      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-8">
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type “DELETE” to confirm"
          aria-label="Type DELETE to confirm"
          className="flex-1 rounded-lg bg-destructive-5 px-3.5 py-2.5 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-400"
        />
        <button
          type="button"
          onClick={() => {
            setError(undefined);
            startDeleting(async () => {
              // Success redirects away; only failures come back.
              const result = await deleteAccount(confirm);
              if (result?.error) setError(result.error);
            });
          }}
          disabled={confirm !== "DELETE" || deleting}
          className="shrink-0 rounded-full bg-destructive-60 px-5 py-2.5 font-ui text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Card>
  );
}

/**
 * No Figma frame exists for this; it reuses the sign-up password field and
 * rules. A change needs the current password, or — if it's forgotten, or the
 * account only ever used Google — a 6-digit code emailed to the account.
 */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<{ hasPassword: boolean; email: string | null } | null>(null);
  const [useCode, setUseCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [current, setCurrent] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [sending, startSending] = useTransition();

  useEffect(() => {
    let live = true;
    void passwordStatus().then((result) => {
      if (!live) return;
      setStatus(result);
      // Nothing to remember for a Google-only account: straight to the code.
      if (!result.hasPassword) setUseCode(true);
    });
    return () => {
      live = false;
    };
  }, []);

  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least one letter", met: /[a-zA-Z]/.test(password) },
    { label: "At least one number", met: /\d/.test(password) },
    { label: "Both new passwords match", met: password.length > 0 && password === confirm },
  ];

  const sendCode = () =>
    startSending(async () => {
      setError(undefined);
      const result = await sendPasswordCode();
      if (result.error) {
        setError(result.error);
        return;
      }
      setCodeSent(true);
      toast({ title: `Code sent to ${status?.email ?? "your email"}` });
    });

  const ready =
    rules.every((r) => r.met) && (useCode ? codeSent && code.trim().length >= 6 : current.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Change password"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          setError(undefined);
          setFieldErrors({});
          startSaving(async () => {
            const result = useCode ? await changePasswordWithCode(code, password) : await changePassword(current, password);
            if (result.error || result.fieldErrors) {
              setError(result.error);
              setFieldErrors(result.fieldErrors ?? {});
              return;
            }
            toast({ title: "Password updated", tone: "confirm" });
            onClose();
          });
        }}
        className="my-auto flex w-full max-w-[480px] flex-col gap-5 rounded-2xl bg-surface p-6"
      >
        <h2 className="font-display text-xl font-semibold text-ink-800">
          {status && !status.hasPassword ? "Set a password" : "Change password"}
        </h2>
        <FormError message={error} />

        {status === null ? (
          <p className="font-sans text-sm text-ink-300">One moment…</p>
        ) : (
          <div className="flex flex-col gap-4">
            {useCode ? (
              <div className="flex flex-col gap-3">
                <p className="font-sans text-sm text-ink-400">
                  To confirm it&apos;s you, we&apos;ll email a 6-digit code to {status.email ?? "your email"}.
                </p>
                {codeSent ? (
                  <Input
                    label="Code from the email"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    error={fieldErrors.code}
                    required
                  />
                ) : null}
                <Button type="button" variant="secondary" size="sm" loading={sending} onClick={sendCode}>
                  {codeSent ? "Send a new code" : "Email me a code"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input
                  label="Current password"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  error={fieldErrors.current}
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    setUseCode(true);
                    setFieldErrors({});
                  }}
                  className="self-start font-sans text-sm font-medium text-primary-600 hover:underline"
                >
                  Forgot your current password?
                </button>
              </div>
            )}

            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <ul className="flex flex-col gap-3">
              {rules.map((rule) => (
                <li key={rule.label}>
                  <Checkbox readOnlyMarker checked={rule.met} label={rule.label} />
                </li>
              ))}
            </ul>
            {useCode && status.hasPassword && (
              <button
                type="button"
                onClick={() => setUseCode(false)}
                className="self-start font-sans text-sm font-medium text-primary-600 hover:underline"
              >
                I remember my current password
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" size="sm" fullWidth loading={saving} disabled={!ready}>
            Update password
          </Button>
          <Button type="button" variant="tertiary" size="sm" fullWidth onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

/** Trying two designs for a post's Space label; this device only. */
function PostLabelsRow() {
  const style = useSpaceLabelStyle();
  return (
    <Row
      title="Post labels"
      body="How posts and Curio show their Space."
      trailing={
        <div role="radiogroup" aria-label="Post labels" className="flex shrink-0 rounded-full bg-ivory-400 p-1">
          {(
            [
              ["banner", "Banner"],
              ["tag", "Tag"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={style === value}
              onClick={() => setSpaceLabelStyle(value)}
              className={cn(
                "rounded-full px-3 py-1 font-ui text-sm font-medium transition-colors",
                style === value ? "bg-surface text-ink-700 shadow-sm" : "text-ink-400 hover:text-ink-600",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
    />
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-3.5 rounded-lg bg-surface px-5 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      {children}
    </section>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-sm text-ink-200 uppercase">{children}</h2>
  );
}

export function Row({
  title,
  body,
  trailing,
  href,
  onClick,
  divider = false,
}: {
  title: string;
  body: string;
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  divider?: boolean;
}) {
  const className = cn(
    "flex w-full items-center justify-between gap-4 text-left",
    (href || onClick) && "rounded-lg transition-colors hover:bg-ivory-100",
    divider ? "border-b border-ink-50 pb-5" : "pb-4",
  );

  const content = (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-sans text-base font-semibold text-ink-600">
          {title}
        </span>
        <span className="font-sans text-sm text-ink-300">{body}</span>
      </div>
      {trailing}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

/** Toggle Only — Figma component set 177:4264, now the shared ui/Switch. */
export function Toggle({
  label,
  on,
  onChange,
  disabled = false,
}: {
  label: string;
  on: boolean;
  onChange?: () => void;
  disabled?: boolean;
}) {
  return <Switch label={label} checked={on} onChange={onChange && (() => onChange())} disabled={disabled} />;
}

function Chip({
  children,
  dot,
}: {
  children: React.ReactNode;
  /** Background class for a leading dot, e.g. an aura colour. */
  dot?: string;
}) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
      {dot && <span className={cn("size-2 rounded-full", dot)} />}
      {children}
    </span>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2.5a6.5 6.5 0 0 1 6.5 6.5c0 4.8-6.5 12.5-6.5 12.5S5.5 13.8 5.5 9A6.5 6.5 0 0 1 12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CaretIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path
        d="m13 9 7 7-7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
