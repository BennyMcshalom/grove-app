"use client";
import clsx from "clsx";
import { Spinner } from "@/components/ui/Spinner";
import { GrovePostCard } from "@/components/grove/GrovePostCard";
import type { PostRecord } from "@/lib/api";
import styles from "./PostsSection.module.css";

export function PostsSection({
  possessiveCap,
  posts,
  isLoading,
  isOwnProfile,
  firstName,
}: {
  possessiveCap: string;
  posts: PostRecord[] | undefined;
  isLoading: boolean;
  isOwnProfile: boolean;
  firstName: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className="label-mono">{possessiveCap} Posts</div>
        {!!posts?.length && (
          <span className={styles.count}>· {posts.length} shared</span>
        )}
      </div>

      {isLoading ? (
        <div className={clsx("card", styles.loadingCard)}>
          <Spinner size={18} />
        </div>
      ) : posts && posts.length > 0 ? (
        <div className={styles.grid}>
          {posts.slice(0, 6).map((p) => (
            <GrovePostCard key={p.id} post={p} canManage={isOwnProfile} />
          ))}
        </div>
      ) : (
        <div className={clsx("card", styles.emptyCard)}>
          <div className={styles.emptyEmoji}>🌱</div>
          <p className={styles.emptyText}>
            {isOwnProfile
              ? "You haven't posted anything yet."
              : `${firstName} hasn't posted anything yet.`}
          </p>
        </div>
      )}
    </div>
  );
}
