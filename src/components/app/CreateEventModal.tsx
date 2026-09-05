"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/app/ToastProvider";
import { IconPicker, PICKER_ICONS } from "@/components/app/IconPicker";
import { CHAPTERS } from "@/lib/chapters";
import { cn } from "@/lib/cn";

/**
 * Create an Event — Figma frame 364:8741.
 *
 * A 32px-padded white card: title + close, the icon picker (575:16941), then
 * Event Name / Where / Space / Date + Time / Capacity / the description, and a
 * "Create event" button above a top rule. Every label and placeholder is
 * Figma's.
 */

export function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [icon, setIcon] = useState(PICKER_ICONS[0]);
  const [created, setCreated] = useState(false);
  const toast = useToast();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create an Event"
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[600px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink-800">
            Create an Event
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>

        {created ? (
          <p className="rounded-xl border border-primary-200 bg-primary-50 p-4 font-sans text-base text-ink-400">
            Your event is set up. It will show under Events near you.
          </p>
        ) : (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              setCreated(true);
              toast({ title: "Events created" });
            }}
          >
            <IconPicker value={icon} onChange={setIcon} />

            <Field label="Event Name" placeholder="Name your Event" />
            <Field label="Where" placeholder="Location of event" />

            <Labelled label="Space">
              <span className={FIELD}>
                <select
                  defaultValue=""
                  className="min-w-0 flex-1 appearance-none bg-transparent font-sans text-base text-ink-300 outline-none"
                >
                  <option value="" disabled>
                    Select space it belongs to
                  </option>
                  {CHAPTERS.map((chapter) => (
                    <option key={chapter.slug} value={chapter.slug}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
                <CaretDownIcon />
              </span>
            </Labelled>

            <div className="flex flex-col gap-6 sm:flex-row">
              <Labelled label="Date" className="flex-1">
                <span className={FIELD}>
                  <input
                    type="date"
                    className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink-300 outline-none"
                  />
                </span>
              </Labelled>
              <Labelled label="Time" className="flex-1">
                <span className={FIELD}>
                  <input
                    type="time"
                    className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink-300 outline-none"
                  />
                </span>
              </Labelled>
            </div>

            <Field
              label="Capacity"
              placeholder="How many people can your event take"
              type="number"
            />

            <Labelled label="What is the event about, who is it for?">
              <textarea
                rows={4}
                placeholder="Who should find this room, and why?"
                className={cn(FIELD, "block h-[129px] w-full resize-y")}
              />
            </Labelled>

            <div className="border-t border-ink-50 pt-6">
              <Button type="submit" size="sm" fullWidth>
                Create event
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Input 1088:4 — ivory-100, 8px radius, 10/14 padding, xs shadow. */
const FIELD =
  "flex items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-300 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-300 focus-within:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

function Labelled({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="font-sans text-sm font-medium text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <Labelled label={label}>
      <input type={type} placeholder={placeholder} className={FIELD} />
    </Labelled>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
      <path
        d="m3.5 3.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CaretDownIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="size-4 shrink-0 text-ink-400"
      aria-hidden="true"
    >
      <path
        d="m4 6 4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
