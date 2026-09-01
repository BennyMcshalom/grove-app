"use client";
import clsx from "clsx";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { PostCard } from "@/components/ui/RootsPostCard";
import { usePost } from "@/hooks/usePosts";
import { mapPostRecordToPost } from "@/lib/mappers";
import styles from "./PostDetailModal.module.css";

export function PostDetailModal({
  postId,
  myId,
  slug,
  onClose,
}: {
  postId: string;
  myId?: string;
  slug: string;
  onClose: () => void;
}) {
  const { data: post, isLoading, isError } = usePost(postId);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={clsx("rise", styles.modal)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3 className={clsx("serif", styles.title)}>
            Post
          </h3>
          <button onClick={onClose} className={styles.closeBtn}>
            <Icon name="close" size={16} stroke="var(--ink-3)" />
          </button>
        </div>
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loadingWrap}>
              <Spinner />
            </div>
          ) : isError || !post ? (
            <div className={styles.errorWrap}>
              This post isn&apos;t available anymore.
            </div>
          ) : (
            <PostCard
              post={mapPostRecordToPost(post, slug)}
              myId={myId}
              showViewGrouv
            />
          )}
        </div>
      </div>
    </div>
  );
}
