"use client";

import Image from "next/image";
import { useState } from "react";
import { Avatar } from "@/components/app/Avatar";
import { PostComments } from "@/components/app/PostComments";
import { PostMenu, type PostMenuAction } from "@/components/app/PostMenu";
import {
  DeletePostModal,
  EditPostModal,
  ReportPostModal,
} from "@/components/app/PostModals";
import { SendToBondModal } from "@/components/app/SendToBondModal";
import { useToast } from "@/components/app/ToastProvider";
import { setRooted } from "@/lib/post-actions";
import { progressLabel, type Post } from "@/lib/posts";
import { cn } from "@/lib/cn";

/**
 * Post — Figma component set 90:1354.
 *
 * Variants in Figma are "Post", "Post with video", "Comment with photo" and
 * "Grouv"; here the media is a prop since the chrome is identical across them.
 */
export function PostCard({ post: initial }: { post: Post }) {
  const [post, setPost] = useState(initial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rooted, setRootedState] = useState(initial.rooted);
  const [roots, setRoots] = useState(initial.roots);
  const [comments, setComments] = useState(initial.comments);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shared, setShared] = useState(false);
  // Figma pairs each menu item with a modal and a confirming alert.
  const [dialog, setDialog] = useState<PostMenuAction | null>(null);
  const [deleted, setDeleted] = useState(false);
  const toast = useToast();

  if (deleted) return null;

  const badge = progressLabel(post.progress);
  const [cover, ...more] = post.media;

  const toggleRoot = async () => {
    const next = !rooted;
    // Optimistic, then put it back if the server says no.
    setRootedState(next);
    setRoots((n) => n + (next ? 1 : -1));
    if (next) toast({ title: "Post rooted. Your Circle will see this post." });

    const result = await setRooted(post.id, next);
    if (result.error) {
      setRootedState(!next);
      setRoots((n) => n + (next ? -1 : 1));
      toast({ title: result.error, tone: "danger" });
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="flex gap-4 rounded-2xl bg-white p-5 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]"
    >
      <Avatar src={post.avatar} name={post.author} className="size-10" />

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-lg font-semibold text-ink-700">
                {post.author}
              </span>
              {badge && (
                <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-1 font-sans text-xs font-semibold text-primary-500">
                  <BriefcaseIcon className="size-3" />
                  {badge}
                </span>
              )}
            </div>
            <span className="font-sans text-base text-ink-300">
              {post.time}
            </span>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Post options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded p-1 text-ink-400 transition-colors hover:bg-ivory-200"
            >
              <DotsIcon className="size-6" />
            </button>
            {menuOpen && (
              <PostMenu
                mine={post.mine}
                canSendToBond
                onClose={() => setMenuOpen(false)}
                onSelect={(action) => {
                  setMenuOpen(false);
                  setDialog(action);
                }}
              />
            )}
          </div>
        </header>

        {(post.title || post.body) && (
          <div className="flex flex-col gap-1 py-2">
            {post.title && (
              <h2 className="font-sans text-xl font-semibold text-ink-700">
                {post.title}
              </h2>
            )}
            {post.body && (
              <p className="font-sans text-base whitespace-pre-line text-ink-400">{post.body}</p>
            )}
          </div>
        )}

        {cover && (
          <div className="relative aspect-[589/332] w-full overflow-hidden rounded-2xl bg-ivory-200">
            {cover.kind === "photo" ? (
              // Signed Storage links expire, so they skip the image optimiser.
              <Image
                src={cover.src}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            ) : (
              <video
                src={cover.src}
                controls
                playsInline
                preload="metadata"
                className="absolute inset-0 size-full object-cover"
              />
            )}
            {more.length > 0 && (
              <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 font-sans text-xs font-semibold text-white">
                +{more.length}
              </span>
            )}
          </div>
        )}

        <hr className="border-ink-50" />

        <footer className="flex flex-wrap gap-5 py-3">
          <Action
            icon={<PlantIcon className="size-6" />}
            label={
              <>
                <span className="hidden sm:inline">Root </span>
                {roots}
              </>
            }
            tone="root"
            active={rooted}
            onClick={toggleRoot}
          />
          <Action
            icon={<ChatIcon className="size-6" />}
            label={
              <>
                <span className="hidden sm:inline">Comment </span>
                {comments}
              </>
            }
            tone="muted"
            active={commentsOpen}
            onClick={() => setCommentsOpen((v) => !v)}
          />
          <Action
            icon={<ShareIcon className="size-6" />}
            label={shared ? "Copied" : "Share"}
            tone="outline"
            onClick={() => {
              navigator.clipboard?.writeText(
                `${window.location.origin}/posts/${post.id}`,
              );
              setShared(true);
              setTimeout(() => setShared(false), 2000);
            }}
          />
        </footer>

        {commentsOpen && (
          <PostComments
            postId={post.id}
            onCountChange={(delta) => setComments((n) => Math.max(0, n + delta))}
          />
        )}

        {dialog === "Edit Post" && (
          <EditPostModal
            post={post}
            onClose={() => setDialog(null)}
            onSaved={(patch) => {
              setPost({ ...post, ...patch });
              setDialog(null);
              toast({ title: "Post updated" });
            }}
          />
        )}
        {dialog === "Send to a Bond" && (
          <SendToBondModal
            postId={post.id}
            onClose={() => setDialog(null)}
            onSent={(name) => {
              setDialog(null);
              toast({ title: `Sent to ${name}` });
            }}
          />
        )}
        {dialog === "Report Post" && (
          <ReportPostModal
            postId={post.id}
            onClose={() => setDialog(null)}
            onReported={() => {
              setDialog(null);
              toast({ title: "Report submitted" });
            }}
          />
        )}
        {dialog === "Delete Post" && (
          <DeletePostModal
            postId={post.id}
            onClose={() => setDialog(null)}
            onDeleted={() => {
              setDialog(null);
              setDeleted(true);
              toast({ title: "Post deleted", tone: "danger" });
            }}
          />
        )}
      </div>
    </article>
  );
}

function Action({
  icon,
  label,
  tone,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  tone: "root" | "muted" | "outline";
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active || undefined}
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-2 font-sans text-sm transition-colors",
        tone === "root" &&
          (active
            ? "bg-primary-500 text-white hover:bg-primary-400"
            : "bg-primary-50 text-primary-500 hover:bg-primary-100"),
        tone === "muted" && "bg-ivory-400 text-ink-400 hover:bg-ivory-500",
        tone === "outline" &&
          "border-[1.3px] border-ink-400 text-ink-400 hover:bg-ivory-200",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="none" className={className} aria-hidden="true">
      <path
        d="M1.5 4h9v6h-9V4ZM4.25 4V3a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75v1"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
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

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.3A7.9 7.9 0 0 1 4 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="18" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="18" cy="12" r="1.8" />
    </svg>
  );
}
