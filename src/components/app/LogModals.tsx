"use client";

import { useState, useTransition } from "react";
import { Photo } from "@/components/ui/Media";
import { useToast } from "@/components/app/ToastProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { setLogVisibility, updateLogEntry } from "@/app/(app)/log/actions";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { logDateLabel, type LogEntry } from "@/lib/log";
import { LOG_VISIBILITY, type LogVisibility } from "@/lib/profile";

/**
 * WHO CAN SEE YOUR LOG — Figma 1307:22530 (phone 631:15373). Everyone, My
 * circle, Bonds only or Only me, then Save audience.
 */
export function LogVisibilityModal({
  visibility,
  onClose,
}: {
  visibility: LogVisibility;
  onClose: () => void;
}) {
  const toast = useToast();
  const [choice, setChoice] = useState(visibility);
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();

  return (
    <Modal label="Who can see your log?" onClose={onClose} width="max-w-[440px]">
      <ModalHeader title="Who can see your log?" onClose={onClose} />
      <AudienceList value={choice} onChange={setChoice} />
      <FormError message={error} />
      <div className="border-t border-ink-50 pt-6">
        <Button
          size="sm"
          fullWidth
          loading={busy}
          disabled={busy}
          onClick={() =>
            start(async () => {
              const result = await setLogVisibility(choice);
              if (result.error) return setError(result.error);
              onClose();
              const label = LOG_VISIBILITY.find((v) => v.value === choice)?.label ?? "";
              toast({ title: "Visibility updated", description: `Your log will be visible to: ${label}.` });
            })
          }
        >
          Save audience
        </Button>
      </div>
    </Modal>
  );
}

function AudienceList({ value, onChange }: { value: LogVisibility; onChange: (v: LogVisibility) => void }) {
  return (
    <ul role="radiogroup" className="flex flex-col rounded-lg bg-ivory-100 px-4">
      {LOG_VISIBILITY.map((option) => {
        const on = option.value === value;
        return (
          <li key={option.value} className="border-b border-ink-50 last:border-b-0">
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(option.value)}
              className="flex w-full items-start justify-between gap-4 py-3 text-left"
            >
              <span className="flex flex-col gap-1">
                <span className="font-sans text-sm font-semibold text-ink-700">{option.label}</span>
                <span className="font-sans text-xs text-ink-400">{option.body}</span>
              </span>
              <span
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border",
                  on ? "border-primary-600 bg-primary-600 text-white" : "border-ink-100 bg-surface",
                )}
                aria-hidden="true"
              >
                {on && (
                  <svg viewBox="0 0 16 16" fill="none" className="size-3.5">
                    <path d="m3.5 8.5 3 3 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });

/**
 * Grouv Log — Editing (Figma 1424:23772): the moment's words and who can see
 * this one moment, then Save Edit.
 */
export function EditLogEntryModal({
  entry,
  logVisibility,
  onClose,
}: {
  entry: LogEntry;
  /** The log's own setting, which a moment follows unless it has its own. */
  logVisibility: LogVisibility;
  onClose: () => void;
}) {
  const toast = useToast();
  const [body, setBody] = useState(entry.body ?? "");
  const [audience, setAudience] = useState<LogVisibility>(entry.visibility ?? logVisibility);
  const [error, setError] = useState<string>();
  const [busy, start] = useTransition();
  const chapter = getChapter(entry.chapterSlug);
  const day = new Date(`${entry.entryDate}T12:00:00Z`);

  return (
    <Modal label="Edit this moment" onClose={onClose} className="items-center rounded-3xl">
      <span className="flex items-center gap-2 font-sans text-sm text-ink-800 uppercase">
        {chapter?.name}
        <span className="size-2 rounded-full bg-ivory-600" />
        {weekday.format(day)}
      </span>
      {entry.photoUrl && (
        <div className="relative h-60 w-full overflow-hidden rounded-2xl bg-ivory-200">
          <Photo src={entry.photoUrl} alt="" fill unoptimized className="object-cover" />
        </div>
      )}
      <span className="self-start font-sans text-xs text-ink-300">From your Grouv Log · {logDateLabel(entry.entryDate)}</span>
      <textarea
        autoFocus
        rows={4}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="Your moment"
        className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-4 font-sans text-base text-ink-600 outline-none focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
      />
      <label className="flex items-center gap-2 self-start font-sans text-sm text-ink-600">
        Visible to:
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as LogVisibility)}
          className="rounded-full bg-primary-50 px-3 py-1.5 font-sans text-sm text-ink-700 outline-none"
        >
          {LOG_VISIBILITY.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <FormError message={error} />
      <div className="flex w-full justify-end gap-3 border-t border-ink-50 pt-6">
        <Button size="sm" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          loading={busy}
          disabled={busy || (!body.trim() && !entry.photoUrl)}
          onClick={() =>
            start(async () => {
              // Matching the log's setting keeps the moment following it.
              const result = await updateLogEntry(
                entry.id,
                body,
                audience === logVisibility && !entry.visibility ? null : audience,
              );
              if (result.error) return setError(result.error);
              onClose();
              toast({ title: "Log edit saved" });
            })
          }
        >
          Save Edit →
        </Button>
      </div>
    </Modal>
  );
}
