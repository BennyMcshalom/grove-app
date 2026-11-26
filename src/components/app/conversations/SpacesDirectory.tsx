import Image from "next/image";
import Link from "next/link";
import { RightRail } from "@/components/app/RightRail";
import { TopBar } from "@/components/app/TopBar";
import { JoinSpaceButton } from "@/components/app/conversations/JoinSpaceButton";
import { InvitationsList } from "@/components/app/invite/InvitationsList";
import { CHAPTERS } from "@/lib/chapters";

/**
 * The new Spaces directory (Phase 1 handoff): the same life categories, one
 * clear list. Each opens its own page of conversations; the ones you're in
 * say so.
 */
export function SpacesDirectory({ held }: { held: { slug: string; paused: boolean }[] }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar title="Spaces" guide="spaces" />
        <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-5 lg:px-8">
          <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5 pb-10">
            <p className="font-sans text-[15px] text-ink-400">
              Every part of life has a place. Open a Space to see its conversations.
            </p>

            <div className="empty:hidden rail:hidden">
              <InvitationsList titled />
            </div>

            <ul className="flex flex-col divide-y divide-ink-50 overflow-hidden rounded-2xl border border-ink-50 bg-surface">
              {CHAPTERS.map((chapter) => {
                const mine = held.find((h) => h.slug === chapter.slug);
                return (
                  <li key={chapter.slug} className="flex items-center gap-3 px-4 py-3.5">
                    <Link href={`/spaces/${chapter.slug}`} className="group flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="grid size-10 shrink-0 place-items-center rounded-full"
                        style={{ backgroundColor: chapter.tint }}
                      >
                        <Image src={chapter.icon} alt="" width={40} height={40} className="size-6" />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="font-sans text-[15px] font-semibold text-ink-800 group-hover:underline">
                          {chapter.name}
                        </span>
                        <span className="truncate font-sans text-sm text-ink-400">{chapter.tagline}</span>
                      </span>
                    </Link>
                    {mine ? (
                      <span className="shrink-0 rounded-full bg-ivory-300 px-3 py-1 font-sans text-xs font-semibold text-ink-500">
                        {mine.paused ? "Paused" : "Joined"}
                      </span>
                    ) : (
                      <JoinSpaceButton chapter={chapter} />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      <RightRail invitations />
    </div>
  );
}
