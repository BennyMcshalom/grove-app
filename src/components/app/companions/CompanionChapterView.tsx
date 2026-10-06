"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs at their natural size */
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { LogCoverflow } from "@/components/app/LogCoverflow";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { CheckInModal, CompanionThreadList } from "@/components/app/companions/CompanionThread";
import { Button } from "@/components/ui/Button";
import { Modal, ModalHeader } from "@/components/ui/Modal";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { endCompanionship, setCompanionMuted } from "@/lib/companion-actions";
import { milestoneDateLabel, type CompanionChapter, type CompanionMessage } from "@/lib/invites";
import { timeAgo } from "@/lib/time";

/**
 * Someone else's chapter, as their companion sees it: why they were invited,
 * the moments the owner chose (in order), where the owner is now and what's
 * next, the updates shared since, and the check-in thread. Companions
 * support and reply; they can't change anything of the owner's.
 */
export function CompanionChapterView({ data, viewerId }: { data: CompanionChapter; viewerId: string }) {
  const chapter = getChapter(data.chapterSlug);
  const [thread, setThread] = useState<CompanionMessage[]>(data.thread);
  const [checkingIn, setCheckingIn] = useState(false);
  const owner = data.ownerName;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title={`${owner}’s chapter`} back="/bonds/walking-with" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-28 lg:pb-10">
          <section className={cn("flex flex-col gap-4 rounded-2xl p-5 sm:p-6", chapter?.cardClass ?? "bg-ivory-200")}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex w-fit items-center gap-2 rounded-full bg-surface px-3 py-1.5">
                {chapter && <Image src={chapter.icon} alt="" width={20} height={20} className="size-5" />}
                <span className="font-sans text-xs font-medium text-ink-600">
                  {owner}&rsquo;s {chapter?.name ?? ""} chapter
                </span>
              </span>
              <CompanionMenu companionId={data.companionId} ownerName={owner} muted={data.muted} />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-2xl font-semibold text-ink-800 sm:text-3xl">{data.title}</h1>
              {data.phase !== data.title && <p className="font-sans text-sm text-ink-400">{data.phase}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Avatar userId={data.ownerId} src={data.ownerAvatar} name={owner} sizes="40px" className="size-10" />
              <span className="font-sans text-sm text-ink-500">
                You&rsquo;ve walked with {owner} since {new Date(data.since).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </span>
            </div>
          </section>

          {(data.why || data.ask) && (
            <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:p-6">
              {data.why && (
                <figure className="flex flex-col gap-2 border-l-4 border-primary-300 pl-4">
                  <figcaption className="font-sans text-sm font-medium text-ink-700">Why {owner} invited you</figcaption>
                  <blockquote className="font-display text-lg whitespace-pre-line text-ink-600">&ldquo;{data.why}&rdquo;</blockquote>
                </figure>
              )}
              {data.ask && (
                <div className="flex flex-col gap-1">
                  <span className="font-sans text-sm font-medium text-ink-700">What would help</span>
                  <p className="font-sans text-base whitespace-pre-line text-ink-400">{data.ask}</p>
                </div>
              )}
            </section>
          )}

          {data.share.story && data.moments.length > 0 && (
            <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:p-6">
              <SectionTitle title="The story so far" detail={`${data.moments.length} ${data.moments.length === 1 ? "moment" : "moments"} ${owner} chose to share`} />
              {/* Oldest first in the database; the cover-flow starts in front with the newest. */}
              <LogCoverflow entries={[...data.moments].reverse()} tone="plain" />
            </section>
          )}

          {data.share.current && (data.whereNow || data.milestone) && (
            <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:p-6">
              <SectionTitle
                title={`Where ${owner} is now`}
                detail={data.noteUpdatedAt ? `Updated ${timeAgo(data.noteUpdatedAt)}` : undefined}
              />
              {data.whereNow && <p className="font-sans text-base whitespace-pre-line text-ink-600">{data.whereNow}</p>}
              {data.milestone && (
                <div className="flex items-center gap-3 rounded-xl bg-ivory-100 px-4 py-3">
                  <FlagIcon />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-sans text-xs font-medium text-ink-300 uppercase">Next milestone</span>
                    <span className="font-sans text-sm font-medium text-ink-700">
                      {data.milestone}
                      {data.milestoneDate && <span className="font-normal text-ink-400"> · {milestoneDateLabel(data.milestoneDate)}</span>}
                    </span>
                  </span>
                </div>
              )}
            </section>
          )}

          {data.share.future && (
            <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:p-6">
              <SectionTitle title="Updates" detail={`What ${owner} has shared with you since`} />
              {data.updates.length === 0 ? (
                <p className="font-sans text-sm text-ink-300">No updates yet. You&rsquo;ll be told when {owner} shares one.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {data.updates.map((u) => (
                    <li key={u.id} className="flex flex-col gap-2 rounded-xl bg-ivory-100 p-4">
                      {u.photoUrl && <img src={u.photoUrl} alt="" className="max-h-[420px] w-full rounded-lg bg-black object-contain" />}
                      {u.body && <p className="font-sans text-base whitespace-pre-line text-ink-600">{u.body}</p>}
                      <span className="font-sans text-xs text-ink-300">{timeAgo(u.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="flex flex-col gap-4 rounded-2xl bg-surface p-5 sm:p-6">
            <SectionTitle title="Check-ins" detail={`Between you and ${owner}`} />
            {thread.length === 0 ? (
              <p className="font-sans text-sm text-ink-300">
                Nothing yet. A few words before a big day can mean a lot.
              </p>
            ) : (
              <CompanionThreadList messages={thread} viewerId={viewerId} />
            )}
            <Button className="hidden lg:flex" onClick={() => setCheckingIn(true)}>
              Check in with {owner}
            </Button>
          </section>
        </div>
      </div>

      {/* On a phone the check-in stays in reach above the nav bar. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 lg:hidden">
        <Button className="pointer-events-auto shadow-lg" onClick={() => setCheckingIn(true)}>
          Check in with {owner}
        </Button>
      </div>

      {checkingIn && (
        <CheckInModal
          companionId={data.companionId}
          title={`Check in with ${owner}`}
          placeholder={`Thinking of you. How did it go?`}
          onClose={() => setCheckingIn(false)}
          onSent={(m) => setThread((prev) => [...prev, m])}
        />
      )}
    </div>
  );
}

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
  return (
    <header className="flex flex-col gap-0.5">
      <h2 className="font-display text-xl font-semibold text-ink-700">{title}</h2>
      {detail && <p className="font-sans text-sm text-ink-300">{detail}</p>}
    </header>
  );
}

/** ⋮ — Mute / Unmute, and Leave this chapter. */
function CompanionMenu({ companionId, ownerName, muted: initialMuted }: { companionId: string; ownerName: string; muted: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [leaving, setLeaving] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const item = "w-full px-5 py-3 text-left font-sans text-base text-ink-700 transition-colors hover:bg-ivory-100";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-label="Chapter options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid size-9 place-items-center rounded-full bg-surface text-ink-600 transition-colors hover:bg-ivory-200"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
          <circle cx="10" cy="4" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="10" cy="16" r="1.6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute top-full right-0 z-20 mt-2 flex w-56 flex-col rounded-lg bg-surface py-2 shadow-[0px_0px_36px_0px_rgba(0,0,0,0.15)]">
          <button
            type="button"
            role="menuitem"
            className={item}
            onClick={() => {
              setOpen(false);
              startTransition(async () => {
                const result = await setCompanionMuted(companionId, !muted);
                if (result.error) {
                  toast({ title: result.error, tone: "danger" });
                  return;
                }
                setMuted(!muted);
                toast({ title: muted ? "Notifications back on" : `Muted ${ownerName}’s chapter`, description: muted ? undefined : "You can still open it any time." });
              });
            }}
          >
            {muted ? "Unmute" : "Mute notifications"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={cn(item, "text-destructive-60")}
            onClick={() => {
              setOpen(false);
              setLeaving(true);
            }}
          >
            Leave this chapter
          </button>
        </div>
      )}
      {leaving && (
        <Modal label="Leave this chapter?" onClose={() => setLeaving(false)} width="max-w-[480px]">
          <ModalHeader title="Leave this chapter?" onClose={() => setLeaving(false)} />
          <p className="font-sans text-base text-ink-400">
            You&rsquo;ll stop seeing {ownerName}&rsquo;s moments and updates. They&rsquo;d need to invite you again.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              fullWidth
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await endCompanionship(companionId);
                  if (result.error) {
                    toast({ title: result.error, tone: "danger" });
                    return;
                  }
                  toast({ title: "You left the chapter" });
                  router.push("/bonds/walking-with");
                })
              }
            >
              Leave
            </Button>
            <Button variant="secondary" fullWidth onClick={() => setLeaving(false)}>
              Stay
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-6 shrink-0 text-primary-600" aria-hidden="true">
      <path d="M5 21V4m0 0h11l-2 4 2 4H5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CompanionGone() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Chapter" back="/bonds/walking-with" />
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-sans text-base font-medium text-ink-600">This chapter isn&rsquo;t shared with you any more</p>
        <p className="max-w-sm font-sans text-sm text-ink-300">It may have been closed to companions, or you left it.</p>
        <Link href="/bonds/walking-with" className="font-ui text-sm font-medium text-primary-600">
          Chapters I&rsquo;m walking with
        </Link>
      </div>
    </div>
  );
}
