"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import {
  changePassword,
  deleteAccount,
  startTrial,
  updatePreferences,
} from "@/app/(app)/settings/actions";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/cn";
import { AURAS, LOG_VISIBILITY, auraLabel, type LogVisibility } from "@/lib/profile";

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
}

export function SettingsView({
  prompts,
  preferences,
}: {
  prompts: SettingsPrompts;
  preferences: SettingsPreferences;
}) {
  const toast = useToast();
  const [prefs, setPrefs] = useState(preferences);
  const [changingPassword, setChangingPassword] = useState(false);

  // Optimistic: flip it now, put it back if the save fails.
  const savePreference = async (patch: Partial<SettingsPreferences>) => {
    const previous = prefs;
    setPrefs({ ...prefs, ...patch });
    const result = await updatePreferences(patch);
    if (result.error) {
      setPrefs(previous);
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
            />
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
            />
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
            <SubscriptionRow />
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
 * Desktop hangs the avatar off a 107px gradient strip with the actions to its
 * right. The phone frame instead puts the whole identity block inside the
 * gradient and drops the actions onto the white below it.
 */
function ProfileBanner() {
  return (
    <section className="relative w-full overflow-hidden rounded-lg bg-white shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      {/* On a phone this band wraps the identity block; on desktop it is the
          bare strip the avatar overlaps. */}
      <div
        className="px-5 py-4 lg:h-[107px] lg:px-0 lg:py-0"
        style={{
          backgroundImage:
            "linear-gradient(0deg, #FFDFCF 0%, #FFECE4 87%)",
        }}
      >
        <div className="flex items-center gap-4 lg:hidden">
          <ProfileIdentity />
        </div>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pt-0">
        <div className="-mt-10 hidden items-center gap-4 lg:flex">
          <ProfileIdentity />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button size="sm" href="/settings/your-grouv">
            Enter my Grouv
          </Button>
          <Button variant="secondary" size="sm" href="/settings/edit-profile">
            Edit Profile
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Avatar, name, aura chips and location — the same in both layouts. */
function ProfileIdentity() {
  const viewer = useViewer();
  const aura = AURAS.find((a) => a.value === viewer.aura);

  return (
    <>
      <span
        className="relative size-16 shrink-0 rounded-full border-4 border-white"
        style={{ boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)" }}
      >
        <Avatar
          src={viewer.avatarUrl}
          name={viewer.firstName}
          sizes="64px"
          className="size-full"
        />
        <span className="absolute right-0 bottom-0 size-4 rounded-full border-[1.5px] border-white bg-success-60" />
      </span>
      <div className="flex min-w-0 flex-col gap-3">
        <span className="font-sans text-base font-semibold text-ink-800">
          {viewer.firstName}
        </span>
        <div className="flex flex-wrap gap-4">
          {viewer.chapters[0] && <Chip>{viewer.chapters[0].phase}</Chip>}
          <Chip dot={aura?.dot === "bg-white" ? "bg-primary-600" : aura?.dot}>
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

function SubscriptionRow() {
  const { subscriptionStatus, trialEndsAt } = useViewer();
  const toast = useToast();
  const [starting, startStarting] = useTransition();

  if (subscriptionStatus === "trialing" && trialEndsAt) {
    const ends = new Date(trialEndsAt).toLocaleDateString(undefined, {
      day: "numeric",
      month: "long",
    });
    return <Row title="Free trial" body={`Full access until ${ends}.`} />;
  }
  if (subscriptionStatus === "active") {
    return <Row title="Full access" body="Your plan is active." />;
  }
  if (subscriptionStatus === "past_due") {
    return <Row title="Payment needed" body="Update your payment details to keep full access." />;
  }

  return (
    <Row
      title="No active plan"
      body="Start a free trial to unlock everything."
      trailing={
        <Button
          size="sm"
          loading={starting}
          onClick={() =>
            startStarting(async () => {
              const result = await startTrial();
              toast(
                result.error
                  ? { title: result.error, tone: "danger" }
                  : { title: "Your 14-day trial has started", tone: "confirm" },
              );
            })
          }
        >
          Start trial
        </Button>
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
          className="shrink-0 rounded-full bg-destructive-60 px-5 py-2.5 font-ui text-sm font-medium text-ink-50 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </Card>
  );
}

/** No Figma frame exists for this; it reuses the sign-up password field and rules. */
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [fieldError, setFieldError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const rules = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "At least one letter", met: /[a-zA-Z]/.test(password) },
    { label: "At least one number", met: /\d/.test(password) },
  ];

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
          setFieldError(undefined);
          startSaving(async () => {
            const result = await changePassword(password);
            if (result.error || result.fieldErrors) {
              setError(result.error);
              setFieldError(result.fieldErrors?.password);
              return;
            }
            toast({ title: "Password updated", tone: "confirm" });
            onClose();
          });
        }}
        className="my-auto flex w-full max-w-[480px] flex-col gap-5 rounded-2xl bg-white p-6"
      >
        <h2 className="font-display text-xl font-semibold text-ink-800">Change password</h2>
        <FormError message={error} />
        <div className="flex flex-col gap-3">
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldError}
            required
          />
          <ul className="flex flex-col gap-3">
            {rules.map((rule) => (
              <li key={rule.label}>
                <Checkbox readOnlyMarker checked={rule.met} label={rule.label} />
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            size="sm"
            fullWidth
            loading={saving}
            disabled={!rules.every((r) => r.met)}
          >
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-3.5 rounded-lg bg-white px-5 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-sm text-ink-200 uppercase">{children}</h2>
  );
}

function Row({
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

/** Toggle Only — Figma component set 177:4264. 44x24, 2px padding. */
function Toggle({
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
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={on}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        on ? "justify-end bg-primary-600" : "justify-start bg-ink-50",
      )}
    >
      <span className="size-5 rounded-full bg-white shadow-sm" />
    </button>
  );
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
