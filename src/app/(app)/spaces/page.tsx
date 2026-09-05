import { TopBar } from "@/components/app/TopBar";
import { RightRail } from "@/components/app/RightRail";
import {
  OpenSpaceCard,
  DirectorySpaceCard,
} from "@/components/app/SpaceCard";
import { CHAPTERS } from "@/lib/chapters";

/**
 * My Spaces — Figma frame 122:8022.
 *
 * Two sections in the 724px column: the chapters you have open, and a
 * directory of the ones you could open next. Figma shows Career, Health and
 * Spiritual as open and the remaining five in the directory, so both lists
 * derive from the same chapter table rather than being hardcoded twice.
 */
const OPEN = ["career", "health", "spiritual"];

/** Figma labels every open card "Building a habit". */
const STATUS = "Building a habit";

export default function SpacesPage() {
  // Figma lists them Career, Health, Spiritual, so follow OPEN, not the table.
  const open = OPEN.map((slug) => CHAPTERS.find((c) => c.slug === slug)!);
  const directory = CHAPTERS.filter((c) => !OPEN.includes(c.slug));

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="My Spaces" />

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-8 pb-10">
            <section className="flex flex-col gap-6">
              <h1 className="font-display text-2xl font-semibold text-ink-500">
                Your open chapters
              </h1>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {open.map((chapter) => (
                  <OpenSpaceCard
                    key={chapter.slug}
                    chapter={chapter}
                    status={STATUS}
                  />
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-6">
              <header className="flex flex-col gap-1">
                <h2 className="font-display text-2xl font-semibold text-ink-500">
                  Spaces Directory
                </h2>
                <p className="font-sans text-base text-ink-200">
                  Chapters you could open next.
                </p>
              </header>

              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {directory.map((chapter) => (
                  <DirectorySpaceCard key={chapter.slug} chapter={chapter} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>

      <RightRail />
    </div>
  );
}
