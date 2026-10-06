"use client";

import { useState } from "react";
import { FeedList } from "@/components/app/FeedList";
import { MomentViewer } from "@/components/app/LogCoverflow";
import { PostModal, usePostModal } from "@/components/app/PostModal";
import { PostTile } from "@/components/app/PostTile";
import { ProfileBanner } from "@/components/app/ProfileBanner";
import { TopBar } from "@/components/app/TopBar";
import { Photo } from "@/components/ui/Media";
import { cn } from "@/lib/cn";
import { logDateLabel, type LogEntry } from "@/lib/log";
import type { FeedPage, FeedQuery } from "@/lib/posts";

/**
 * A Grouv page — yours (Your Grouv, Figma 417:16407 / 435:18506) and
 * everyone else's (/people/<id>) are the same page: a 1096px column with the
 * banner on top of the rings card, then a two-tab group whose tabs are both a
 * 3-column grid of 9:16 tiles, newest first — posts, and logged moments.
 * Posts open in a modal over the page; moments in the moment viewer.
 */
export function GrouvPage({
  title,
  back,
  hero,
  children,
}: {
  title: string;
  back?: string;
  /** GrouvHero. */
  hero: React.ReactNode;
  /** GrouvTabs, or nothing while they're blocked. */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title={title} back={back} />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-10 pb-10">
          {hero}
          {children}
        </div>
      </div>
    </div>
  );
}

/** The banner strip on top of the rings card. */
export function GrouvHero({
  banner,
  seed,
  bannerAction,
  children,
}: {
  banner: string | null;
  seed: string;
  /** "Change banner" on your own. */
  bannerAction?: React.ReactNode;
  /** GrouvRings. */
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface">
      <ProfileBanner banner={banner} seed={seed} className="h-16 sm:h-20" />
      {bannerAction}
      {children}
    </div>
  );
}

export function GrouvTabs({
  labels,
  postsQuery,
  posts,
  postsEmpty,
  logs,
  logsEmpty,
}: {
  labels: [posts: string, logs: string];
  postsQuery: Omit<FeedQuery, "cursor">;
  posts: FeedPage;
  postsEmpty: React.ReactNode;
  logs: LogEntry[];
  logsEmpty: React.ReactNode;
}) {
  const [tab, setTab] = useState<"posts" | "logs">("posts");
  const [opened, setOpened] = useState<LogEntry | null>(null);
  const modal = usePostModal();

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Group 71:5396 — bottom border, primary-600 when active. */}
      <div role="tablist" className="flex">
        {(["posts", "logs"] as const).map((value, i) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "h-10 flex-1 border-b-2 px-4 py-2 font-sans text-sm font-medium text-ink-500 transition-colors",
              tab === value ? "border-primary-600" : "border-ivory-600 hover:border-ivory-700",
            )}
          >
            {labels[i]}
          </button>
        ))}
      </div>

      {/* Both tabs are a profile grid: three across, 9:16 tiles, newest
          first (Instagram's layout). */}
      {tab === "posts" ? (
        <FeedList
          query={postsQuery}
          initial={posts}
          layout="grid"
          empty={postsEmpty}
          renderPost={(post) => <PostTile key={post.id} post={post} onOpen={modal.open} />}
        />
      ) : logs.length === 0 ? (
        logsEmpty
      ) : (
        <ul className="mx-auto grid w-full max-w-[720px] grid-cols-3 gap-1 sm:gap-2">
          {logs.map((entry) => (
            <li key={entry.id}>
              <LogTile entry={entry} onOpen={() => setOpened(entry)} />
            </li>
          ))}
        </ul>
      )}
      {opened && <MomentViewer entry={opened} onClose={() => setOpened(null)} />}
      {modal.openId && (
        <PostModal
          key={modal.openId}
          postId={modal.openId}
          initial={modal.known}
          onClose={modal.close}
        />
      )}
    </div>
  );
}

/** A logged moment as a 9:16 tile: its photo, or its words on a warm card. */
export function LogTile({ entry, onOpen }: { entry: LogEntry; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block aspect-[9/16] w-full overflow-hidden rounded-lg bg-ivory-200 text-left sm:rounded-xl"
    >
      {entry.photoUrl ? (
        <>
          {!loaded && <span className="absolute inset-0 shimmer bg-ivory-300" aria-hidden="true" />}
          <Photo
            src={entry.photoUrl}
            alt=""
            fill
            unoptimized
            sizes="(min-width: 1024px) 360px, 33vw"
            onLoad={() => setLoaded(true)}
            className={cn(
              "object-cover transition-[opacity,transform] duration-300 group-hover:scale-[1.03]",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-primary-100 via-ivory-100 to-primary-50 p-3 sm:p-4">
          <span className="line-clamp-[9] font-display text-sm leading-snug text-ink-700 sm:text-base">{entry.body}</span>
        </span>
      )}
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 flex flex-col gap-0.5 px-2.5 pb-2.5",
          entry.photoUrl && "bg-gradient-to-t from-black/65 to-transparent pt-10",
        )}
      >
        {entry.photoUrl && entry.body && (
          <span className="line-clamp-2 font-sans text-xs leading-snug font-medium text-white sm:text-sm">{entry.body}</span>
        )}
        <span className={cn("font-sans text-[10px] font-medium sm:text-xs", entry.photoUrl ? "text-white/85" : "text-ink-400")}>
          Day {entry.dayNumber} · {logDateLabel(entry.entryDate)}
        </span>
      </span>
    </button>
  );
}
