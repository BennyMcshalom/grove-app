import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The Grouv Log rail — Figma frame 246:6062.
 *
 * "THIS LOG" carries the chapter you are logging against and how far through
 * the week you are; "WHO CAN SEE YOUR LOG" states the audience.
 */
export function LogRail({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "hidden w-[396px] shrink-0 overflow-y-auto bg-ivory-100 px-8 py-6 xl:block",
        className,
      )}
    >
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-3">
          <h2 className="font-sans text-base font-medium text-ink-600">
            THIS LOG
          </h2>
          <div className="flex flex-col gap-3 rounded-lg bg-ivory-200 p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600">
                <span
                  className="size-4 bg-current"
                  style={{
                    maskImage: "url(/icons/events/suitcase.svg)",
                    WebkitMaskImage: "url(/icons/events/suitcase.svg)",
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                />
              </span>
              <span className="flex flex-col">
                <span className="font-sans text-sm font-semibold text-ink-700">
                  Career
                </span>
                <span className="font-sans text-xs text-ink-300">
                  Building a habit
                </span>
              </span>
            </div>

            <span className="h-1 w-full overflow-hidden rounded-full bg-primary-100">
              <span className="block h-full w-4/5 rounded-full bg-primary-500" />
            </span>

            <span className="font-sans text-xs text-ink-300">
              4 of 5 days logged
            </span>
          </div>
        </section>

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
                My circle
              </span>
              <span className="font-sans text-xs text-ink-300">
                Only people you&rsquo;re connected with can see it
              </span>
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
