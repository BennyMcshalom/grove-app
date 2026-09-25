"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { LiveRoomModal } from "@/components/app/LiveRoomModal";
import { useToast } from "@/components/app/ToastProvider";
import { joinLiveRoom, startLiveRoom } from "@/app/(app)/events/actions";
import type { LiveRoom } from "@/lib/events";

/**
 * Meet & Greet — Figma frame 367:8960 (the Events section's second tab).
 *
 * A "start one here" card whose button stays disabled until the place is
 * named, then LIVE NEAR YOU rooms. Naming a room someone already started
 * joins theirs. Copy is Figma's.
 */
export function MeetAndGreet({ rooms, onHost }: { rooms: LiveRoom[]; onHost?: () => void }) {
  const toast = useToast();
  const [place, setPlace] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const [openRoom, setOpenRoom] = useState<{ id: string; title: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const myRoom = rooms.find((r) => r.here) ?? null;
  const needle = (search ?? "").trim().toLowerCase();
  const visible = rooms.filter((r) =>
    needle ? `${r.title} ${r.communityLabel ?? ""} ${r.venueName ?? ""}`.toLowerCase().includes(needle) : true,
  );

  const enter = (room: LiveRoom) =>
    startTransition(async () => {
      if (!room.here) {
        const result = await joinLiveRoom(room.id);
        if (result.error) return toast({ title: result.error, tone: "danger" });
      }
      setOpenRoom({ id: room.id, title: room.title });
    });

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-6 rounded-2xl bg-surface p-5">
        <p className="font-sans text-xs tracking-wide text-ink-300 uppercase">
          Start a Meet &amp; Greet
        </p>

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const title = place.trim();
            if (!title) return;
            startTransition(async () => {
              const result = await startLiveRoom(title);
              if (result.error || !result.roomId) return toast({ title: result.error ?? "", tone: "danger" });
              setPlace("");
              setOpenRoom({ id: result.roomId, title });
            });
          }}
        >
          <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              maxLength={120}
              placeholder="Name the place or event"
              className="flex-1 rounded-2xl bg-ivory-100 px-4 py-3 font-sans text-xs text-ink-500 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
            />
            <Button type="submit" size="sm" className="px-6" disabled={!place.trim()} loading={pending}>
              Turn on here
            </Button>
          </div>
          <p className="font-sans text-xs text-ink-100">
            If someone already started it, you will see it below, tap to join
            them instead.
          </p>
        </form>
      </section>

      {myRoom && (
        <section className="flex flex-col gap-4 rail:hidden">
          <h2 className="font-sans text-base font-medium text-ink-600">
            YOUR LIVE MEET
          </h2>
          <button
            type="button"
            onClick={() => setOpenRoom({ id: myRoom.id, title: myRoom.title })}
            className="flex flex-col gap-2 rounded-lg p-4 text-left"
            style={{
              backgroundImage:
                "var(--wash-pink)",
            }}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="font-display text-[13.8px] leading-[1.26] font-semibold text-ink-500">
                {myRoom.title}
              </span>
              <span className="flex items-center gap-1.5 font-sans text-xs font-medium text-success-60">
                <span className="size-2 rounded-full bg-success-60" />
                live
              </span>
            </div>
            <span className="font-sans text-xs text-ink-400">
              {myRoom.hereCount} Meeting &amp; Greeting
            </span>
          </button>
        </section>
      )}

      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-sans text-base font-medium tracking-wide text-ink-300 uppercase">
          Live near you
        </h2>
        <div className="flex items-center gap-5">
          <button
            type="button"
            aria-label="Search rooms"
            aria-expanded={search !== null}
            onClick={() => setSearch((v) => (v === null ? "" : null))}
            className="grid size-10 place-items-center rounded-full bg-surface text-ink-400 transition-colors hover:bg-ivory-200"
          >
            <SearchIcon />
          </button>
          <Button size="sm" onClick={onHost}>
            Host an Event
          </Button>
        </div>
      </header>

      {search !== null && (
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search rooms"
          className="w-full rounded-full border border-ink-100 bg-surface px-5 py-3 font-sans text-sm text-ink-500 outline-none placeholder:text-ink-200 focus:border-primary-200"
        />
      )}

      {visible.length === 0 ? (
        <p className="rounded-lg bg-surface px-4 py-8 text-center font-sans text-sm text-ink-300">
          No one has turned on a Meet &amp; Greet yet. Start one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((room) => (
            <li key={room.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => enter(room)}
                className="flex w-full gap-2 rounded-lg bg-surface p-4 text-left transition-colors hover:bg-ivory-50"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
                  <LaptopIcon />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h3 className="font-sans text-sm font-semibold text-ink-600">
                    {room.title}
                  </h3>
                  {(room.venueName || room.communityLabel || room.here) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {room.venueName && (
                        <span className="font-sans text-xs font-medium text-ink-400">{room.venueName}</span>
                      )}
                      {room.communityLabel && (
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-primary-500" />
                          <span className="font-sans text-xs font-medium text-ink-400">
                            {room.communityLabel}
                          </span>
                        </span>
                      )}
                      {room.here && (
                        <span className="font-sans text-xs font-medium text-primary-600">You&rsquo;re here</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-center gap-2">
                  <span className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-success-60" />
                    <span className="font-sans text-sm font-medium text-success-60">
                      live
                    </span>
                  </span>
                  <span className="font-sans text-sm font-medium text-ink-200">
                    {room.hereCount} here
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openRoom && (
        <LiveRoomModal
          roomId={openRoom.id}
          title={openRoom.title}
          onClose={() => setOpenRoom(null)}
        />
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="m13.5 13.5 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-5" aria-hidden="true">
      <rect x="4" y="5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 15.5h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
