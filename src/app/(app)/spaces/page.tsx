import { TopBar } from "@/components/app/TopBar";
import { RightRail } from "@/components/app/RightRail";
import {
  OpenSpaceCard,
  DirectorySpaceCard,
} from "@/components/app/SpaceCard";
import { getShellViewer } from "@/lib/auth/viewer";
import { CHAPTERS, getChapter } from "@/lib/chapters";
import { createClient } from "@/lib/supabase/server";

/**
 * My Spaces — Figma frame 122:8022.
 *
 * Two sections in the 724px column: the chapters you have open, and a
 * directory of the ones you could open next.
 */
export default async function SpacesPage() {
  const viewer = await getShellViewer();
  const openSlugs = viewer.chapters.map((c) => c.slug);

  const supabase = await createClient();
  const { data: summaries } = openSlugs.length
    ? await supabase.rpc("space_summaries", { p_slugs: openSlugs })
    : { data: [] };

  const open = viewer.chapters.flatMap((held) => {
    const chapter = getChapter(held.slug);
    if (!chapter) return [];
    const summary = summaries?.find((s) => s.chapter_slug === held.slug);
    return [
      {
        userChapterId: held.id,
        chapter,
        status: held.phase,
        members: summary?.member_count ?? 1,
        avatars: summary?.member_avatars ?? [],
      },
    ];
  });
  const directory = CHAPTERS.filter((c) => !openSlugs.includes(c.slug));

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="My Spaces" />

        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-[724px] flex-col gap-8 pb-10">
            <section className="flex flex-col gap-6">
              <h1 className="font-display text-2xl font-semibold text-ink-500">
                Your open chapters
              </h1>
              {open.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                  {open.map((space) => (
                    <OpenSpaceCard key={space.userChapterId} {...space} />
                  ))}
                </div>
              ) : (
                <p className="font-sans text-base text-ink-300">
                  You&rsquo;re not holding any chapters right now. Open one from
                  the directory below.
                </p>
              )}
            </section>

            {directory.length > 0 && (
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
            )}
          </div>
        </div>
      </div>

      <RightRail />
    </div>
  );
}
