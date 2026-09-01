"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { useToastStore } from "@/store/useToastStore";
import { useSpaceStore } from "@/store/useSpaceStore";
import { useUpdatePost, useDeletePost } from "@/hooks/usePosts";
import { formatRelativeTime } from "@/lib/mappers";
import type { PostRecord } from "@/lib/api";
import styles from "./GrovePostCard.module.css";

// ── A single post card on the Grove profile, with edit/delete for the owner ──
export function GrovePostCard({
  post: p,
  canManage,
}: {
  post: PostRecord;
  canManage: boolean;
}) {
  const router = useRouter();
  const { toast } = useToastStore();
  const qc = useQueryClient();
  const { slugById } = useSpaceStore();
  const isGrouv = p.kind === "just_grouw";
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirm] = useState(false);
  const [editDoing, setEditDoing] = useState(p.doing ?? "");
  const [editHonest, setEditHonest] = useState(p.honestThing ?? "");
  const [editBody, setEditBody] = useState(p.body ?? "");
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();

  const openPost = () => {
    const slug = slugById(p.spaceId);
    if (slug) router.push(`/spaces/${slug}?post=${p.id}`);
  };

  const saveEdit = async () => {
    try {
      if (isGrouv) {
        if (!editBody.trim()) return;
        await updatePost.mutateAsync({
          id: p.id,
          data: { body: editBody.trim() },
        });
      } else {
        if (!editDoing.trim() || !editHonest.trim()) return;
        await updatePost.mutateAsync({
          id: p.id,
          data: { doing: editDoing.trim(), honestThing: editHonest.trim() },
        });
      }
      qc.invalidateQueries({ queryKey: ["grove-posts"] });
      setEditing(false);
      toast("Post updated.");
    } catch {
      toast("Could not save changes.");
    }
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(p.id);
      qc.invalidateQueries({ queryKey: ["grove-posts"] });
      toast("Post deleted.");
    } catch {
      toast("Could not delete post.");
    }
  };

  return (
    <article className={clsx("card", styles.card)}>
      {p.mediaUrl && !editing && (
        <div onClick={openPost} className={styles.mediaWrap}>
          {p.mediaType?.startsWith("video") ? (
            <video src={p.mediaUrl} className={styles.media} muted />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.mediaUrl} alt="" className={styles.media} />
          )}
          {p.mediaType?.startsWith("video") && (
            <span className={styles.videoBadge}>
              <Icon name="video" size={13} stroke="#fff" />
            </span>
          )}
        </div>
      )}
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <span className={clsx("mono", styles.time)}>
            {formatRelativeTime(p.createdAt)}
          </span>
          <div className={styles.headerRight}>
            {isGrouv && (
              <span className={clsx("chip", styles.grouvChip)}>Just Grouv</span>
            )}
            {canManage && (
              <button
                onClick={() => {
                  setMenu((m) => !m);
                  setConfirm(false);
                }}
                className={styles.menuBtn}
              >
                <Icon name="dots" size={14} stroke="var(--ink-4)" />
              </button>
            )}
          </div>
        </div>

        {menu && (
          <>
            <div
              className={styles.menuBackdrop}
              onClick={() => setMenu(false)}
            />
            <div className={clsx("fade-in", styles.menu)}>
              <button
                onClick={() => {
                  setMenu(false);
                  setEditing(true);
                  setEditDoing(p.doing ?? "");
                  setEditHonest(p.honestThing ?? "");
                  setEditBody(p.body ?? "");
                }}
                className={styles.menuRow}
              >
                Edit post
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  setConfirm(true);
                }}
                className={clsx(styles.menuRow, styles.danger)}
              >
                Delete post
              </button>
            </div>
          </>
        )}

        {confirmDel && (
          <div className={clsx("fade-in", styles.deleteConfirm)}>
            <span className={styles.deleteConfirmText}>Delete this post?</span>
            <button
              onClick={handleDelete}
              disabled={deletePost.isPending}
              className={clsx("btn", "btn-primary", styles.deleteConfirmBtn)}
            >
              {deletePost.isPending ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className={clsx("btn", "btn-soft", styles.cancelBtn)}
            >
              Cancel
            </button>
          </div>
        )}

        {editing ? (
          isGrouv ? (
            <div>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                maxLength={200}
                autoFocus
                className={styles.editBodyTextarea}
              />
              <div className={styles.editActions}>
                <button
                  onClick={() => setEditing(false)}
                  className={clsx("btn", "btn-soft", styles.editActionBtn)}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={updatePost.isPending || !editBody.trim()}
                  className={clsx("btn", "btn-primary", styles.editActionBtn)}
                >
                  {updatePost.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <textarea
                value={editDoing}
                onChange={(e) => setEditDoing(e.target.value)}
                maxLength={200}
                className={styles.editDoingTextarea}
              />
              <textarea
                value={editHonest}
                onChange={(e) => setEditHonest(e.target.value)}
                maxLength={300}
                className={styles.editHonestTextarea}
              />
              <div className={styles.editActions}>
                <button
                  onClick={() => setEditing(false)}
                  className={clsx("btn", "btn-soft", styles.editActionBtn)}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={
                    updatePost.isPending ||
                    !editDoing.trim() ||
                    !editHonest.trim()
                  }
                  className={clsx("btn", "btn-primary", styles.editActionBtn)}
                >
                  {updatePost.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          )
        ) : (
          <div onClick={openPost} className={styles.contentWrap}>
            {isGrouv ? (
              p.body && (
                <p className={clsx("serif", styles.grouvBody)}>{p.body}</p>
              )
            ) : (
              <>
                {p.doing && (
                  <p
                    className={clsx(
                      styles.doing,
                      p.honestThing && styles.hasHonest,
                    )}
                  >
                    {p.doing}
                  </p>
                )}
                {p.honestThing && (
                  <p className={styles.honest}>&ldquo;{p.honestThing}&rdquo;</p>
                )}
              </>
            )}

            {((p.rootCount ?? 0) > 0 || (p.commentCount ?? 0) > 0) && (
              <div className={styles.statsRow}>
                {(p.rootCount ?? 0) > 0 && (
                  <span className={styles.statItem}>
                    <Icon name="sprout" size={14} stroke="var(--sage)" />{" "}
                    {p.rootCount}
                  </span>
                )}
                {(p.commentCount ?? 0) > 0 && (
                  <span className={styles.statItem}>
                    <Icon name="comment" size={13} stroke="var(--ink-3)" />{" "}
                    {p.commentCount}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
