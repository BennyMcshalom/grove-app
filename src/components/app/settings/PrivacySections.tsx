"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { Card, Row, SectionLabel, Toggle } from "@/components/app/settings/SettingsView";
import { TextAction, longDate } from "@/components/app/pass/PassStatus";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { deleteAccount, requestDataExport, updatePrivacy, updateProfileAudience } from "@/app/(app)/settings/actions";
import { unblockUser } from "@/lib/bond-actions";
import { cn } from "@/lib/cn";
import {
  FIELD_AUDIENCES,
  PROFILE_FIELDS,
  audienceLabel,
  type FieldAudience,
  type ProfileAudiences,
  type ProfileField,
} from "@/lib/profile-audience";

/**
 * Settings → Privacy & AI controls (Figma 1608:35963 desktop, 1804:45264
 * phone) and Blocked accounts (1608:36232 / 1807:46066). What's public, who
 * sees each profile field (Audience — 1587:23049…), the profile preview, the
 * personalisation toggles, blocked accounts, data export and the danger
 * zone. None of this is ever behind the Season Pass (PRD §13).
 */
export interface PrivacySettings {
  /** "Show me in suggestions" — honoured by match_candidates. */
  discoverable: boolean;
  /** "Learn from my activity" — honoured by the interaction log. */
  activityMatching: boolean;
}

export interface BlockedAccount {
  userId: string;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}

