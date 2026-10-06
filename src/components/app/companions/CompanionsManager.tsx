"use client";

/* eslint-disable @next/next/no-img-element -- signed Storage URLs at their natural size */
import Image from "next/image";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import {
  MomentsModal,
  NoteModal,
  RemoveCompanionModal,
  ShareUpdateModal,
} from "@/components/app/companions/CompanionModals";
import { CheckInModal, CompanionThreadList } from "@/components/app/companions/CompanionThread";
import { ChapterInviteModal } from "@/components/app/invite/ChapterInviteModal";
import { Button } from "@/components/ui/Button";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { revokeCompanionInvite } from "@/lib/companion-actions";
import { milestoneDateLabel, type CompanionMessage, type OwnerCompanion, type SentInvite } from "@/lib/invites";
import { timeAgo } from "@/lib/time";

export interface OwnerUpdate {
  id: string;
  body: string | null;
  photoUrl: string | null;
  createdAt: string;
  recipientCount: number;
}

/**
 * Companions — the people walking alongside this chapter, from the owner's
 * side. Invite someone, share an update (only to who you pick), keep "where
 * you are now" current, choose each person's moments, read and answer their
 * check-ins, and remove anyone (their access ends at once).
 */
export function CompanionsManager({
  slug,
  userChapterId,
  phase,
  companions,
  invites,
  threads: initialThreads,
  note,
  updates,
  origin,
  openCompanion,
}: {
  slug: string;
  userChapterId: string;
  phase: string;
  companions: OwnerCompanion[];
  invites: SentInvite[];
  threads: Record<string, CompanionMessage[]>;
  note: { whereNow: string; milestone: string; milestoneDate: string };
  updates: OwnerUpdate[];
  origin: string;
  openCompanion: string | null;
}) {
  const chapter = getChapter(slug)!;
  const viewer = useViewer();
  const toast = useToast();
  const [threads, setThreads] = useState(initialThreads);
  const [open, setOpen] = useState<string | null>(openCompanion);
  const [modal, setModal] = useState<
    | { kind: "invite" | "update" | "note" }
    | { kind: "moments" | "remove" | "reply"; companion: OwnerCompanion }
    | null
  >(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Companions" back={`/spaces/${slug}`} />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
          <section className={cn("flex flex-col gap-4 rounded-2xl p-5 sm:p-6", chapter.cardClass)}>
            <div className="flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-surface">
                <Image src={chapter.icon} alt="" width={32} height={32} className="size-8" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="font-sans text-xs font-semibold tracking-wide text-primary-600 uppercase">Chapter companions</span>
                <h1 className="truncate font-display text-2xl font-semibold text-ink-800">{chapter.name} · {phase}</h1>
              </span>
            </div>
            <p className="font-sans text-sm text-ink-500">
              The people you&rsquo;ve asked to walk with you. They only see what you choose — your Log stays private.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setModal({ kind: "invite" })}>Invite someone to walk with me</Button>
              <Button variant="secondary" disabled={companions.length === 0} onClick={() => setModal({ kind: "update" })}>
                Share an update
              </Button>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl bg-surface p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-ink-700">Where you are now</h2>
              <button
                type="button"
                onClick={() => setModal({ kind: "note" })}
                className="shrink-0 rounded-full px-3 py-1.5 font-ui text-sm font-medium text-primary-600 hover:bg-primary-50"
              >
                Edit
              </button>
            </div>
            {note.whereNow || note.milestone ? (
              <>
                {note.whereNow && <p className="font-sans text-base whitespace-pre-line text-ink-600">{note.whereNow}</p>}
                {note.milestone && (
                  <p className="font-sans text-sm text-ink-500">
                    <span className="font-medium text-ink-700">Next milestone · </span>
                    {note.milestone}
                    {note.milestoneDate && <span className="text-ink-300"> · {milestoneDateLabel(note.milestoneDate)}</span>}
                  </p>
                )}
              </>
            ) : (
              <p className="font-sans text-sm text-ink-300">Say where you are and what&rsquo;s next, for the people walking with you.</p>
            )}
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-display text-xl font-semibold text-ink-700">
              Walking with you{companions.length > 0 && <span className="text-ink-300"> · {companions.length}</span>}
            </h2>
            {companions.length === 0 ? (
              <p className="rounded-2xl bg-surface px-5 py-6 font-sans text-sm text-ink-300">
                No one yet. Invite someone you&rsquo;d like beside you in this chapter.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {companions.map((c) => {
                  const expanded = open === c.companionId;
                  const thread = threads[c.companionId] ?? [];
                  return (
                    <li key={c.companionId} className="flex flex-col gap-4 rounded-2xl bg-surface p-4 sm:p-5">
                      <div className="flex items-center gap-3">
                        <Avatar userId={c.userId} src={c.avatarUrl} name={c.name} sizes="48px" className="size-12 shrink-0" />
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : c.companionId)}
                          aria-expanded={expanded}
                          className="flex min-w-0 flex-1 flex-col text-left"
                        >
                          <span className="truncate font-sans text-base font-medium text-ink-700">{c.name}</span>
                          <span className="truncate font-sans text-xs text-ink-300">
                            {c.lastMessage
                              ? `${c.lastMessageMine ? "You" : c.name}: ${c.lastMessage}`
                              : `Walking with you since ${timeAgo(c.since)}`}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : c.companionId)}
                          className="shrink-0 rounded-full bg-primary-50 px-3 py-1.5 font-ui text-sm font-medium text-primary-600 hover:bg-primary-100"
                        >
                          {expanded ? "Close" : thread.length > 0 ? `Check-ins · ${thread.length}` : "Open"}
                        </button>
                      </div>
                      <ul className="flex flex-wrap gap-1.5">
                        {c.share.story && <Chip>{c.momentCount} {c.momentCount === 1 ? "moment" : "moments"}</Chip>}
                        {c.share.current && <Chip>Current note</Chip>}
                        {c.share.future && <Chip>Updates</Chip>}
                      </ul>
                      {expanded && (
                        <div className="flex flex-col gap-4 border-t border-ink-50 pt-4">
                          {thread.length === 0 ? (
                            <p className="font-sans text-sm text-ink-300">No check-ins yet.</p>
                          ) : (
                            <CompanionThreadList messages={thread} viewerId={viewer.id} />
                          )}
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => setModal({ kind: "reply", companion: c })}>
                              Reply
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setModal({ kind: "moments", companion: c })}>
                              {c.momentCount > 0 ? "Change moments" : "Add moments"}
                            </Button>
                            <Button size="sm" variant="tertiary" onClick={() => setModal({ kind: "remove", companion: c })}>
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {invites.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-semibold text-ink-700">Invitations waiting</h2>
              <ul className="flex flex-col gap-2">
                {invites.map((invite) => {
                  const link = `${origin}/i/${invite.token}`;
                  return (
                    <li key={invite.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
                      {invite.recipientName ? (
                        <Avatar userId={invite.recipientId} src={invite.recipientAvatar} name={invite.recipientName} sizes="40px" className="size-10 shrink-0" />
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600" aria-hidden="true">
                          ↗
                        </span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-sans text-sm font-medium text-ink-700">
                          {invite.recipientName ?? "Anyone with the link"}
                        </span>
                        <span className="truncate font-sans text-xs text-ink-300">Sent {timeAgo(invite.createdAt)}</span>
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(link);
                            toast({ title: "Link copied" });
                          } catch {
                            toast({ title: "Couldn't copy the link", tone: "danger" });
                          }
                        }}
                        className="shrink-0 rounded-full px-3 py-1.5 font-ui text-sm font-medium text-primary-600 hover:bg-primary-50"
                      >
                        Copy link
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await revokeCompanionInvite(invite.id);
                            toast(result.error ? { title: result.error, tone: "danger" } : { title: "Invitation cancelled" });
                          })
                        }
                        className="shrink-0 rounded-full px-3 py-1.5 font-ui text-sm font-medium text-ink-400 hover:bg-ivory-200"
                      >
                        Cancel
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {updates.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-display text-xl font-semibold text-ink-700">Updates you&rsquo;ve shared</h2>
              <ul className="flex flex-col gap-3">
                {updates.map((u) => (
                  <li key={u.id} className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
                    {u.photoUrl && <img src={u.photoUrl} alt="" className="max-h-80 w-full rounded-lg bg-black object-contain" />}
                    {u.body && <p className="font-sans text-base whitespace-pre-line text-ink-600">{u.body}</p>}
                    <span className="font-sans text-xs text-ink-300">
                      {timeAgo(u.createdAt)} · to {u.recipientCount} {u.recipientCount === 1 ? "person" : "people"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {modal?.kind === "invite" && (
        <ChapterInviteModal userChapterId={userChapterId} chapter={chapter} phase={phase} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "update" && (
        <ShareUpdateModal userChapterId={userChapterId} companions={companions} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "note" && <NoteModal userChapterId={userChapterId} note={note} onClose={() => setModal(null)} />}
      {modal?.kind === "moments" && (
        <MomentsModal userChapterId={userChapterId} companion={modal.companion} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "remove" && <RemoveCompanionModal companion={modal.companion} onClose={() => setModal(null)} />}
      {modal?.kind === "reply" && (
        <CheckInModal
          companionId={modal.companion.companionId}
          title={`Reply to ${modal.companion.name}`}
          placeholder="Thank you for checking in…"
          onClose={() => setModal(null)}
          onSent={(m) => {
            const id = modal.companion.companionId;
            setThreads((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), m] }));
          }}
        />
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <li className="rounded-full bg-ivory-200 px-2.5 py-1 font-sans text-xs text-ink-500">{children}</li>;
}
