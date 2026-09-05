"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Chat pane — Figma frame 452:10373.
 *
 * 525px column: an ivory-300 top nav carrying the bond's depth bar, a
 * scrolling message list, and a pill composer. Every message below is the copy
 * Figma actually has in frame 452:10396.
 */
export type Message =
  | { kind: "text"; from: "them" | "me"; body: string; time: string; status?: string }
  | { kind: "voice"; from: "me"; length: string; time: string; status?: string }
  | { kind: "video"; from: "me"; src: string; time: string; status?: string }
  | {
      kind: "link";
      from: "me";
      title: string;
      description: string;
      url: string;
      time: string;
    };

export const BOND_THREAD: { date: string; messages: Message[] }[] = [
  {
    date: "25 April",
    messages: [
      { kind: "text", from: "them", body: "Hey man!", time: "10:25" },
      {
        kind: "text",
        from: "me",
        body: "Hey, what’s up? How are you doing, my friends?",
        time: "11:25",
        status: "Sent",
      },
      {
        kind: "text",
        from: "them",
        body: "Have you seen the latest holographic technology?",
        time: "12:25",
      },
      { kind: "voice", from: "me", length: "02:12", time: "01:25", status: "Sent" },
    ],
  },
  {
    date: "Today",
    messages: [
      {
        kind: "video",
        from: "me",
        src: "/images/bonds/video-message.png",
        time: "01:25",
        status: "Sent",
      },
      {
        kind: "link",
        from: "me",
        title: "External Link Title",
        description: "External link description",
        url: "https://www.externallink.com",
        time: "03:25",
      },
    ],
  },
];

