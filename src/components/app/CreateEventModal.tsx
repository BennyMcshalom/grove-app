"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader, ModalStatus } from "@/components/ui/Modal";
import { Glyph } from "@/components/app/EventsView";
import { FormError } from "@/components/auth/FormError";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { IconPicker } from "@/components/app/IconPicker";
import { createEvent } from "@/app/(app)/events/actions";
import { CHAPTERS } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { PICKER_ICONS, type PickerIcon } from "@/lib/icons";
import { localDay } from "@/lib/log";

/**
 * Create an Event — Figma frame 364:8741.
 *
 * A 32px-padded white card: title + close, the icon picker (575:16941), then
 * Event Name / Where / Space / Date + Time / Capacity / the description, and a
 * "Create event" button above a top rule. Every label and placeholder is
 * Figma's.
 */
export function CreateEventModal({ onClose }: { onClose: () => void }) {
  const viewer = useViewer();
  const toast = useToast();
  const router = useRouter();
  const [icon, setIcon] = useState<string>(PICKER_ICONS[0]);
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [chapterSlug, setChapterSlug] = useState(viewer.chapters[0]?.slug ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [description, setDescription] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const submit = () => {
    setError(undefined);
    if (!date || !time) return setError("Choose a date and a time.");
    // The browser reads "2026-08-28T10:00" as the host's local time.
    const startsAt = new Date(`${date}T${time}`);
    if (Number.isNaN(startsAt.getTime())) return setError("That date and time don't look right.");

    startSaving(async () => {
      const result = await createEvent({
        title,
        icon: icon as PickerIcon,
        venueName: venue,
        chapterSlug,
        startsAt: startsAt.toISOString(),
        capacity,
        description,
      });
      if (result.error || !result.id) return setError(result.error);
      setCreatedId(result.id);
      toast({ title: "Event created" });
    });
  };

  return (
    <Modal label="Create an Event" onClose={onClose} width="max-w-[600px]">
        <ModalHeader title={createdId ? undefined : "Create an Event"} onClose={onClose} />

        {/* PRD §11 "Event created and joined": the host is going and the chat is open. */}
        {createdId ? (
          <div className="flex flex-col items-center gap-6">
            <ModalStatus icon={<Glyph icon={icon} className="size-7" />} title="Event created">
              You&rsquo;re grouv&rsquo;d to {title.trim()}. The event conversation is open, and
              it shows under Events near you.
            </ModalStatus>
            <Button size="sm" fullWidth onClick={() => router.push(`/events/${createdId}`)}>
              View Event
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <IconPicker value={icon} onChange={setIcon} />

            <Labelled label="Event Name">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
                placeholder="Name your Event"
                className={FIELD}
              />
            </Labelled>
            <Labelled label="Where">
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                maxLength={200}
                required
                placeholder="Location of event"
                className={FIELD}
              />
            </Labelled>

            <Labelled label="Space">
              <span className={FIELD}>
                <select
                  value={chapterSlug}
                  onChange={(e) => setChapterSlug(e.target.value)}
                  required
                  className="min-w-0 flex-1 appearance-none bg-transparent font-sans text-base text-ink-500 outline-none"
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
                    value={date}
                    min={localDay()}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink-500 outline-none"
                  />
                </span>
              </Labelled>
              <Labelled label="Time" className="flex-1">
                <span className={FIELD}>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    required
                    className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink-500 outline-none"
                  />
                </span>
              </Labelled>
            </div>

            <Labelled label="Capacity">
              <input
                type="number"
                min={1}
                max={10000}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                placeholder="How many people can your event take"
                className={FIELD}
              />
            </Labelled>

            <Labelled label="What is the event about, who is it for?">
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                placeholder="Who should find this room, and why?"
                className={cn(FIELD, "block h-[129px] w-full resize-y")}
              />
            </Labelled>

            <div className="flex flex-col gap-3 border-t border-ink-50 pt-6">
              <FormError message={error} />
              <Button type="submit" size="sm" fullWidth loading={saving}>
                Create event
              </Button>
            </div>
          </form>
        )}
    </Modal>
  );
}

/** Input 1088:4 — ivory-100, 8px radius, 10/14 padding, xs shadow. */
const FIELD =
  "flex items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-300 focus-within:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

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
