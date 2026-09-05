"use client";

import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SuggestedRail } from "@/components/app/SuggestedRail";
import { getGroup } from "@/lib/groups";
import { cn } from "@/lib/cn";

/**
 * Chapter group — Figma frames 205:8408 / 222:13524 (Conversation),
 * 206:10081 (Truth Board) and 206:10507 (Video Truths).
 *
 * The group's blurb, member stack and phase badge, then either the join
 * request card, the "Request sent" confirmation (222:13844) or the admin
 * banner (205:9937), then the three tabs. All copy is Figma's.
 */
const TABS = ["Conversation", "Truth Board", "Video Truths"];

/** Frame 222:13524 — the conversation, verbatim. */
const MESSAGES = [
  {
    author: "Amara",
    time: "09:03am",
    body: "I’m literally in the same place right now. The fear of starting over is real.",
    avatar: "/images/people/m2.png",
  },
  {
    author: "Amara",
    time: "09:03am",
    mention: "@amara",
    body: " I’m literally in the same place right now. The fear of starting over is real.",
    avatar: "/images/people/m2.png",
  },
  {
    author: "Jasper",
    time: "09:01am",
    body: "Change can be daunting, but it often leads to the most rewarding experiences.",
    avatar: "/images/people/m4.png",
  },
  {
    author: "Nia",
    time: "08:00am",
    body: "Every ending is just a new beginning waiting to unfold.",
    avatar: "/images/people/nina.png",
  },
  {
    author: "Theo",
    time: "08:00am",
    body: "Sometimes, the hardest step is just deciding to take it.",
    avatar: "/images/people/m1.png",
  },
  {
    author: "Lila",
    time: "08:00am",
    body: "I've found that taking small steps can make the transition smoother.",
    avatar: "/images/people/lena.png",
  },
  {
    author: "Ravi",
    time: "08:00am",
    body: "Embrace the uncertainty; it often leads to unexpected opportunities.",
    avatar: "/images/people/m3.png",
  },
];

const TRUTH =
  "I don’t know who needs to hear this, but.....\n....but you’re not behind. You’re just on your own timeline.";

const MEMBERS = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m5.png",
];

