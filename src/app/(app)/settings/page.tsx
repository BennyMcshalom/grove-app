"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TopBar } from "@/components/app/TopBar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/**
 * Settings — Figma frame 390:13507.
 *
 * A 1096px scrolling column of white 8px cards: the profile banner, then
 * PROFILE / APPEARANCE / ACCOUNT / NOTIFICATION / SUBSCRIPTION / PRIVACY and
 * the danger zone. All labels and helper copy are Figma's (frame 391:14241).
 */
const PROFILE_FIELDS = [
  {
    label: "Honest tension",
    value: "Still working out whether the safe path is actually the scared one.",
  },
  {
    label: "Sitting with",
    value: "Whether wanting more makes me ungrateful for what I have.",
  },
  {
    label: "Open to",
    value: "People who’ll tell me the truth, not just cheer me on.",
  },
];

const NOTIFICATIONS = [
  { title: "Chapter prompt", body: "Weekly reflection nudge", on: true },
  { title: "Wave received", body: "When someone waves at you nearby", on: true },
  { title: "Bond invitation", body: "Always on, required for safety", on: true },
];

const ACCOUNT = [
  {
    title: "Edit Profile",
    body: "Make your profile feel more like you.",
    href: "/settings/edit-profile",
  },
  {
    title: "Change password",
    body: "Update your password to keep your account secure.",
  },
];

const PRIVACY = [
  { title: "Log visibility", body: "Who can see your Grouv Log" },
  {
    title: "Grouv’s Promise",
    body: "Making every season feel a little less alone.",
  },
];

