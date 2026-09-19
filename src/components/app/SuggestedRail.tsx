"use client";

import Link from "next/link";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { useEffect, useState } from "react";
import {
  ChapterGroupCard,
  GROUP_GRADIENT,
} from "@/components/app/ChapterGroupCard";
import { loadSuggestedGroups } from "@/app/(app)/groups/actions";
import type { Group } from "@/lib/groups";

/**
 * SUGGESTED FOR YOUR CHAPTER — Figma frame 575:17911 (the My Group right rail).
 *
 * A 396px column of gradient cards for groups in your chapters you haven't
 * joined: the first takes the warm orange wash, the rest the pink one.
 */
export function SuggestedRail() {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSuggestedGroups(6).then((result) => {
      if (!cancelled) setGroups(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="hidden w-[396px] shrink-0 scroll-slim overflow-y-auto bg-surface px-8 py-6 xl:block">
      <div className="flex flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-sans text-base font-medium text-ink-600">
            SUGGESTED FOR YOUR CHAPTER
          </h2>
          <Link
            href="/groups"
            className="shrink-0 font-sans text-sm font-medium text-primary-500 hover:underline"
          >
            See all
          </Link>
        </header>

        {groups === null ? (
          <PersonRowsSkeleton count={3} label="Loading suggestions" />
        ) : groups.length === 0 ? (
          <p className="font-sans text-sm text-ink-300">
            Groups in your chapters show up here as people start them.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {groups.map((group, i) => (
              <li key={group.id}>
                <ChapterGroupCard
                  title={group.title}
                  blurb={group.label}
                  href={`/groups/${group.slug}`}
                  avatars={group.memberAvatars}
                  memberCount={group.memberCount}
                  gradient={i === 0 ? GROUP_GRADIENT.orange : GROUP_GRADIENT.pink}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