export function BondChat({
  name,
  avatar,
  depth,
  duration,
  status,
  onBack,
}: {
  name: string;
  avatar: string;
  depth: number;
  duration: string;
  status: string;
  /** The phone chat (635:19212) leads with a back arrow to the list. */
  onBack?: () => void;
}) {
  // Sent messages are appended locally — there is no backend yet, but the
  // composer should do something rather than swallow what you type.
  const [sent, setSent] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    setSent((prev) => [
      ...prev,
      {
        kind: "text",
        from: "me",
        body,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Sent",
      },
    ]);
    setDraft("");
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col border-l border-ink-50">
      <header className="flex shrink-0 flex-col gap-2.5 border-b border-ink-50 bg-ivory-300 px-6 pt-4 pb-2">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to bonds"
              className="shrink-0 text-ink-800 md:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="size-6"
                aria-hidden="true"
              >
                <path
                  d="M19 12H5m0 0 6-6m-6 6 6 6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <div className="flex flex-1 items-center gap-4 p-2">
            <GlowAvatar src={avatar} online />
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-sans text-base font-medium text-ink-700">
                {name}
              </span>
              <ChapterBadge label={status} />
            </div>
          </div>

          <div className="flex items-center gap-2 text-ink-400">
            <IconButton label="Call"><PhoneIcon /></IconButton>
            <IconButton label="Video call"><VideoIcon /></IconButton>
            <IconButton label="More"><DotsIcon /></IconButton>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-sans text-sm font-medium text-ink-300">
            Bond Depth
          </span>
          <span className="h-1 w-full max-w-[320px] overflow-hidden rounded-full bg-ink-50">
            <span
              className="block h-full rounded-full bg-primary-600"
              style={{ width: `${depth}%` }}
            />
          </span>
          <span className="shrink-0 font-sans text-sm font-medium text-ink-300">
            {duration}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {BOND_THREAD.map((group) => (
          <div key={group.date} className="flex flex-col gap-4">
            {group.date === "Today" ? (
              <div className="flex items-center gap-2">
                <span className="h-px flex-1 bg-ink-50" />
                <span className="font-sans text-sm font-semibold text-ink-300">
                  {group.date}
                </span>
                <span className="h-px flex-1 bg-ink-50" />
              </div>
            ) : (
              <p className="text-center font-sans text-sm font-medium text-ink-300">
                {group.date}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {group.messages.map((m, i) => (
                <Bubble key={i} message={m} avatar={avatar} />
              ))}
            </div>
          </div>
        ))}

        {sent.length > 0 && (
          <div className="flex flex-col gap-3">
            {sent.map((m, i) => (
              <Bubble key={`sent-${i}`} message={m} avatar={avatar} />
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 p-5">
        <div className="flex items-center gap-4 rounded-full border border-ink-50 bg-white p-3 shadow-[0px_2px_4px_-2px_rgba(23,23,23,0.06),0px_4px_8px_-2px_rgba(23,23,23,0.1)]">
          <button
            type="button"
            aria-label="Add attachment — not available yet"
            title="Not available yet"
            aria-disabled
            className="grid size-8 shrink-0 cursor-not-allowed place-items-center rounded-full text-ink-400 opacity-40"
          >
            <PlusIcon />
          </button>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Write your message..."
            className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink-500 outline-none placeholder:text-ink-500"
          />
          <div className="flex shrink-0 items-center gap-1 text-ink-400">
            <IconButton label="Record voice note"><MicIcon /></IconButton>
            <IconButton label="Send" onClick={send}><SendIcon /></IconButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bubble({ message, avatar }: { message: Message; avatar: string }) {
  const mine = message.from === "me";

  return (
    <div className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <span className="relative size-10 shrink-0 self-end overflow-hidden rounded-full">
          <Image src={avatar} alt="" fill sizes="40px" className="object-cover" />
        </span>
      )}

      <div className={cn("flex max-w-[334px] flex-col gap-1", mine && "items-end")}>
        {message.kind === "text" && (
          <div
            className={cn(
              "flex items-end gap-2.5 rounded-2xl p-3",
              mine
                ? "bg-primary-600 text-ink-0"
                : "border border-ink-50 bg-white text-ink-700",
            )}
          >
            <p className="font-sans text-sm font-medium">{message.body}</p>
            <span
              className={cn(
                "shrink-0 font-sans text-xs font-medium",
                mine ? "text-primary-50" : "text-ink-500",
              )}
            >
              {message.time}
            </span>
          </div>
        )}

        {message.kind === "voice" && (
          <div className="flex flex-col items-center gap-2 rounded-2xl bg-primary-600 p-3 text-ink-0">
            <div className="flex items-center gap-3">
              <PlayIcon className="size-6" />
              <Waveform />
            </div>
            <div className="flex w-full items-center justify-between gap-4">
              <span className="font-sans text-xs font-bold">{message.length}</span>
              <span className="font-sans text-xs font-medium text-primary-50">
                {message.time}
              </span>
            </div>
          </div>
        )}

        {message.kind === "video" && (
          <div className="flex flex-col gap-1 rounded-2xl border border-ink-50 bg-white p-1">
            <div className="relative overflow-hidden rounded-xl">
              <Image
                src={message.src}
                alt=""
                width={320}
                height={200}
                className="h-auto w-full object-cover"
              />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-16 place-items-center rounded-full border border-white/30 bg-[rgba(2,6,23,0.32)] text-white backdrop-blur-[16px]">
                  <PlayIcon className="size-7" />
                </span>
              </span>
            </div>
            <span className="px-2 pb-1 text-right font-sans text-xs font-medium text-ink-500">
              {message.time}
            </span>
          </div>
        )}

        {message.kind === "link" && (
          <div className="flex flex-col gap-1 rounded-2xl bg-primary-600 p-1">
            <div className="flex items-start gap-2 rounded-xl border border-primary-500 bg-primary-700 p-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-sans text-base font-bold text-ink-0">
                  {message.title}
                </span>
                <span className="font-sans text-xs font-medium text-white/60">
                  {message.description}
                </span>
              </div>
              <LinkIcon className="size-6 shrink-0 text-ink-0" />
            </div>
            <div className="flex items-center gap-3 p-2">
              <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-ink-0">
                {message.url}
              </span>
              <span className="shrink-0 font-sans text-xs font-medium text-primary-200">
                {message.time}
              </span>
            </div>
          </div>
        )}

        {"status" in message && message.status && (
          <span className="flex items-center gap-1 font-sans text-xs font-semibold text-ink-500">
            <CheckIcon className="size-4" />
            {message.status}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Chapter badge — Figma frame 452:10382. ivory-200 pill, 4/12 padding, a 20px
 * chapter illustration beside the member's current phase in ivory-900.
 */
export function ChapterBadge({ label }: { label: string }) {
  return (
    <span className="flex w-fit items-center gap-2 rounded-full bg-ivory-200 px-3 py-1">
      <Image
        src="/images/people/m2.png"
        alt=""
        width={20}
        height={20}
        className="size-5 shrink-0 rounded-full object-cover"
      />
      <span className="font-sans text-sm font-medium text-ivory-900">
        {label}
      </span>
    </span>
  );
}

/** Avatar with the amber ring + glow Figma gives bond members. */
export function GlowAvatar({
  src,
  online = false,
  size = 48,
}: {
  src: string;
  online?: boolean;
  size?: number;
}) {
  return (
    <span
      className="relative shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)",
      }}
    >
      <Image
        src={src}
        alt=""
        fill
        sizes="48px"
        className="rounded-full object-cover"
      />
      {online && (
        <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-white bg-success-60" />
      )}
    </span>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  // Calls, capture and uploads need capabilities this build does not have, so
  // those controls say so rather than silently doing nothing.
  const unavailable = !onClick;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={unavailable ? `${label} — not available yet` : label}
      title={unavailable ? "Not available yet" : undefined}
      aria-disabled={unavailable || undefined}
      className={cn(
        "grid size-8 place-items-center rounded-full transition-colors",
        unavailable
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-ivory-200",
      )}
    >
      {children}
    </button>
  );
}

/** The recording waveform inside a voice note (Figma 5530:2823). */
function Waveform() {
  const bars = [6, 14, 26, 19, 2, 12, 10, 3, 7, 8, 13, 18, 24, 16, 5, 10, 29, 12, 6, 3];
  return (
    <span className="flex h-8 items-center gap-[3px]">
      {bars.map((h, i) => (
        <span
          key={i}
          className="w-[2px] rounded-full bg-white/80"
          style={{ height: `${h}px` }}
        />
      ))}
    </span>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M7 3.5 9 8l-2 1.5a11 11 0 0 0 6 6L14.5 13l4.5 2v3.5a2 2 0 0 1-2.2 2A17 17 0 0 1 3.5 5.7 2 2 0 0 1 5.5 3.5H7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <rect x="3" y="6" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m15 11 5-3v8l-5-3v-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden="true">
      <circle cx="6" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="18" cy="12" r="1.7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <rect x="9" y="2.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path d="M4 12 20 4l-8 16-2-6-6-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7L11.5 6.8M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="m1.5 8.5 3 3 6-6M9 11.5l1 1 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
