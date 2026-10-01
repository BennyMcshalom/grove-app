import Link from "next/link";
import { WrapBadgeIcon } from "@/components/app/wrapped/icons";
import { cn } from "@/lib/cn";
import { wrapHref, type WrapSummary } from "@/lib/wrapped";

/**
 * "Your weekly Wrapped is ready" — the Home card, Figma 1338:28137.
 *
 * An orange banner with the wrap badge, a line of copy and "View Wrap", which
 * opens the wrap over the Grouv Log. Pair it with `loadFreshWrap()` from
 * `@/lib/wrapped-server`, which returns the newest wrap from the last week.
 */
export function WrappedReadyCard({
  wrap,
  className,
}: {
  wrap: Pick<WrapSummary, "id" | "range">;
  className?: string;
}) {
  const title =
    wrap.range === "week"
      ? "Your weekly Wrapped is ready"
      : wrap.range === "month"
        ? "Your monthly Wrapped is ready"
        : "Your chapter’s Wrapped is ready";

  return (
    <section
      className={cn(
        "relative flex items-center gap-4 overflow-hidden rounded-2xl bg-primary-600 px-5 py-5 sm:px-6",
        className,
      )}
    >
      {/* Figma's diagonal hatching, in the card's own white at low opacity. */}
      <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/3 h-full w-1/2 text-white opacity-15">
        <defs>
          <pattern id="wrapped-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
            <line x1="0" y1="0" x2="10" y2="0" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wrapped-hatch)" />
      </svg>

      <span className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-primary-100 text-primary-700">
        <WrapBadgeIcon />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-lg font-semibold text-white">{title}</span>
        <span className="font-sans text-sm text-white/80">
          A few of your moments, gathered into a short story.
        </span>
      </span>
      <Link
        href={wrapHref(wrap.id)}
        className="relative shrink-0 rounded-full bg-surface px-4 py-2 font-ui text-sm font-medium text-primary-800 transition-colors hover:bg-primary-50"
      >
        View Wrap
      </Link>
    </section>
  );
}
