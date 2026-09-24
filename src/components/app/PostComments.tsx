"use client";

import { useEffect, useState, useTransition } from "react";
import { PersonRowsSkeleton } from "@/components/ui/Skeleton";
import { Avatar } from "@/components/app/Avatar";
import { Linkify } from "@/components/ui/Linkify";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { addComment, deleteComment, loadComments, setCommentRooted } from "@/lib/post-actions";
import type { PostComment } from "@/lib/posts";
import { cn } from "@/lib/cn";

/**
 * The comment thread under a post — Figma component "Comment": the avatar
 * beside a soft bubble with the name and words, then "Root 22 · Reply ·
 * Hide 1 reply" underneath, and replies indented one level below.
 */
export function PostComments({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange: (delta: number) => void;
}) {
  const toast = useToast();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  // Which comment's reply box is open, and which threads are folded away.
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    loadComments(postId).then((result) => {
      if (cancelled) return;
      setComments(result.comments);
      setLoadError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const post = async (body: string, parentId: string | null) => {
    const result = await addComment(postId, body, parentId);
    if (result.error || !result.comment) {
      toast({ title: result.error ?? "We couldn't post your comment.", tone: "danger" });
      return false;
    }
    setComments((prev) => [...(prev ?? []), result.comment!]);
    onCountChange(1);
    if (parentId) {
      setReplyingTo(null);
      setHidden((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
    return true;
  };

  const remove = async (comment: PostComment) => {
    const replies = comments?.filter((c) => c.parentId === comment.id) ?? [];
    setComments((prev) => prev?.filter((c) => c.id !== comment.id && c.parentId !== comment.id) ?? null);
    onCountChange(-1 - replies.length);
    const result = await deleteComment(comment.id);
    if (result.error) {
      setComments((prev) => [...(prev ?? []), comment, ...replies]);
      onCountChange(1 + replies.length);
      toast({ title: result.error, tone: "danger" });
    }
  };

  const toggleRoot = async (comment: PostComment) => {
    const next = !comment.rooted;
    const patch = (rooted: boolean, delta: number) =>
      setComments((prev) =>
        prev?.map((c) => (c.id === comment.id ? { ...c, rooted, roots: Math.max(0, c.roots + delta) } : c)) ?? null,
      );
    patch(next, next ? 1 : -1);
    const result = await setCommentRooted(comment.id, next);
    if (result.error) {
      patch(!next, next ? -1 : 1);
      toast({ title: result.error, tone: "danger" });
    }
  };

  const topLevel = comments?.filter((c) => c.parentId === null) ?? [];
  const repliesTo = (id: string) => comments?.filter((c) => c.parentId === id) ?? [];

  return (
    <section aria-label="Comments" className="flex flex-col gap-4 border-t border-ink-50 pt-4">
      {comments === null ? (
        <PersonRowsSkeleton count={2} label="Loading comments" />
      ) : loadError ? (
        <p className="font-sans text-sm text-destructive-60">{loadError}</p>
      ) : topLevel.length === 0 ? (
        <p className="font-sans text-sm text-ink-300">No comments yet. Say something kind.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {topLevel.map((comment) => {
            const replies = repliesTo(comment.id);
            const folded = hidden.has(comment.id);
            return (
              <li key={comment.id} className="flex flex-col gap-4">
                <CommentRow
                  comment={comment}
                  onRoot={() => toggleRoot(comment)}
                  onRemove={() => remove(comment)}
                  onReply={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  replyCount={replies.length}
                  folded={folded}
                  onToggleReplies={() =>
                    setHidden((prev) => {
                      const next = new Set(prev);
                      if (next.has(comment.id)) next.delete(comment.id);
                      else next.add(comment.id);
                      return next;
                    })
                  }
                />

                {(replies.length > 0 || replyingTo === comment.id) && !folded && (
                  <ul className="flex flex-col gap-4 pl-12 sm:pl-14">
                    {replies.map((reply) => (
                      <li key={reply.id}>
                        <CommentRow comment={reply} onRoot={() => toggleRoot(reply)} onRemove={() => remove(reply)} />
                      </li>
                    ))}
                    {replyingTo === comment.id && (
                      <li>
                        <CommentBox
                          placeholder={`Reply to ${comment.author}`}
                          autoFocus
                          onSend={(body) => post(body, comment.id)}
                        />
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <CommentBox placeholder="Add a comment" onSend={(body) => post(body, null)} />
    </section>
  );
}

function CommentRow({
  comment,
  onRoot,
  onRemove,
  onReply,
  replyCount = 0,
  folded = false,
  onToggleReplies,
}: {
  comment: PostComment;
  onRoot: () => void;
  onRemove: () => void;
  /** Only top-level comments take replies. */
  onReply?: () => void;
  replyCount?: number;
  folded?: boolean;
  onToggleReplies?: () => void;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <Avatar src={comment.avatar} name={comment.author} sizes="40px" className="size-9 sm:size-10" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-1 rounded-lg bg-ivory-100 px-3 py-2.5 sm:px-4">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-base font-semibold text-ink-800">{comment.author}</span>
            <span className="font-sans text-xs text-ink-300" suppressHydrationWarning>
              {comment.time}
            </span>
          </div>
          <p className="font-sans text-sm break-words whitespace-pre-line text-ink-600">
            <Linkify text={comment.body} className="text-primary-600" />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 px-1">
          <button
            type="button"
            onClick={onRoot}
            aria-pressed={comment.rooted}
            className={cn(
              "flex items-center gap-1.5 font-sans text-sm transition-colors",
              comment.rooted ? "text-primary-500" : "text-ink-600 hover:text-ink-800",
            )}
          >
            <PlantIcon className="size-5" />
            Root {comment.roots}
          </button>
          {onReply && (
            <button type="button" onClick={onReply} className="font-sans text-sm text-ink-600 hover:text-ink-800">
              Reply
            </button>
          )}
          {replyCount > 0 && onToggleReplies && (
            <button
              type="button"
              onClick={onToggleReplies}
              className="font-sans text-sm font-medium text-primary-500 hover:text-primary-400"
            >
              {folded ? "Show" : "Hide"} {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </button>
          )}
          {comment.mine && (
            <button type="button" onClick={onRemove} className="ml-auto font-sans text-xs text-destructive-60 hover:underline">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentBox({
  placeholder,
  autoFocus,
  onSend,
}: {
  placeholder: string;
  autoFocus?: boolean;
  onSend: (body: string) => Promise<boolean>;
}) {
  const viewer = useViewer();
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    startSending(async () => {
      if (await onSend(body)) setDraft("");
    });
  };

  return (
    <form
      className="flex items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <Avatar src={viewer.avatarUrl} name={viewer.firstName} sizes="32px" className="size-8" />
      {/* min-w-0: a textarea's default width is ~20em, and without this the
          flex row refuses to shrink below it and overflows the card. */}
      <label className="min-w-0 flex-1">
        <span className="sr-only">{placeholder}</span>
        <textarea
          value={draft}
          autoFocus={autoFocus}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          maxLength={2000}
          placeholder={placeholder}
          className="w-full resize-none rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-sm text-ink-600 outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
        />
      </label>
      <button
        type="submit"
        disabled={!draft.trim() || sending}
        className="rounded-full bg-primary-500 px-4 py-2.5 font-ui text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:bg-ink-50 disabled:text-ink-200"
      >
        {sending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}

function PlantIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21v-7m0 0c0-3.3 2.7-6 6-6h2v1a6 6 0 0 1-6 6h-2Zm0 0c0-2.8-2.2-5-5-5H5v1a5 5 0 0 0 5 5h2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
