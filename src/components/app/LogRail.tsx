import Link from "next/link";
import { cn } from "@/lib/cn";
import { WEEKLY_LOG_TARGET } from "@/lib/log";
import { LOG_VISIBILITY, type LogVisibility } from "@/lib/profile";

/**
 * The Grouv Log rail — Figma frame 246:6062.
 *
 * "THIS LOG" carries the chapter you are logging against and how many days of
 * the last week you logged; "WHO CAN SEE YOUR LOG" states the audience.
 */
export function LogRail({
  chapterName,
  chapterIcon,
  phase,
  daysThisWeek,
  visibility,
  className,
}: {
  chapterName: string | null;
  chapterIcon: string | null;
  phase: string | null;
  daysThisWeek: number;
  visibility: LogVisibility;
  className?: string;
}) {
  const audience = LOG_VISIBILITY.find((v) => v.value === visibility) ?? LOG_VISIBILITY[0];
  const progress = Math.min(daysThisWeek, WEEKLY_LOG_TARGET) / WEEKLY_LOG_TARGET;

  return (
    <aside
      className={cn(
        "hidden w-[396px] shrink-0 scroll-slim overflow-y-auto bg-ivory-100 px-8 py-6 xl:block",
        className,
      )}
    >
      <div className="flex flex-col gap-7">
        {chapterName && (
          <section className="flex flex-col gap-3">
            <h2 className="font-sans text-base font-medium text-ink-600">
              THIS LOG
            </h2>
            <div className="flex flex-col gap-3 rounded-lg bg-ivory-200 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50">
                  {chapterIcon && (
                    <span
                      className="size-6 rounded-full bg-contain bg-center bg-no-repeat"
                      style={{ backgroundImage: `url(${chapterIcon})` }}
                    />
                  )}
                </span>
                <span className="flex flex-col">
                  <span className="font-sans text-sm font-semibold text-ink-700">
                    {chapterName}
                  </span>
                  {phase && (
                    <span className="font-sans text-xs text-ink-300">{phase}</span>
                  )}
                </span>
              </div>

              <span className="h-1 w-full overflow-hidden rounded-full bg-primary-100">
                <span
                  className="block h-full rounded-full bg-primary-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </span>

              <span className="font-sans text-xs text-ink-300">
                {Math.min(daysThisWeek, 7)} of {WEEKLY_LOG_TARGET} days logged this week
              </span>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-base font-medium text-ink-600">
            WHO CAN SEE YOUR LOG
          </h2>
          <div className="flex items-start gap-3 rounded-lg bg-ivory-200 p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
              <EyeIcon />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-sans text-sm font-semibold text-ink-700">
                {audience.label}
              </span>
              <span className="font-sans text-xs text-ink-300">{audience.body}</span>
            </span>
            {/* Settings > Privacy owns "Log visibility" (390:13507). */}
            <Link
              href="/settings"
              aria-label="Log visibility options"
              className="shrink-0 rounded p-1 text-ink-400 transition-colors hover:bg-ivory-300"
            >
              <DotsIcon />
            </Link>
          </div>
        </section>
      </div>
    </aside>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="size-4" aria-hidden="true">
      <path
        d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <circle cx="10" cy="4" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="10" cy="16" r="1.5" />
    </svg>
  );
}
