"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { GroupLookPicker } from "@/components/app/GroupLookPicker";
import { usePaywall } from "@/components/app/pass/PaywallProvider";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { FormError } from "@/components/auth/FormError";
import { Button } from "@/components/ui/Button";
import { createGroup, loadTakenGroupColors } from "@/app/(app)/groups/actions";
import { CHAPTERS } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { artForSpace, pickGroupColor, type GroupArtKey } from "@/lib/group-look";

/**
 * Start a group — Figma frame 211:11620.
 *
 * A 660px white card: title + close, the strapline, Chapter Name / Label /
 * Space / what it's for, then the card's look — line-art and one flat colour
 * (testing feedback, 2 Oct 2026, replaced Figma's icon and pastel pickers) —
 * and "Create group" above a top rule. The "Space" select isn't in the frame;
 * it's what lets a group be suggested to people in that chapter, and it
 * decides the starting art and which colours are already taken.
 */
export function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const viewer = useViewer();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [chapterSlug, setChapterSlug] = useState(viewer.chapters[0]?.slug ?? "");
  const [art, setArt] = useState<GroupArtKey>(() => artForSpace(chapterSlug));
  const [artPicked, setArtPicked] = useState(false);
  const [color, setColor] = useState(() => pickGroupColor([]));
  const [taken, setTaken] = useState<string[]>([]);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();
  const paywall = usePaywall();

  // No two groups wear the same colour: learn which are taken and,
  // if ours is one of them, draw a free one.
  useEffect(() => {
    let cancelled = false;
    loadTakenGroupColors().then((colors) => {
      if (cancelled) return;
      setTaken(colors);
      setColor((current) =>
        colors.some((c) => c.toUpperCase() === current.toUpperCase()) ? pickGroupColor(colors) : current,
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Start a group"
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-surface p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink-800">
            Start a group
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Figma's strapline (211:11679) is cut off mid-word; completed here. */}
        <p className="font-sans text-base text-ink-800">
          Open a room for a life-phase you don&rsquo;t have to go through alone.
        </p>

        {createdSlug ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl border border-primary-200 bg-primary-50 p-4 font-sans text-base text-ink-400">
              Your group is open. It will show under Chapter Groups.
            </p>
            <Link
              href={`/groups/${createdSlug}`}
              className="font-sans text-sm font-medium text-primary-600 hover:underline"
            >
              Go to your group
            </Link>
          </div>
        ) : (
          <form
            className="flex flex-col gap-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError(undefined);
              startSaving(async () => {
                const result = await createGroup({
                  title,
                  label,
                  description,
                  art,
                  color,
                  chapterSlug: chapterSlug || null,
                });
                if (result.passRequired) {
                  // The trial ended while the sheet was open.
                  onClose();
                  paywall("create_group");
                  return;
                }
                if (result.error || !result.slug) {
                  setError(result.error);
                  return;
                }
                setCreatedSlug(result.slug);
                toast({ title: "New group started" });
              });
            }}
          >
            <Labelled label="Chapter Name ">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                required
                placeholder="e.g Grieving a parent"
                className={FIELD}
              />
            </Labelled>

            <Labelled label="Label">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={60}
                placeholder="e.g The first year"
                className={FIELD}
              />
            </Labelled>

            <Labelled label="Space">
              <select
                value={chapterSlug}
                onChange={(e) => {
                  setChapterSlug(e.target.value);
                  if (!artPicked) setArt(artForSpace(e.target.value));
                }}
                className={cn(FIELD, "appearance-none")}
              >
                <option value="">Any space</option>
                {CHAPTERS.map((chapter) => (
                  <option key={chapter.slug} value={chapter.slug}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </Labelled>

            <Labelled label="What’s this Chapter for?">
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                placeholder="Who should find this room, and why?"
                className={cn(FIELD, "block h-[129px] w-full resize-y")}
              />
            </Labelled>

            <GroupLookPicker
              art={art}
              color={color}
              taken={taken}
              title={title}
              onChange={(look) => {
                if (look.art !== art) setArtPicked(true);
                setArt(look.art);
                setColor(look.color);
              }}
            />

            <div className="flex flex-col gap-3 border-t border-ink-50 pt-6">
              <FormError message={error} />
              <Button type="submit" size="sm" fullWidth loading={saving} disabled={!title.trim()}>
                Create group
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Input 1088:4 — ivory-100, 8px radius, 10/14 padding, xs shadow. */
const FIELD =
  "flex w-full items-center gap-2 rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]";

function Labelled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-sans text-sm font-medium text-ink-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
      <path
        d="m3.5 3.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