export function PrivacyControlsView({
  privacy: initialPrivacy,
  audiences: initialAudiences,
  blockedCount,
}: {
  privacy: PrivacySettings;
  audiences: ProfileAudiences;
  blockedCount: number;
}) {
  const toast = useToast();
  const [privacy, setPrivacy] = useState(initialPrivacy);
  const [audiences, setAudiences] = useState(initialAudiences);
  const [editing, setEditing] = useState<ProfileField | null>(null);
  const [exporting, startExporting] = useTransition();

  // Optimistic, like the other Settings toggles.
  const save = async (patch: Partial<PrivacySettings>) => {
    const previous = privacy;
    setPrivacy({ ...privacy, ...patch });
    const result = await updatePrivacy(patch);
    if (result.error) {
      setPrivacy(previous);
      toast({ title: result.error, tone: "danger" });
    }
  };

  // "Export requested" (1593:23216): a download link by email. Without email
  // (local dev) the file downloads here instead.
  const requestExport = () =>
    startExporting(async () => {
      const result = await requestDataExport();
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      if (result.emailed) {
        toast({ title: "Export requested", description: "We'll email your download link within 24 hours.", tone: "confirm" });
        return;
      }
      try {
        const response = await fetch("/api/export", { cache: "no-store" });
        if (!response.ok) throw new Error(await response.text());
        const url = URL.createObjectURL(await response.blob());
        const link = document.createElement("a");
        link.href = url;
        link.download =
          /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ?? "grouv-data.json";
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Your data is downloading", tone: "confirm" });
      } catch {
        toast({ title: "We couldn't put your data together. Try again.", tone: "danger" });
      }
    });

  // "Your profile is visible to Everyone on Grouv", and which fields aren't.
  const limited = PROFILE_FIELDS.filter((f) => audiences[f.key] !== "everyone");
  const publicBody = limited.length
    ? `Your name and photo are visible to Everyone on Grouv. ${limited
        .map((f) => `${f.label}: ${audienceLabel(audiences[f.key])}`)
        .join(" · ")}.`
    : "Your profile is currently visible to Everyone on Grouv";

  const field = PROFILE_FIELDS.find((f) => f.key === editing);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Privacy & AI controls" back="/settings" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-6 pb-10">
          <Section label="What's public">
            <div className="flex items-center gap-4 rounded-lg bg-primary-50 px-4 py-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-500 text-white" aria-hidden="true">
                <GlobeIcon />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-sans text-base font-medium text-ink-800">Your profile is visible to Everyone on Grouv</span>
                <span className="font-sans text-sm text-ink-400">{publicBody}</span>
              </div>
            </div>
          </Section>

          <Section label="Profile fields">
            <Card>
              <ul className="flex flex-col">
                {PROFILE_FIELDS.map((f, i) => (
                  <li key={f.key}>
                    <NavRow
                      title={f.label}
                      body={`Visible to: ${audienceLabel(audiences[f.key])}`}
                      onClick={() => setEditing(f.key)}
                      divider={i < PROFILE_FIELDS.length - 1}
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </Section>

          <Section label="Preview your profile">
            <Card>
              <NavRow
                title="See your profile the way others do"
                body="Preview as a stranger, a connection, or a Bond"
                href="/settings/preview"
              />
            </Card>
          </Section>

          {/* Figma's "Let Grouv AI process your entries" has nothing behind it
              yet; these are the personalisation switches Grouv honours today. */}
          <Section label="AI & personalization">
            <Card>
              <Row
                title="Show me in suggestions"
                body="Let people in your chapters find you in matches and People you may know. Off, only people you reach out to will see you."
                divider
                trailing={
                  <Toggle
                    label="Show me in suggestions"
                    on={privacy.discoverable}
                    onChange={() => save({ discoverable: !privacy.discoverable })}
                  />
                }
              />
              <Row
                title="Learn from my activity"
                body="Let who you talk to, and how often, shape your Bonds. Off, Grouv stops learning from anything new you do."
                trailing={
                  <Toggle
                    label="Learn from my activity"
                    on={privacy.activityMatching}
                    onChange={() => save({ activityMatching: !privacy.activityMatching })}
                  />
                }
              />
            </Card>
          </Section>

          <Section label="Account">
            <Card>
              <NavRow
                title="Blocked accounts"
                body={
                  blockedCount
                    ? `People you won't see or hear from · ${blockedCount}`
                    : "People you won't see or hear from"
                }
                href="/settings/blocked"
                divider
              />
              <Row
                title="Export your data"
                body="Download a copy of your memories, posts and account info."
                trailing={
                  <Button variant="secondary" size="sm" loading={exporting} onClick={requestExport}>
                    Request export
                  </Button>
                }
              />
            </Card>
          </Section>

          <DangerZone />
        </div>
      </div>

      {field && (
        <AudienceModal
          key={field.key}
          title={field.title}
          initial={audiences[field.key]}
          onClose={() => setEditing(null)}
          onSaved={(audience) => {
            setAudiences((prev) => ({ ...prev, [field.key]: audience }));
            setEditing(null);
          }}
          field={field.key}
        />
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>{label}</SectionLabel>
      {children}
    </section>
  );
}

/** A settings row that opens something: title, body and a chevron. */
function NavRow({
  title,
  body,
  href,
  onClick,
  divider = false,
}: {
  title: string;
  body: string;
  href?: string;
  onClick?: () => void;
  divider?: boolean;
}) {
  const className = cn(
    "flex w-full items-center justify-between gap-4 rounded-lg py-3 text-left transition-colors hover:bg-ivory-100",
    divider && "border-b border-ink-50",
  );
  const content = (
    <>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-sans text-base text-ink-800">{title}</span>
        <span className="font-sans text-sm text-ink-400">{body}</span>
      </span>
      <ChevronIcon />
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

/** "Who can see your …?" — Figma 1587:23175 (phone 1801:37308) and siblings. */
function AudienceModal({
  field,
  title,
  initial,
  onClose,
  onSaved,
}: {
  field: ProfileField;
  title: string;
  initial: FieldAudience;
  onClose: () => void;
  onSaved: (audience: FieldAudience) => void;
}) {
  const toast = useToast();
  const [picked, setPicked] = useState<FieldAudience>(initial);
  const [saving, startSaving] = useTransition();

  const save = () =>
    startSaving(async () => {
      const result = await updateProfileAudience(field, picked);
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      // Alert — Audience updated (1587:23042).
      toast({ title: "Audience updated", description: "This field now uses your new setting.", tone: "confirm" });
      onSaved(picked);
    });

  return (
    <Modal label={title} onClose={onClose} width="max-w-[560px]">
      <ModalHeader title={title} onClose={onClose} />
      <div role="radiogroup" aria-label={title} className="flex flex-col rounded-xl bg-ivory-100 px-4 py-1">
        {FIELD_AUDIENCES.map((option, i) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={picked === option.value}
            onClick={() => setPicked(option.value)}
            className={cn(
              "flex items-start justify-between gap-4 py-3 text-left",
              i < FIELD_AUDIENCES.length - 1 && "border-b border-ink-50",
            )}
          >
            <span className="flex flex-col gap-1">
              <span className="font-sans text-base font-medium text-ink-800">{option.label}</span>
              <span className="font-sans text-sm text-ink-400">{option.body}</span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded border",
                picked === option.value ? "border-primary-500 bg-primary-500 text-white" : "border-ink-100 bg-surface",
              )}
            >
              {picked === option.value && (
                <svg viewBox="0 0 12 12" fill="none" className="size-3">
                  <path d="m2.5 6.2 2.2 2.2 4.8-4.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </button>
        ))}
      </div>
      <hr className="border-ink-50" />
      <Button size="md" fullWidth loading={saving} onClick={save}>
        Save audience
      </Button>
    </Modal>
  );
}

/**
 * Danger zone. Deleting schedules it, signs out and lands on "Account
 * deletion requested" (/goodbye — Figma 1593:23224 / phone 1801:37825).
 */
function DangerZone() {
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [deleting, startDeleting] = useTransition();

  return (
    <Section label="Danger zone">
      <Card>
        <p className="font-sans text-sm text-ink-300">
          Permanently deletes your account, all your data, Bonds, and posts. This cannot be undone.
        </p>
        <FormError message={error} />
        <div className="flex flex-col items-stretch gap-4 pb-1 sm:flex-row sm:items-center sm:gap-8">
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
    </Section>
  );
}

/** Settings → Privacy & AI controls → Blocked accounts (Figma 1608:36232 / 1807:46066). */
export function BlockedAccountsView({ initial }: { initial: BlockedAccount[] }) {
  const toast = useToast();
  const [blocked, setBlocked] = useState(initial);
  const [confirming, setConfirming] = useState<BlockedAccount | null>(null);
  const [pending, startPending] = useTransition();

  const unblock = (person: BlockedAccount) =>
    startPending(async () => {
      const result = await unblockUser(person.userId);
      if (result.error) {
        toast({ title: result.error, tone: "danger" });
        return;
      }
      setBlocked((prev) => prev.filter((b) => b.userId !== person.userId));
      setConfirming(null);
      // Alert — Unblocked (1592:23250).
      toast({ title: "Unblocked", description: "They can see your profile and reach you again.", tone: "confirm" });
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Blocked accounts" back="/settings/privacy" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-4 pb-10">
          <p className="font-sans text-sm text-ink-400">
            People you&rsquo;ve blocked won&rsquo;t be able to see your profile, send you messages, or find you in search.
          </p>
          <Card>
            {blocked.length === 0 ? (
              <p className="py-2 font-sans text-sm text-ink-300">
                You haven&rsquo;t blocked anyone. People you block will show up here.
              </p>
            ) : (
              <ul className="flex flex-col">
                {blocked.map((person, i) => (
                  <li
                    key={person.userId}
                    className={cn("flex items-center gap-3 py-3", i < blocked.length - 1 && "border-b border-ink-50")}
                  >
                    <Avatar src={person.avatarUrl} name={person.name} sizes="40px" className="size-10" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-sans text-base font-medium text-ink-800">{person.name}</span>
                      <span className="font-sans text-sm text-ink-400">Blocked {longDate(person.blockedAt)}</span>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setConfirming(person)}>
                      Unblock
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Unblock confirmation — Figma 1592:23235 / 1801:37833. */}
      {confirming && (
        <Modal label="Unblock this person?" onClose={() => setConfirming(null)} width="max-w-[480px]" className="gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl font-semibold text-ink-800">Unblock this person?</h2>
            <p className="font-sans text-sm text-ink-300">
              They&rsquo;ll be able to see your profile, send messages, and find you again.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="md" fullWidth loading={pending} onClick={() => unblock(confirming)}>
              Unblock
            </Button>
            <TextAction onClick={() => setConfirming(null)}>Cancel</TextAction>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5 shrink-0 text-ink-300" aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 12h17M12 3.5c2.3 2.4 3.4 5.2 3.4 8.5s-1.1 6.1-3.4 8.5c-2.3-2.4-3.4-5.2-3.4-8.5S9.7 5.9 12 3.5Z" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
