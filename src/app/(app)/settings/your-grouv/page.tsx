"use client";

import Image from "next/image";
import { useState } from "react";
import { GrouvRings } from "@/components/app/GrouvRings";
import { PostCard, type Post } from "@/components/app/PostCard";
import { TopBar } from "@/components/app/TopBar";
import { cn } from "@/lib/cn";

/**
 * Your Grouv — Figma frames 417:16407 (Your Posts) and 435:18506 (Your Grouv
 * Logs).
 *
 * A 1096px column: the rings hero (489:17418), then a two-tab group whose
 * first tab lists your posts and whose second shows the logged days as a row
 * of captioned photo tiles (435:19253).
 */
const TABS = ["Your Posts", "Your Grouv Logs"];

/**
 * Figma leaves the Post instances on their default content (Helena Brown,
 * frames 435:18285–18331); the copy, badge, timestamps and counts below are
 * those instances verbatim, re-attributed to the profile owner since the tab
 * is "Your Posts".
 */
const POSTS: Post[] = [
  {
    id: "1",
    author: "Oreoluwa",
    avatar: "/images/avatar-oreoluwa.png",
    badge: "In progress",
    time: "5 mins ago",
    title: "I think I’m ready for a career change.",
    body: "I’ve been in the same role for almost three years, and lately I’ve been feeling like I’ve outgrown it. I’m excited about what could come next, but honestly, I’m also scared of starting over.",
    roots: 22,
    comments: 8,
  },
  {
    id: "2",
    author: "Oreoluwa",
    avatar: "/images/avatar-oreoluwa.png",
    badge: "In progress",
    time: "5 mins ago",
    body: "Took the long way home today and actually noticed the walk. Small thing, but it helped.",
    media: { src: "/images/feed/post-photo.png", kind: "photo" },
    roots: 22,
    comments: 8,
  },
  {
    id: "3",
    author: "Oreoluwa",
    avatar: "/images/avatar-oreoluwa.png",
    badge: "In progress",
    time: "5 mins ago",
    body: "Caption here",
    media: { src: "/images/log/memory-2.png", kind: "photo" },
    roots: 22,
    comments: 8,
  },
  {
    id: "4",
    author: "Oreoluwa",
    avatar: "/images/avatar-oreoluwa.png",
    badge: "In progress",
    time: "5 mins ago",
    body: "Recorded a short update on where the move is at. Still figuring it out as I go.",
    media: { src: "/images/feed/post-video.png", kind: "video" },
    roots: 22,
    comments: 8,
  },
];

/** Frame 435:19253 — four logged days, all on Figma's default content. */
const LOGS = [
  "/images/log/memory-1.png",
  "/images/log/memory-2.png",
  "/images/log/memory-3.png",
  "/images/log/memory-4.png",
].map((src) => ({
  src,
  day: "Day 5",
  date: "Apr. 10",
  caption: "Shipped the ugly version. It’s out",
}));

export default function YourGrouvPage() {
  const [tab, setTab] = useState(TABS[0]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Your Grouv" />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-10 pb-10">
          <GrouvRings />

          <div className="flex flex-col gap-6">
            {/* Tab Group 71:5396 — bottom border, primary-600 when active. */}
            <div role="tablist" className="flex">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={t === tab}
                  onClick={() => setTab(t)}
                  className={cn(
                    "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium text-ink-500 transition-colors",
                    t === tab
                      ? "border-primary-600"
                      : "border-ivory-600 hover:border-ivory-700",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === TABS[0] ? (
              <div className="flex flex-col gap-6">
                {POSTS.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-white px-4 py-3">
                <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {LOGS.map((log, i) => (
                    <li
                      key={`${log.src}-${i}`}
                      className="relative aspect-[254/219] overflow-hidden rounded-[20px] border border-ink-100"
                    >
                      <Image
                        src={log.src}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 254px, 45vw"
                        className="object-cover"
                      />
                      <span className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-ink-900/70 to-transparent px-3 py-3">
                        <span className="flex items-center gap-2 font-sans text-[10px] font-medium text-ink-50">
                          {log.day}
                          <span className="size-1 rounded-full bg-ink-50" />
                          {log.date}
                        </span>
                        <span className="text-center font-sans text-sm font-medium text-white">
                          {log.caption}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
