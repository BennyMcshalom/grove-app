import Image from "next/image";
import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { TopBar } from "@/components/app/TopBar";
import { InvitationsList } from "@/components/app/invite/InvitationsList";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { getShellViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { loadWalkingWith } from "@/lib/companions-server";
import { milestoneDateLabel } from "@/lib/invites";
import { timeAgo } from "@/lib/time";

/**
 * Chapters I'm walking with — every chapter someone has invited you to walk
 * alongside: whose it is, the Space and title, their next milestone or latest
 * update, and the way in.
 */
export default async function WalkingWithPage() {
  await getShellViewer();
  const chapters = await loadWalkingWith();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Chapters I’m walking with" back="/bonds" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
          <header className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-semibold text-ink-600">Chapters I&rsquo;m walking with</h1>
            <p className="font-sans text-base text-ink-300">
              People who asked you to be beside them through a chapter of their life.
            </p>
          </header>

          <InvitationsList titled />

          {chapters.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-6 py-10 text-center">
              <p className="font-sans text-base font-medium text-ink-600">No chapters yet</p>
              <p className="max-w-sm font-sans text-sm text-ink-300">
                When someone invites you to walk alongside one of their chapters and you accept, it shows up here.
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {chapters.map((c) => {
                const chapter = getChapter(c.chapterSlug);
                return (
                  <li key={c.companionId} className="flex flex-col overflow-hidden rounded-2xl bg-surface">
                    <div className={cn("flex items-center gap-3 px-4 py-3", chapter?.cardClass ?? "bg-ivory-200")}>
                      {chapter && <Image src={chapter.icon} alt="" width={28} height={28} className="size-7 shrink-0" />}
                      <span className="flex min-w-0 flex-col">
                        <span className="font-sans text-xs font-medium text-ink-400">
                          {c.ownerName}&rsquo;s {chapter?.name ?? ""} chapter
                        </span>
                        <span className="truncate font-display text-lg font-semibold text-ink-800">{c.title}</span>
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <Avatar userId={c.ownerId} src={c.ownerAvatar} name={c.ownerName} sizes="40px" className="size-10 shrink-0" />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-sans text-sm font-medium text-ink-700">{c.ownerName}</span>
                          <span className="truncate font-sans text-xs text-ink-300">{c.phase}</span>
                        </span>
                        {c.muted && (
                          <span className="ml-auto shrink-0 rounded-full bg-ivory-300 px-2 py-0.5 font-sans text-[10px] font-medium text-ink-400">
                            Muted
                          </span>
                        )}
                      </div>
                      {c.latestUpdate ? (
                        <p className="line-clamp-2 font-sans text-sm text-ink-500">
                          <span className="font-medium text-ink-700">Latest update · </span>
                          {c.latestUpdate}
                          {c.latestUpdateAt && <span className="text-ink-300"> · {timeAgo(c.latestUpdateAt)}</span>}
                        </p>
                      ) : c.milestone ? (
                        <p className="line-clamp-2 font-sans text-sm text-ink-500">
                          <span className="font-medium text-ink-700">Next milestone · </span>
                          {c.milestone}
                          {c.milestoneDate && <span className="text-ink-300"> · {milestoneDateLabel(c.milestoneDate)}</span>}
                        </p>
                      ) : (
                        <p className="font-sans text-sm text-ink-300">Nothing new yet.</p>
                      )}
                      <Link
                        href={`/walking/${c.companionId}`}
                        className="mt-auto flex items-center justify-center gap-2 rounded-full bg-primary-50 px-4 py-2.5 font-ui text-sm font-medium text-primary-600 transition-colors hover:bg-primary-100"
                      >
                        Open chapter
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
