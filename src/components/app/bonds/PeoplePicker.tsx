"use client";

import { useState } from "react";
import { ChapterBadge, GlowAvatar } from "@/components/app/BondChat";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";

export type PickablePerson = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phase?: string | null;
  chapterSlug?: string | null;
};

/**
 * "New Message" — Figma 1798:54514: a search well over your Bonds and circle.
 * Also the Forward list in a Bond chat.
 */
export function PeoplePicker({
  title,
  people,
  busyId,
  onPick,
  onClose,
}: {
  title: string;
  /** Null while loading. */
  people: PickablePerson[] | null;
  busyId?: string | null;
  onPick: (person: PickablePerson) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = people?.filter((p) => !q || p.name.toLowerCase().includes(q)) ?? null;

  return (
    <Modal label={title} onClose={onClose} width="max-w-[480px]">
      <ModalHeader title={title} onClose={onClose} />
      <SearchField value={query} onChange={setQuery} autoFocus />
      {shown === null ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="py-6 text-center font-sans text-sm text-ink-300">
          {people?.length ? "No one by that name." : "Your circle is empty. Connect with people in your spaces."}
        </p>
      ) : (
        <ul className="-mx-2 flex max-h-[60vh] flex-col scroll-slim overflow-y-auto">
          {shown.map((person) => (
            <li key={person.userId} className="border-b border-ink-50 last:border-b-0">
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => onPick(person)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors hover:bg-ivory-100 disabled:opacity-60"
              >
                <GlowAvatar src={person.avatarUrl} name={person.name} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-sans text-base font-medium text-ink-700">{person.name}</span>
                  {person.phase && <ChapterBadge chapterSlug={person.chapterSlug} label={person.phase} />}
                </span>
                {busyId === person.userId && <span className="font-sans text-xs text-ink-300">Sending…</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/** The ivory "search…" well with a magnifier — Figma 1610:37927's list search. */
export function SearchField({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg bg-ivory-200 px-3.5 py-3">
      <span className="sr-only">Search people</span>
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder="search…"
        className="min-w-0 flex-1 bg-transparent font-sans text-base text-ink-600 outline-none placeholder:text-ink-300"
      />
      <svg viewBox="0 0 24 24" fill="none" className="size-5 shrink-0 text-ink-500" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </label>
  );
}