export default function GroupPage() {
  const params = useParams<{ id: string }>();
  const group = getGroup(params.id);
  // Frame 205:9609 is the same screen entered as an admin.
  const admin = useSearchParams().get("admin") === "1";

  const [tab, setTab] = useState(TABS[0]);
  const [requested, setRequested] = useState(false);
  const [truth, setTruth] = useState("");
  const [comment, setComment] = useState("");

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Frame 205:8480 — the glyph beside the group name. */}
        <header className="flex shrink-0 items-center gap-2 bg-white px-6 py-6 lg:px-8">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-600">
            <Glyph icon={group.icon} className="size-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-ink-800">
            {group.title}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-8 pb-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="font-sans text-base text-ink-500">
                  For people building something from nothing, right now.
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="flex">
                    {MEMBERS.map((src, i) => (
                      <span
                        key={src}
                        className="relative size-6 overflow-hidden rounded-full border-2 border-white"
                        style={{ marginLeft: i === 0 ? 0 : -6 }}
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="24px"
                          className="object-cover"
                        />
                      </span>
                    ))}
                  </span>
                  <span className="ml-2 font-sans text-xs text-ink-400">
                    4 in this chapter&rsquo;s group chat
                  </span>
                </div>
                <span className="flex w-fit items-center gap-1 rounded-full bg-ivory-500 px-2 py-1">
                  <span className="size-1.5 rounded-full bg-primary-600" />
                  <span className="font-sans text-xs font-medium text-ink-400">
                    In progress
                  </span>
                </span>
              </div>

              {admin ? (
                /* Frame 205:9937 — admins skip the request card entirely. */
                <div className="flex gap-3 rounded-2xl bg-primary-50 p-4">
                  <LockIcon />
                  <div className="flex flex-col gap-2">
                    <span className="font-sans text-lg font-semibold text-primary-500">
                      Admin access
                    </span>
                    <p className="font-sans text-base text-primary-500">
                      You&rsquo;re joined to  this conversation as an admin.
                      Full conversation below
                    </p>
                  </div>
                </div>
              ) : requested ? (
                /* Frame 222:13844 — the sent confirmation. */
                <section className="flex flex-col items-center gap-2 rounded-2xl bg-white px-6 py-8 text-center">
                  <span className="grid size-10 place-items-center rounded-full bg-primary-50 text-primary-600">
                    <CheckIcon />
                  </span>
                  <h2 className="font-display text-2xl font-semibold text-[#101928]">
                    Request sent
                  </h2>
                  <p className="font-sans text-base text-ink-400">
                    An admin wil review it. No rush, no rankl
                  </p>
                </section>
              ) : (
                <section className="flex flex-col gap-6 rounded-2xl bg-white px-6 py-6 lg:px-8">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <h2 className="font-display text-2xl font-semibold text-[#101928]">
                      Request to join this chapter
                    </h2>
                    <p className="font-sans text-base text-ink-400">
                      An admin reviews every chapter{" "}
                    </p>
                  </div>
                  <div className="border-t border-ink-50 pt-6">
                    <button
                      type="button"
                      onClick={() => setRequested(true)}
                      className="w-full rounded-full bg-primary-500 px-6 py-2.5 font-ui text-sm text-ink-50 transition-colors hover:bg-primary-400"
                    >
                      Send join request
                    </button>
                  </div>
                </section>
              )}

              <div role="tablist" className="flex">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={t === tab}
                    onClick={() => setTab(t)}
                    className={cn(
                      "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium transition-colors",
                      t === tab
                        ? "border-primary-600 text-ink-800"
                        : "border-ivory-600 text-ink-500 hover:border-ivory-700",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {tab === "Conversation" && (
              <ul className="flex flex-col gap-5">
                {MESSAGES.map((message, i) => (
                  <li key={i} className="flex gap-4">
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
                        <span className="font-sans text-base font-medium text-ink-700">
                          {message.author}
                        </span>
                        <span className="font-sans text-sm text-ink-300">
                          {message.time}
                        </span>
                      </span>
                      <p className="font-sans text-sm text-ink-400">
                        {message.mention && (
                          <span className="text-primary-600">
                            {message.mention}
                          </span>
                        )}
                        {message.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {tab === "Truth Board" && (
              <div className="flex flex-col gap-4">
                <h2 className="font-sans text-base text-ink-400">TRUTH BOARD</h2>

                {/* Frame 48097631 — the anonymous prompt. */}
                <div className="flex flex-col gap-4 rounded-2xl bg-white p-5">
                  <p className="font-sans text-base text-ink-500">
                    I don&rsquo;t know who needs to hear this, but......
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      value={truth}
                      onChange={(e) => setTruth(e.target.value)}
                      placeholder="Finish this sentence anonymously"
                      className="min-w-0 flex-1 rounded-lg bg-ivory-100 px-4 py-4 font-sans text-sm text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
                    />
                    <button
                      type="button"
                      disabled={!truth.trim()}
                      onClick={() => setTruth("")}
                      aria-label="Post anonymously"
                      className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <SendIcon />
                    </button>
                  </div>
                </div>

                <ul className="flex flex-col gap-4">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-4 rounded-2xl bg-white p-5"
                    >
                      <p className="font-sans text-base whitespace-pre-line text-ink-500">
                        {TRUTH}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-sans text-xs text-ink-300">
                          Someone in this chapter
                          <span className="size-1 rounded-full bg-ink-100" />
                          3hours ago
                        </span>
                        <span className="flex items-center gap-1.5 font-sans text-xs text-ink-300">
                          <BoltIcon />
                          22 people felt this
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "Video Truths" && (
              <div className="flex flex-col gap-4">
                <h2 className="font-sans text-base text-ink-400">
                  VIDEO TRUTHS{" "}
                </h2>

                <div className="flex flex-col gap-4 rounded-2xl bg-white p-5">
                  <p className="font-sans text-base text-ink-500">
                    I don&rsquo;t know who needs to hear this, but...... said out
                    loud
                  </p>
                  {/* "upload: drag upload" — dashed primary border on primary-50.
                      `relative` keeps the sr-only input inside this box. */}
                  <label className="relative flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-primary-600 bg-primary-50 p-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-600">
                      <VideoIcon />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-sans text-sm font-medium text-primary-600">
                        Record a video truth
                      </span>
                      <span className="font-sans text-xs text-primary-600">
                        Same theme, said out loud
                      </span>
                    </span>
                    <input type="file" accept="video/*" className="sr-only" />
                  </label>
                </div>

                <ul className="grid gap-4 sm:grid-cols-3">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink-900"
                    >
                      <Image
                        src="/images/feed/post-video.png"
                        alt=""
                        fill
                        sizes="(min-width: 640px) 230px, 100vw"
                        className="object-cover"
                      />
                      <span className="absolute inset-0 grid place-items-center">
                        <span className="grid size-12 place-items-center rounded-full bg-white text-primary-600">
                          <PlayIcon />
                        </span>
                      </span>
                      <span className="absolute top-3 right-3 rounded-full bg-ink-900/60 px-3 py-1 font-sans text-xs text-white">
                        0:41
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {admin && (
          /* Frame 222:13512 — the comment bar admins get. */
          <div className="shrink-0 border-t border-ink-50 bg-white px-4 py-5 lg:px-8">
            <div className="mx-auto flex w-full max-w-[724px] items-center gap-3">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment......"
                aria-label="Add a comment"
                className="min-w-0 flex-1 rounded-2xl bg-ivory-100 px-5 py-4 font-sans text-xs text-ink-300 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
              />
              <button
                type="button"
                disabled={!comment.trim()}
                onClick={() => setComment("")}
                aria-label="Send comment"
                className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-500 text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <SendIcon />
              </button>
            </div>
          </div>
        )}
      </div>

      <SuggestedRail />
    </div>
  );
}

function Glyph({ icon, className }: { icon: string; className?: string }) {
  return (
    <span
      className={cn("bg-current", className)}
      style={{
        maskImage: `url(/icons/events/${icon}.svg)`,
        WebkitMaskImage: `url(/icons/events/${icon}.svg)`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6" aria-hidden="true">
      <path
        d="m5 12.5 5 5 9-11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M9 1.5 3.5 9H8l-1 5.5L12.5 7H8l1-5.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <rect
        x="3"
        y="6"
        width="13"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 11.5 21 9v6l-5-2.5v-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-5"
      aria-hidden="true"
    >
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className="size-8 shrink-0 text-primary-500"
      aria-hidden="true"
    >
      <rect
        x="7"
        y="14"
        width="18"
        height="13"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M11 14v-3a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-5" aria-hidden="true">
      <path
        d="M4 12 20 4l-8 16-2-6-6-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
