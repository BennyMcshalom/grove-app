"use client";

import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { FeedList } from "@/components/app/FeedList";
import { useDismiss } from "@/components/app/PostMenu";
import { TopBar } from "@/components/app/TopBar";
import { getChapter } from "@/lib/chapters";
import type { FeedPage, FeedQuery } from "@/lib/posts";
import type { Aura } from "@/lib/profile";

/**
 * The lean profile (2026-11-26): photo, name, their Spaces and location, a
 * line of bio, the actions, then their posts as a plain list. Yours and
 * everyone else's share it. The banner, rings, prompts and Grouv Logs tab of
 * the full Grouv page are hidden behind FEATURES.richProfile, not deleted.
 */
export function LeanProfilePage({
  title,
  back,
  header,
  children,
}: {
  title: string;
  back?: string;
  header: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title={title} back={back} />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6 pb-10">
          {header}
          {children}
        </div>
      </div>
    </div>
  );
}

export function LeanProfileHeader({
  userId,
  name,
  avatarUrl,
  aura,
  chapters,
  locationLabel,
  bio,
  label,
  children,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
  aura?: Aura;
  chapters: { slug: string; phase?: string | null }[];
  locationLabel?: string | null;
  bio?: string | null;
  /** "In your circle", "Bonded", … */
  label?: string | null;
  /** The action buttons. */
  children?: React.ReactNode;
}) {
  const spaces = chapters
    .map((c) => getChapter(c.slug)?.name)
    .filter((n): n is string => Boolean(n));

  return (
    <header className="flex flex-col gap-4 border-b border-ink-50 pb-6">
      <div className="flex items-center gap-4">
        <Avatar src={avatarUrl} name={name} userId={userId} aura={aura} sizes="72px" className="size-16 shrink-0 sm:size-[72px]" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate font-display text-2xl font-semibold text-ink-800">{name}</h1>
          {(spaces.length > 0 || locationLabel) && (
            <p className="truncate font-sans text-sm text-ink-400">
              {[spaces.join(", "), locationLabel].filter(Boolean).join(" · ")}
            </p>
          )}
          {label && <p className="font-sans text-xs font-medium text-primary-600">{label}</p>}
        </div>
      </div>
      {bio && <p className="font-sans text-[15px] leading-relaxed text-ink-600">{bio}</p>}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

/** Their posts, newest first, as the same cards Home uses. */
export function LeanProfilePosts({
  query,
  posts,
  empty,
}: {
  query: Omit<FeedQuery, "cursor">;
  posts: FeedPage;
  empty: React.ReactNode;
}) {
  return (
    <section aria-label="Posts" className="flex flex-col gap-4">
      <h2 className="font-sans text-sm font-semibold text-ink-500">Posts</h2>
      <FeedList query={query} initial={posts} empty={empty} />
    </section>
  );
}

/** The "···" menu that holds the quieter actions (remove, block, report). */
export function MoreMenu({ items }: { items: { label: string; onSelect: () => void; danger?: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(() => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="More options"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full border border-ink-100 text-ink-500 transition-colors hover:bg-ivory-200"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
          <circle cx="4" cy="10" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="16" cy="10" r="1.6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute top-11 left-0 z-20 flex min-w-44 flex-col rounded-xl border border-ink-50 bg-surface p-1.5 shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={
                "rounded-lg px-3 py-2 text-left font-sans text-sm transition-colors hover:bg-ivory-200 " +
                (item.danger ? "text-destructive-60" : "text-ink-700")
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
