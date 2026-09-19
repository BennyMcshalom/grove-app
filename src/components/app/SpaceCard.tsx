"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/app/Avatar";
import { CloseChapterWizard } from "@/components/app/CloseChapterWizard";
import { JoinSpaceModal } from "@/components/app/JoinSpaceModal";
import { useToast } from "@/components/app/ToastProvider";
import { closeChapter, joinSpace } from "@/app/(app)/spaces/actions";
import type { Chapter } from "@/lib/chapters";

/**
 * Open chapter card — Figma component 169:2314.
 *
 * Icon + chapter name, current status, an overlapping avatar group with the
 * member count, an "In progress" dot badge, then Open feed / Close chapter.
 */
export function OpenSpaceCard({
  userChapterId,
  chapter,
  status,
  members,
  avatars,
}: {
  userChapterId: string;
  chapter: Chapter;
  status: string;
  members: number;
  /** Up to four member photos. */
  avatars: string[];
}) {
  const [confirming, setConfirming] = useState(false);
  const [closed, setClosed] = useState(false);
  const toast = useToast();

  return (
    <article className="flex flex-col justify-between gap-4 rounded-lg bg-surface p-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ChapterIcon chapter={chapter} />
          <div className="flex flex-col">
            <span className="font-sans text-lg font-semibold text-ink-800">
              {chapter.name}
            </span>
            <span className="font-sans text-xs text-ink-400">{status}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {avatars.length > 0 && (
            <span className="flex">
              {avatars.map((src, i) => (
                <span
                  key={src}
                  className="rounded-full border-2 border-surface"
                  style={{ marginLeft: i === 0 ? 0 : -6 }}
                >
                  <Avatar src={src} name="" sizes="24px" className="size-5" />
                </span>
              ))}
            </span>
          )}
          <span className="font-sans text-xs text-ink-400">
            {members} in this space
          </span>
        </div>

        <span className="flex w-fit items-center gap-1 rounded-full bg-ivory-500 px-2 py-1">
          <span className="size-1.5 rounded-full bg-primary-600" />
          <span className="font-sans text-xs font-medium text-ink-400">
            In progress
          </span>
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          fullWidth
          href={`/spaces/${chapter.slug}`}
          className="px-3 py-1.5 text-xs"
        >
          Open feed
        </Button>
        {closed ? (
          <p className="px-3 py-1.5 text-center font-sans text-xs text-ink-300">
            Chapter closed and added to life archive
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full rounded-full px-3 py-1.5 font-ui text-xs text-destructive-60 transition-colors hover:bg-destructive-5"
          >
            Close chapter
          </button>
        )}

        {confirming && (
          <CloseChapterWizard
            chapter={chapter}
            onClose={() => setConfirming(false)}
            onFinish={async (answers) => {
              const result = await closeChapter({ userChapterId, ...answers });
              if (result.error) return result;
              setConfirming(false);
              setClosed(true);
              toast({ title: "Chapter closed and added to life archive" });
              return {};
            }}
          />
        )}
      </div>
    </article>
  );
}

/**
 * Directory card — Figma frame 169:2081. Same shell, but a single "Join"
 * secondary button and no member row.
 */
export function DirectorySpaceCard({ chapter }: { chapter: Chapter }) {
  // "Join" opens the chapter's "where are you?" sheet (223:14200).
  const [joining, setJoining] = useState(false);
  const toast = useToast();

  return (
    <article className="flex h-[142px] flex-col justify-between rounded-lg bg-surface p-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <ChapterIcon chapter={chapter} />
          <div className="flex flex-col">
            <span className="font-sans text-lg font-semibold text-ink-800">
              {chapter.name}
            </span>
            <span className="font-sans text-xs text-ink-400">
              {chapter.tagline}
            </span>
          </div>
        </div>
      </div>

      <Button
        variant="secondary"
        size="sm"
        fullWidth
        className="px-3 py-1.5 text-xs"
        onClick={() => setJoining(true)}
      >
        Join
      </Button>

      {joining && (
        <JoinSpaceModal
          chapter={chapter}
          onClose={() => setJoining(false)}
          onJoin={async ([phase]) => {
            const result = await joinSpace(chapter.slug, phase);
            if (result.error) return result;
            // The page refreshes and this chapter moves up to "Your open chapters".
            setJoining(false);
            toast({ title: "New space added" });
            return {};
          }}
        />
      )}
    </article>
  );
}

/** The tinted circle + chapter glyph used on both card types. */
function ChapterIcon({ chapter }: { chapter: Chapter }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full">
      <Image
        src={chapter.icon}
        alt=""
        width={56}
        height={56}
        className="size-9"
      />
    </span>
  );
}
