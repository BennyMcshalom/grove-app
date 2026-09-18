"use client";

import { useEffect, useState, useTransition } from "react";
import { Avatar } from "@/components/app/Avatar";
import { useToast } from "@/components/app/ToastProvider";
import { useViewer } from "@/components/app/ViewerProvider";
import { addComment, deleteComment, loadComments } from "@/lib/post-actions";
import type { PostComment } from "@/lib/posts";

/**
 * The comment thread under a post. Figma has no frame for it, so it borrows
 * the card's own type scale and the ivory input style used across the app.
 */
export function PostComments({
  postId,
  onCountChange,
}: {
  postId: string;
  onCountChange: (delta: number) => void;
}) {
  const viewer = useViewer();
  const toast = useToast();
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [loadError, setLoadError] = useState<string>();
  const [draft, setDraft] = useState("");
  const [sending, startSending] = useTransition();

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

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    startSending(async () => {
      const result = await addComment(postId, body);
      if (result.error || !result.comment) {
        toast({ title: result.error ?? "We couldn't post your comment.", tone: "danger" });
        return;
      }
      setComments((prev) => [...(prev ?? []), result.comment!]);
      setDraft("");
      onCountChange(1);
    });
  };

  const remove = async (comment: PostComment) => {
    setComments((prev) => prev?.filter((c) => c.id !== comment.id) ?? null);
    onCountChange(-1);
    const result = await deleteComment(comment.id);
    if (result.error) {
      setComments((prev) => (prev ? [...prev, comment] : [comment]));
      onCountChange(1);
      toast({ title: result.error, tone: "danger" });
    }
  };

  return (
    <section aria-label="Comments" className="flex flex-col gap-4 rounded-2xl bg-ivory-100 p-4">
      {comments === null ? (
        <p className="font-sans text-sm text-ink-300">Loading comments…</p>
      ) : loadError ? (
        <p className="font-sans text-sm text-destructive-60">{loadError}</p>
      ) : comments.length === 0 ? (
        <p className="font-sans text-sm text-ink-300">No comments yet. Say something kind.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3">
              <Avatar src={comment.avatar} name={comment.author} sizes="32px" className="size-8" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm font-semibold text-ink-700">{comment.author}</span>
                  <span className="font-sans text-xs text-ink-300">{comment.time}</span>
                  {comment.mine && (
                    <button
                      type="button"
                      onClick={() => remove(comment)}
                      className="ml-auto font-sans text-xs text-destructive-60 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="font-sans text-sm break-words whitespace-pre-line text-ink-500">
                  {comment.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

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
          <span className="sr-only">Add a comment</span>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Add a comment"
            className="w-full resize-none rounded-lg bg-white px-3.5 py-2.5 font-sans text-sm text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-300 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
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
    </section>
  );
}
