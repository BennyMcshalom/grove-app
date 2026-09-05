"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PostCard, type Post } from "@/components/app/PostCard";
import { RightRail } from "@/components/app/RightRail";
import { useToast } from "@/components/app/ToastProvider";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";

/**
 * A space — Figma frames 172:3169 (Roots), 172:4641 (Open), 172:6133
 * (Anonymous) and 172:6458 (Ask Members).
 *
 * The chapter's status line above four tabs, beside the "IN THIS SPACE" rail.
 * All copy is Figma's.
 */
const TABS = ["Roots", "Open", "Anonymous", " Ask Members"];

const MEMBERS = [
  "/images/people/m1.png",
  "/images/people/m2.png",
  "/images/people/m3.png",
  "/images/people/m5.png",
];

/** Frame 172:3169 — the Roots feed, on Figma's default post. */
const ROOTS: Post[] = Array.from({ length: 2 }, (_, i) => ({
  id: String(i),
  author: "Helena Brown",
  avatar: "/images/feed/avatar-helena.png",
  badge: "In progress",
  time: "5 mins ago",
  title: "I think I’m ready for a career change.",
  body: "I’ve been in the same role for almost three years, and lately I’ve been feeling like I’ve outgrown it. I’m excited about what could come next, but honestly, I’m also scared of starting over.",
  roots: 22,
  comments: 8,
}));

/** Frame 172:6458 — the members you can ask. */
const ASKABLE = [
  "Helena Brown",
  "Marcus Smith",
  "Lydia Chen",
  "Raj Patel",
  "Sofia Garcia",
  "Sofia Garcia",
];

export default function SpacePage() {
  const params = useParams<{ chapter: string }>();
  const chapter = getChapter(params.chapter);
  const [tab, setTab] = useState(TABS[0]);
  const [ask, setAsk] = useState("");
  const toast = useToast();

  if (!chapter) return null;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 bg-white px-6 py-6 lg:px-8">
          <Image
            src={chapter.icon}
            alt=""
            width={56}
            height={56}
            className="size-10 shrink-0"
          />
          <h1 className="font-display text-2xl font-semibold text-ink-600">
            {chapter.name}
          </h1>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-8 pb-10">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <p className="font-sans text-base text-ink-500">
                  Building a habit
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
                    4 connection in this space
                  </span>
                </div>
                <span className="flex w-fit items-center gap-1 rounded-full bg-ivory-500 px-2 py-1">
                  <span className="size-1.5 rounded-full bg-primary-600" />
                  <span className="font-sans text-xs font-medium text-ink-400">
                    In progress
                  </span>
                </span>
              </div>

              <div role="tablist" className="flex">
                {TABS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={t === tab}
                    onClick={() => setTab(t)}
                    className={cn(
                      "h-10 flex-1 border-b-2 px-2 py-2 font-sans text-sm font-medium whitespace-nowrap transition-colors",
                      t === tab
                        ? "border-primary-600 text-ink-800"
                        : "border-ivory-600 text-ink-500 hover:border-ivory-700",
                    )}
                  >
                    {t.trim()}
                  </button>
                ))}
              </div>
            </div>

            {tab === "Roots" && (
              <div className="flex flex-col gap-6">
                {ROOTS.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {tab === "Open" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5">
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-base font-semibold text-ink-600">
                      Search across regions
                    </span>
                    <span className="font-sans text-sm text-ink-300">
                      See this space beyond people near you
                    </span>
                  </div>
                  <Button variant="secondary" size="sm">
                    Search
                  </Button>
                </div>

                <p className="font-sans text-sm text-ink-400">
                  Posts from people outside your circle, in the same stage.
                  Connect to bring them in
                </p>

                <ul className="flex flex-col gap-4">
                  {[0, 1, 2].map((i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-3 rounded-2xl bg-white p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
                            <Image
                              src="/images/feed/avatar-helena.png"
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          </span>
                          <span className="font-sans text-lg font-semibold text-ink-700">
                            Helena Brown
                          </span>
                          <span className="rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
                            in the thick of it
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            toast({
                              title:
                                "Connect request sent. We'll let you know when they accept.",
                            })
                          }
                          className="rounded-full px-3 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
                        >
                          Connect
                        </button>
                      </div>
                      <h2 className="font-sans text-xl font-semibold text-ink-700">
                        I think I&rsquo;m ready for a career change.
                      </h2>
                      <p className="font-sans text-base text-ink-400">
                        I&rsquo;ve been in the same role for almost three years,
                        and lately I&rsquo;ve been feeling like I&rsquo;ve
                        outgrown it. I&rsquo;m excited about what could come
                        next, but honestly, I&rsquo;m also scared of starting
                        over.
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tab === "Anonymous" && (
              <div className="flex flex-col gap-6">
                <section className="flex flex-col gap-4">
                  <h2 className="font-sans text-base text-ink-400">YOUR ASK</h2>
                  <div className="flex flex-col gap-3 rounded-2xl bg-white p-5">
                    <textarea
                      value={ask}
                      onChange={(e) => setAsk(e.target.value)}
                      rows={3}
                      placeholder="Ask the space something you're sitting with. Replies come back without names."
                      className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 outline-none placeholder:text-ink-500 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="font-sans text-sm text-ink-300">
                        Live for 7 days &middot; Replies come back without names
                      </span>
                      <Button
                        size="sm"
                        disabled={!ask.trim()}
                        onClick={() => {
                          setAsk("");
                          toast({ title: "Anonymous question sent to space" });
                        }}
                      >
                        Ask
                      </Button>
                    </div>
                  </div>
                </section>

                <div className="flex flex-col gap-4 rounded-2xl bg-white p-5">
                  <p className="rounded-lg bg-ivory-100 px-4 py-3 font-sans text-base text-ink-500">
                    &ldquo;How do you keep going when no one is watching
                    yet&rdquo;
                  </p>
                  <button
                    type="button"
                    className="flex w-fit items-center gap-2 rounded-full bg-primary-50 px-4 py-2.5 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-100"
                  >
                    <MicIcon />
                    Record a reply
                  </button>
                </div>
              </div>
            )}

            {tab === " Ask Members" && (
              <ul className="flex flex-col gap-4">
                {ASKABLE.map((name, i) => (
                  <li
                    key={`${name}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-5"
                  >
                    <span className="flex items-center gap-2">
                      <span className="relative size-10 shrink-0 overflow-hidden rounded-full">
                        <Image
                          src={MEMBERS[i % MEMBERS.length]}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                      <span className="font-sans text-lg font-semibold text-ink-700">
                        {name}
                      </span>
                      <span className="rounded-full bg-ivory-500 px-2 py-1 font-sans text-xs font-medium text-ink-400">
                        in the thick of it
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => toast({ title: "Invite sent" })}
                      className="flex items-center gap-2 rounded-full bg-primary-100 px-3 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-200"
                    >
                      Enter Grouv
                      <ArrowRight className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <RightRail variant="space" />
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <rect
        x="6"
        y="2"
        width="4"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