export default function SettingsPage() {
  const [lightMode, setLightMode] = useState(true);
  const [toggles, setToggles] = useState(NOTIFICATIONS.map((n) => n.on));
  const [confirm, setConfirm] = useState("");
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Settings" />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col items-center gap-6 pb-10">
          <ProfileBanner />

          <Card>
            <SectionLabel>Profile</SectionLabel>
            <div className="flex flex-col gap-4">
              {PROFILE_FIELDS.map((field) => (
                <label key={field.label} className="flex flex-col gap-1.5">
                  <span className="font-sans text-sm font-medium text-ink-500">
                    {field.label}
                  </span>
                  <span className="rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-400 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                    {field.value}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <SectionLabel>Appearance</SectionLabel>
            <Row
              title={lightMode ? "Light Mode" : "Dark Mode"}
              body={lightMode ? "Switch to dark mode" : "Switch to light mode"}
              trailing={
                <Toggle on={!lightMode} onChange={() => setLightMode((v) => !v)} />
              }
            />
          </Card>

          <Card>
            <SectionLabel>Account</SectionLabel>
            {ACCOUNT.map((row, i) => (
              <Row
                key={row.title}
                title={row.title}
                body={row.body}
                href={row.href}
                divider={i < ACCOUNT.length - 1}
              />
            ))}
          </Card>

          <Card>
            <SectionLabel>Notification</SectionLabel>
            {NOTIFICATIONS.map((row, i) => (
              <Row
                key={row.title}
                title={row.title}
                body={row.body}
                divider={i < NOTIFICATIONS.length - 1}
                trailing={
                  <Toggle
                    on={toggles[i]}
                    onChange={() =>
                      setToggles((prev) =>
                        prev.map((v, j) => (i === j ? !v : v)),
                      )
                    }
                  />
                }
              />
            ))}
          </Card>

          <Card>
            <SectionLabel>Subscription</SectionLabel>
            <Row
              title="No active plan"
              body="Start a free trial to unlock everything."
              trailing={<Button size="sm">Start trial</Button>}
            />
          </Card>

          <Card>
            <SectionLabel>Privacy</SectionLabel>
            {PRIVACY.map((row, i) => (
              <Row
                key={row.title}
                title={row.title}
                body={row.body}
                divider={i < PRIVACY.length - 1}
                trailing={<CaretIcon className="size-8 text-ink-400" />}
              />
            ))}
          </Card>

          <Card>
            <div className="flex flex-col gap-2">
              <span className="font-sans text-base text-destructive-60 uppercase">
                Danger zone
              </span>
              <p className="font-sans text-base text-ink-300">
                Permanently deletes your account, all your data, bonds, and
                posts. This cannot be undone.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:gap-8">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type “DELETE” to confirm"
                className="flex-1 rounded-lg bg-destructive-5 px-3.5 py-2.5 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-400"
              />
              <button
                type="button"
                onClick={() => setDeleted(true)}
                disabled={confirm !== "DELETE"}
                className="shrink-0 rounded-full bg-destructive-60 px-5 py-2.5 font-ui text-sm font-medium text-ink-50 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </Card>

          <div className="flex flex-col items-center">
            <div className="flex gap-2.5">
              <Link href="/privacy" className="rounded-full px-5 py-2 font-sans text-base text-ink-300 hover:bg-ivory-200">
                Privacy
              </Link>
              <Link href="/terms" className="rounded-full px-5 py-2 font-sans text-base text-ink-300 hover:bg-ivory-200">
                Terms
              </Link>
              <Link
                href="/privacy"
                className="rounded-full px-5 py-2 font-sans text-base text-ink-300 hover:bg-ivory-200"
              >
                Our Promise
              </Link>
            </div>
            <Link
              href="/sign-in"
              className="rounded-full px-5 py-6 font-sans text-base font-medium text-primary-600 hover:underline"
            >
              Sign out
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Figma 404:15075 — gradient header strip with the avatar overlapping it. */
function ProfileBanner() {
  return (
    <section className="relative w-full overflow-hidden rounded-lg bg-white shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <div
        className="h-[107px] w-full"
        style={{
          backgroundImage:
            "linear-gradient(0deg, #FFDFCF 0%, #FFECE4 87%)",
        }}
      />
      <div className="flex flex-col gap-4 px-8 pt-0 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mt-10 flex items-center gap-4">
          <span
            className="relative size-16 shrink-0 rounded-full border-4 border-white"
            style={{ boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)" }}
          >
            <Image
              src="/images/people/jalen.png"
              alt=""
              fill
              sizes="64px"
              className="rounded-full object-cover"
            />
            <span className="absolute right-0 bottom-0 size-4 rounded-full border-[1.5px] border-white bg-success-60" />
          </span>
          <div className="flex flex-col gap-3">
            <span className="font-sans text-lg font-semibold text-ink-800">
              Oreoluwa
            </span>
            <div className="flex flex-wrap gap-4">
              <Chip>Building a habit</Chip>
              <Chip dot>In transition</Chip>
            </div>
            <span className="flex items-center gap-2 font-sans text-sm font-medium text-ink-400">
              <PinIcon className="size-5" />
              Lagos Nigeria
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
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

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-4 rounded-lg bg-white px-6 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-sans text-base text-ink-200 uppercase">{children}</h2>
  );
}

function Row({
  title,
  body,
  trailing,
  href,
  divider = false,
}: {
  title: string;
  body: string;
  trailing?: React.ReactNode;
  href?: string;
  divider?: boolean;
}) {
  const className = cn(
    "flex items-center justify-between gap-4",
    href && "rounded-lg transition-colors hover:bg-ivory-100",
    divider ? "border-b border-ink-50 pb-5" : "pb-4",
  );

  const body_ = (
    <>
      <div className="flex flex-col gap-1">
        <span className="font-sans text-xl font-semibold text-ink-600">
          {title}
        </span>
        <span className="font-sans text-base text-ink-300">{body}</span>
      </div>
      {trailing}
    </>
  );

  return href ? (
    <Link href={href} className={className}>
      {body_}
    </Link>
  ) : (
    <div className={className}>{body_}</div>
  );
}

/** Toggle Only — Figma component set 177:4264. 44x24, 2px padding. */
function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={cn(
        "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors",
        on ? "justify-end bg-primary-600" : "justify-start bg-ink-50",
      )}
    >
      <span className="size-5 rounded-full bg-white shadow-sm" />
    </button>
  );
}

function Chip({
  children,
  dot = false,
}: {
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
      {dot && <span className="size-2 rounded-full bg-primary-600" />}
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
