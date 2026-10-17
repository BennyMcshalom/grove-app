"use client";

import { useState, useTransition } from "react";
import { TopBar } from "@/components/app/TopBar";
import { useToast } from "@/components/app/ToastProvider";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { ConfirmDialog } from "@/components/app/bonds/ConfirmDialog";
import { moderate, resolveGroupDeletion } from "@/app/(app)/moderation/actions";
import { timeAgo } from "@/lib/time";

export interface QueueItem {
  targetType: "post" | "comment" | "message" | "group" | "event" | "profile" | "truth" | "space_question";
  targetId: string;
  reportCount: number;
  reasons: string[];
  details: string[];
  firstReportedAt: string;
  preview: string | null;
  authorId: string | null;
  authorName: string | null;
  gone: boolean;
}

/** A group admin asked support to delete their group. */
export interface GroupDeletionItem {
  requestId: string;
  groupTitle: string;
  groupSlug: string;
  memberCount: number;
  requestedBy: string | null;
  reason: string | null;
  createdAt: string;
}

const TARGET_LABEL: Record<QueueItem["targetType"], string> = {
  post: "Post",
  comment: "Comment",
  message: "Message",
  group: "Group",
  event: "Event",
  profile: "Profile",
  truth: "Truth",
  space_question: "Space question",
};

const REMOVE_LABEL: Partial<Record<QueueItem["targetType"], string>> = {
  message: "Hide message",
  event: "Cancel event",
};

function linkFor(item: QueueItem) {
  if (item.gone) return null;
  if (item.targetType === "post") return `/posts/${item.targetId}`;
  if (item.targetType === "event") return `/events/${item.targetId}`;
  if (item.targetType === "profile") return `/people/${item.targetId}`;
  return null;
}

/** Open reports, grouped by what they point at, most-reported first. */
export function ModerationView({ items, groupDeletions = [] }: { items: QueueItem[]; groupDeletions?: GroupDeletionItem[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Moderation" back="/settings" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1096px] flex-col gap-4 pb-10">
          {groupDeletions.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="font-sans text-base font-semibold text-ink-700">Group deletion requests</h2>
              {groupDeletions.map((item) => (
                <GroupDeletionCard key={item.requestId} item={item} />
              ))}
            </section>
          )}
          <p className="font-sans text-sm text-ink-300">
            {items.length === 0
              ? "Nothing waiting. Reports people send show up here."
              : `${items.length} reported. Removing takes it down for everyone; keeping it closes the reports.`}
          </p>
          {items.map((item) => (
            <QueueCard key={`${item.targetType}:${item.targetId}`} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupDeletionCard({ item }: { item: GroupDeletionItem }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const resolve = (remove: boolean) =>
    start(async () => {
      const result = await resolveGroupDeletion(item.requestId, remove);
      toast(
        result.error
          ? { title: result.error, tone: "danger" }
          : { title: remove ? `${item.groupTitle} was deleted` : "Request declined; the group stays" },
      );
    });

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Link href={`/groups/${item.groupSlug}`} className="font-sans text-base font-semibold text-ink-700 hover:underline">
          {item.groupTitle}
        </Link>
        <span className="font-sans text-xs text-ink-300">{timeAgo(item.createdAt)}</span>
      </div>
      <p className="font-sans text-sm text-ink-500">
        {item.requestedBy ?? "An admin"} asked to delete it · {item.memberCount}{" "}
        {item.memberCount === 1 ? "member" : "members"}
      </p>
      {item.reason && <p className="rounded-lg bg-ivory-200 p-3 font-sans text-sm text-ink-600">{item.reason}</p>}
      <div className="flex flex-wrap gap-3">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => resolve(false)}>
          Keep the group
        </Button>
        <Button size="sm" disabled={pending} onClick={() => setConfirming(true)}>
          Delete group
        </Button>
      </div>
      {confirming && (
        <ConfirmDialog
          title={`Delete ${item.groupTitle}?`}
          action="Delete group"
          tone="danger"
          busy={pending}
          onClose={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            resolve(true);
          }}
        >
          Its conversation, Truth Board and video truths go for every member. This can&rsquo;t be undone.
        </ConfirmDialog>
      )}
    </article>
  );
}

function QueueCard({ item }: { item: QueueItem }) {
  const toast = useToast();
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const href = linkFor(item);
  const canRemove = item.targetType !== "profile" && !item.gone;

  const decide = (action: "dismiss" | "remove") =>
    startTransition(async () => {
      const result = await moderate({
        targetType: item.targetType,
        targetId: item.targetId,
        action,
        note: note.trim() || undefined,
      });
      if (result.error) toast({ title: result.error, tone: "danger" });
      else toast({ title: action === "remove" ? "Removed" : "Reports closed", tone: "confirm" });
    });

  return (
    <section className="flex w-full flex-col gap-3 rounded-lg bg-surface px-5 py-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]">
      <div className="flex flex-wrap items-center gap-2 font-sans text-sm">
        <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-medium text-primary-800">
          {TARGET_LABEL[item.targetType]}
        </span>
        <span className="text-ink-500">
          {item.reportCount} {item.reportCount === 1 ? "report" : "reports"} · {item.reasons.join(", ")}
        </span>
        <span className="text-ink-200">· first {timeAgo(item.firstReportedAt)}</span>
      </div>

      <div className="rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-sm whitespace-pre-wrap text-ink-500">
        {item.gone ? (
          <span className="text-ink-200">Already deleted.</span>
        ) : (
          item.preview || <span className="text-ink-200">No text.</span>
        )}
      </div>

      <p className="font-sans text-xs break-all text-ink-300">
        By {item.authorName ?? "an account that no longer exists"}
        {item.authorId && <span className="text-ink-200"> · {item.authorId}</span>}
        {href && (
          <>
            {" · "}
            <a href={href} target="_blank" rel="noreferrer" className="text-primary-800 underline">
              Open
            </a>
          </>
        )}
      </p>

      {item.details.length > 0 && (
        <ul className="flex flex-col gap-1 font-sans text-sm text-ink-400">
          {item.details.map((detail, i) => (
            <li key={i}>&ldquo;{detail}&rdquo;</li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder="Note for the record (optional)"
            className="w-full rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-sm text-ink-500 outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
          />
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => decide("dismiss")}>
            Keep it
          </Button>
          {canRemove && (
            <Button size="sm" disabled={pending} onClick={() => decide("remove")}>
              {REMOVE_LABEL[item.targetType] ?? "Remove it"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
