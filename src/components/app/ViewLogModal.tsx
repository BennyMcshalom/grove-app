"use client";

import { Avatar } from "@/components/app/Avatar";
import { LogCoverflow } from "@/components/app/LogCoverflow";
import { useIsOnline } from "@/components/app/Presence";
import { Button } from "@/components/ui/Button";
import { getChapter } from "@/lib/chapters";
import type { CircleLog } from "@/lib/log";
import { timeAgo } from "@/lib/time";

/**
 * View log — Figma frame 246:7102.
 *
 * A 660px card: the member's glowing portrait beside "<Name>'s Log" and its
 * chapter badge, then their moments in the same cover-flow as Log Memories
 * (drag, flick, arrows; tap the front card to open it), and "Let's Grouv".
 */
export function ViewLogModal({
  log,
  onClose,
}: {
  log: CircleLog;
  onClose: () => void;
}) {
  const online = useIsOnline(log.userId);
  const chapter = getChapter(log.chapterSlug);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center scroll-slim overflow-y-auto bg-ink-900/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${log.name}’s Log`}
        onClick={(e) => e.stopPropagation()}
        className="my-auto flex w-full max-w-[660px] flex-col gap-6 rounded-2xl bg-surface p-6 sm:p-8"
      >
        <header className="flex items-center justify-between gap-4 border-b border-ink-50 pb-4">
          <div className="flex items-center gap-6 p-2">
            <span className="relative size-12 shrink-0">
              <span
                className="absolute inset-0 rounded-full bg-[#F0B231]"
                style={{ boxShadow: "0px 2px 9px 9px rgba(251, 148, 31, 0.45)" }}
              />
              <Avatar src={log.avatarUrl} name={log.name} userId={log.userId} sizes="48px" className="relative size-12" />
              {online && (
                <span className="absolute right-0 bottom-0 size-3 rounded-full border-[1.5px] border-surface bg-success-60" />
              )}
            </span>

            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-sans text-base font-medium text-ink-700">
                {log.name}&rsquo;s Log
              </span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-2 rounded-full bg-ivory-200 px-3 py-1">
                  {chapter && (
                    <span
                      className="size-5 rounded-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${chapter.icon})` }}
                    />
                  )}
                  <span className="font-sans text-xs text-ink-500">{log.phase}</span>
                </span>
                <span className="size-1 rounded-full bg-ink-100" />
                <span className="font-sans text-xs text-ink-400" suppressHydrationWarning>
                  {timeAgo(log.latestAt)}
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

        {/* The Log Memories cover-flow on a quiet ivory tray, so someone else's
            moments read as a keepsake rather than your own orange Log panel.
            The cover-flow fills its parent, so the tray sets the height. */}
        {log.entries.length > 0 && (
          <div className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-ink-50 bg-ivory-100 sm:h-[420px]">
            <LogCoverflow entries={log.entries} tone="plain" />
          </div>
        )}

        <div className="pt-6">
          <Button size="sm" fullWidth href={`/bonds?with=${log.userId}`}>
            Let&rsquo;s Grouv
          </Button>
        </div>
      </div>
    </div>
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
