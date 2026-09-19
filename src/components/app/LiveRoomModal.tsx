"use client";

import { useCallback, useEffect, useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { leaveLiveRoom, loadRoomPeople, setWave } from "@/app/(app)/events/actions";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import type { RoomPerson } from "@/lib/events";
import { useRealtimeChannel } from "@/lib/supabase/use-channel";

/**
 * live — Figma frame 458:13190 (a Meet & Greet room you have joined).
 *
 * The room name with its live count, the "You're here and visible" banner with
 * Leave, then HERE RIGHT NOW: everyone in the room, you marked "You" and the
 * rest wavable. People and waves update live.
 */
export function LiveRoomModal({
  roomId,
  title,
  onClose,
}: {
  roomId: string;
  title: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [people, setPeople] = useState<RoomPerson[] | null>(null);

  const reload = useCallback(() => {
    loadRoomPeople(roomId).then(setPeople);
  }, [roomId]);

  useEffect(reload, [reload]);

  useRealtimeChannel(
    (supabase) =>
      supabase
        .channel(`live-room:${roomId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "live_room_presence", filter: `room_id=eq.${roomId}` }, reload)
        .on("postgres_changes", { event: "*", schema: "public", table: "waves", filter: `room_id=eq.${roomId}` }, reload)
        .subscribe(),
    [roomId, reload],
  );

  const toggleWave = async (person: RoomPerson) => {
    const next = !person.iWaved;
    setPeople((prev) => prev?.map((p) => (p.userId === person.userId ? { ...p, iWaved: next } : p)) ?? null);
    const result = await setWave(roomId, person.userId, next);
    if (result.error) {
      setPeople((prev) => prev?.map((p) => (p.userId === person.userId ? { ...p, iWaved: !next } : p)) ?? null);
      toast({ title: result.error, tone: "danger" });
    }
  };

  const here = people?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-white p-6 sm:p-8"
      >
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
              <LaptopIcon />
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-2xl font-semibold text-ink-800">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2">
                  <span className="size-3 rounded-full bg-success-60" />
                  <span className="font-sans text-sm font-medium text-success-60">
                    live
                  </span>
                </span>
                <span className="size-2 rounded-full bg-primary-500" />
                <span className="font-ui text-sm font-medium text-ink-200">
                  {here} Meeting &amp; Greeting
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded p-3 text-ink-800 transition-colors hover:bg-ivory-200"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-primary-50 p-5">
          <p className="font-sans text-lg text-black">
            You&rsquo;re here and visible in this room
          </p>
          <button
            type="button"
            onClick={async () => {
              await leaveLiveRoom(roomId);
              toast({ title: `You left ${title}` });
              onClose();
            }}
            className="w-[72px] shrink-0 rounded-full bg-ivory-100 px-3 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-ivory-200"
          >
            Leave
          </button>
        </div>

        <h3 className="font-sans text-base font-medium text-ink-300">
          HERE RIGHT NOW
        </h3>

        {people === null ? (
          <p className="font-sans text-sm text-ink-300">Finding who&rsquo;s here…</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {people.map((person) => {
              const icon = person.chapterSlug ? getChapter(person.chapterSlug)?.icon : undefined;
              return (
                <li
                  key={person.userId}
                  className="flex flex-wrap items-center justify-between gap-4 p-2"
                >
                  <div className="flex items-center gap-6">
                    <span className="relative size-12 shrink-0">
                      <span
                        className="absolute inset-0 rounded-full bg-[#F0B231]"
                        style={{ boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)" }}
                      />
                      <Avatar src={person.avatarUrl} name={person.name} sizes="48px" className="relative size-12" />
                      <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-white bg-success-60" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="font-sans text-base font-medium text-ink-700">
                        {person.name}
                      </span>
                      {person.phase && (
                        <span className="flex w-fit items-center gap-2 rounded-full bg-ivory-200 px-3 py-1">
                          {icon && (
                            <span
                              className="size-4 rounded-full bg-contain bg-center bg-no-repeat"
                              style={{ backgroundImage: `url(${icon})` }}
                            />
                          )}
                          <span className="font-sans text-xs text-ink-400">{person.phase}</span>
                        </span>
                      )}
                      {person.wavedAtMe && !person.isMe && (
                        <span className="font-sans text-xs text-primary-600">Waved at you</span>
                      )}
                    </div>
                  </div>

                  {person.isMe ? (
                    <span className="shrink-0 rounded-full bg-ink-50 px-3 py-2.5 font-ui text-sm font-medium text-ink-500">
                      You
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleWave(person)}
                      aria-pressed={person.iWaved}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full px-3 py-2.5 font-ui text-sm font-medium transition-colors",
                        person.iWaved
                          ? "bg-primary-500 text-ink-50 hover:bg-primary-400"
                          : "bg-primary-50 text-primary-600 hover:bg-primary-100",
                      )}
                    >
                      <HandIcon />
                      {person.iWaved ? "Waved" : "Wave"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function LaptopIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden="true">
      <rect x="6" y="8" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 24.5h26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M5 8.5V4a1 1 0 0 1 2 0v3.5M7 7.5V3a1 1 0 0 1 2 0v4.5M9 7.5V4.5a1 1 0 0 1 2 0V9c0 2.5-1.5 4.5-4 4.5S3.5 11.5 3.5 9V7a1 1 0 0 1 2 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="size-5" aria-hidden="true">
      <path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
