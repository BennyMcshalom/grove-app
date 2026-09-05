"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { TopBar } from "@/components/app/TopBar";

/**
 * Event View — Figma frame 452:9875.
 *
 * A 724px conversation panel with the "group created" notice above the
 * messages, a "Join conversation" composer pinned to the bottom of the column,
 * and a 396px rail holding EVENT DETAILS and the ATTENDEE LIST (452:11307).
 */
const EVENT = {
  title: "First Down Walk",
  notice: "Group created for First DownEvent. 78 people going so far.",
  organizer: "David",
  time: "10am",
  date: "Friday, 28th August 2026",
  where: "Tafawa Balewa Square",
  distance: "1.4 away",
  about:
    "“Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut”",
  going: 78,
  capacity: 100,
};

const MESSAGES = [
  {
    id: "1",
    author: "David(host)",
    avatar: "/images/people/john.png",
    time: "09:03am",
    body: " Hey everyone! Excited to have you all, bring good energy, we’re playing casual, no pressure. See you Friday!",
  },
  {
    id: "2",
    author: "Amara",
    avatar: "/images/people/lena.png",
    time: "09:03am",
    body: "I’m literally in the same place right now. The fear of starting over is real.",
  },
];

/** Table Content Cells 458:11662 … 458:11712. */
const ATTENDEES = [
  { name: "Amina Johnson", avatar: "/images/people/nina.png" },
  { name: "Liam O'Connor", avatar: "/images/people/m4.png" },
  { name: "Sophia Patel", avatar: "/images/people/m2.png" },
  { name: "Ethan Zhang", avatar: "/images/people/m1.png" },
  { name: "Isabella Rossi", avatar: "/images/people/lena.png" },
  { name: "Liam Johnson", avatar: "/images/people/m3.png" },
  { name: "Ava Martinez", avatar: "/images/people/dominion.png" },
];

export function EventView() {
  const [draft, setDraft] = useState("");
  const [sent, setSent] = useState<typeof MESSAGES>([]);

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setSent((prev) => [
      ...prev,
      {
        id: `me-${prev.length}`,
        author: "Oreoluwa",
        avatar: "/images/avatar-oreoluwa.png",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        body,
      },
    ]);
    setDraft("");
  };

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          title={EVENT.title}
          icon={
            <Link
              href="/events"
              aria-label="Back to events"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600 transition-colors hover:bg-primary-100"
            >
              <PlanetIcon className="size-5" />
            </Link>
          }
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <section className="mx-auto flex w-full max-w-[724px] flex-col items-center gap-4 rounded-2xl bg-white p-6">
            <p className="flex w-full max-w-[427px] items-start gap-2 rounded-xl border border-primary-200 bg-primary-50 p-2 font-sans text-sm text-ink-200">
              <InfoIcon className="size-5 shrink-0 text-primary-600" />
              {EVENT.notice}
            </p>

            <ul className="flex w-full flex-col gap-5">
              {[...MESSAGES, ...sent].map((message) => (
                <li key={message.id} className="flex gap-4">
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
                    <Image
                      src={message.avatar}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg bg-ivory-100 px-3 py-2">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="font-sans text-base font-semibold text-ink-700">
                        {message.author}
                      </span>
                      <span className="font-sans text-sm text-ink-300">
                        {message.time}
                      </span>
                    </span>
                    <p className="font-sans text-sm text-ink-400">
                      {message.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Frame 458:12096 — the composer sits under the panel, above a rule. */}
        <div className="shrink-0 border-t border-ink-50 bg-white px-4 py-5 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] items-center gap-4">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Join conversation"
              aria-label="Join conversation"
              className="min-w-0 flex-1 rounded-2xl bg-ivory-100 px-5 py-4 font-sans text-xs text-ink-300 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              aria-label="Send message"
              className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendIcon className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar 452:11307 — 396px, scrolls on its own. */}
      <aside className="hidden w-[396px] shrink-0 flex-col gap-7 overflow-y-auto bg-white px-8 pt-6 pb-10 xl:flex">
        <section className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-semibold text-ink-700">
            EVENT DETAILS
          </h2>
          <div className="flex flex-col">
            <DetailRow icon={<UserIcon />} label="Organizer">
              <Value>{EVENT.organizer}</Value>
            </DetailRow>
            <DetailRow icon={<TimerIcon />} label="Time">
              <Value>{EVENT.time}</Value>
            </DetailRow>
            <DetailRow icon={<CalendarIcon />} label="Date">
              <Value>{EVENT.date}</Value>
            </DetailRow>
            <DetailRow icon={<PinIcon />} label="Where">
              <span className="flex items-center justify-between gap-2">
                <Value>{EVENT.where}</Value>
                <span className="font-sans text-sm text-ink-200">
                  {EVENT.distance}
                </span>
              </span>
            </DetailRow>
            <DetailRow
              icon={<FileIcon />}
              label="What is the event about, who is it for?"
            >
              <Value>{EVENT.about}</Value>
            </DetailRow>
          </div>
        </section>

        <span className="h-px w-full bg-ink-50" />

        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <h2 className="font-sans text-base font-semibold text-ink-700">
              ATTENDEE LIST
            </h2>
            <div className="flex items-center gap-3">
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-lg bg-ivory-500">
                <span
                  className="block h-full rounded-lg bg-primary-500"
                  style={{
                    width: `${(EVENT.going / EVENT.capacity) * 100}%`,
                  }}
                />
              </span>
              <span className="shrink-0 font-sans text-xs font-medium text-ink-400">
                {EVENT.going}/{EVENT.capacity} Grouving
              </span>
            </div>
            <p className="font-sans text-xs text-ink-300">
              Only people in your Circle are visible here
            </p>
          </div>

          <ul className="flex flex-col">
            {ATTENDEES.map((person) => (
              <li key={person.name} className="flex items-center gap-3 px-1 py-2">
                <span className="relative size-8 shrink-0 overflow-hidden rounded-full">
                  <Image
                    src={person.avatar}
                    alt=""
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </span>
                <span className="font-sans text-sm font-medium text-ink-400">
                  {person.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}

/** Table Content Cell 452:11528 — primary-50 glyph, label above value. */
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-sans text-sm text-ink-200">{label}</span>
        {children}
      </span>
    </div>
  );
}

function Value({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-sans text-sm font-semibold text-ink-500">
      {children}
    </span>
  );
}

function PlanetIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3.2 13.5c4.5 2.2 10.6 1.4 13.6-1.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10 9v4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="10" cy="6.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 10h11m0 0-4.5-4.5M14 10l-4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 16a5.5 5.5 0 0 1 11 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TimerIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 8v3l2 1.5M8 2.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <rect
        x="3"
        y="4.5"
        width="14"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 8.5h14M7 2.5v3M13 2.5v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M10 2.2a5.6 5.6 0 0 1 5.6 5.6c0 4.1-5.6 10.2-5.6 10.2S4.4 11.9 4.4 7.8A5.6 5.6 0 0 1 10 2.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="7.8" r="1.9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5l-4-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M11.5 2.5v4h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
