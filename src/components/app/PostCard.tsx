"use client";

import { PostMedia } from "@/components/app/PostMedia";
import { Linkify } from "@/components/ui/Linkify";
import { MentionText } from "@/components/app/MentionText";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { PostComments } from "@/components/app/PostComments";
import { PostMenu, type PostMenuAction } from "@/components/app/PostMenu";
import {
  DeletePostModal,
  EditPostModal,
  ReportPostModal,
} from "@/components/app/PostModals";
import { SendToBondModal } from "@/components/app/SendToBondModal";
import { SpaceFrame, useSpaceLabelStyle } from "@/components/app/SpaceLabel";
import { ShareSheet, downloadFile } from "@/components/app/ShareSheet";
import { useToast } from "@/components/app/ToastProvider";
import {
  addStoryUpdate,
  deleteStoryUpdate,
  setFollowingStory,
  setKept,
  setRooted,
  sharePostLink,
} from "@/lib/post-actions";
import { conversationLine, getConversation } from "@/lib/conversations";
import { progressLabel, type Post, type StoryUpdate } from "@/lib/posts";
import { spaceCardClass } from "@/lib/chapters";
import { cn } from "@/lib/cn";

/**
 * Post — Figma component set 90:1354.
 *
 * Variants in Figma are "Post", "Post with video", "Comment with photo" and
 * "Grouv"; here the media is a prop since the chrome is identical across them.
 *
 * A post with a conversation type (src/lib/conversations.ts) says so under
 * the name ("Unspoken · Family") and names its actions for the type:
 * Relate / Agree are its Root, Respond / Another perspective its comments,
 * plus Keep, or Follow story on Unfinished posts, whose author adds updates.
 */
export function PostCard({
  post: initial,
  defaultCommentsOpen = false,
  onDeleted,
}: {
  post: Post;
  /** The post modal opens with its thread showing. */
  defaultCommentsOpen?: boolean;
  onDeleted?: () => void;
}) {
  const [post, setPost] = useState(initial);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rooted, setRootedState] = useState(initial.rooted);
  const [roots, setRoots] = useState(initial.roots);
  const [comments, setComments] = useState(initial.comments);
  const [commentsOpen, setCommentsOpen] = useState(defaultCommentsOpen);
  // Figma pairs each menu item with a modal and a confirming alert.
  const [dialog, setDialog] = useState<PostMenuAction | null>(null);
  const [deleted, setDeleted] = useState(false);
  // Who the share link reads for, once Share has asked.
  const [linkPublic, setLinkPublic] = useState<boolean | null>(null);
  const [kept, setKeptState] = useState(initial.kept);
  const [following, setFollowing] = useState(initial.following);
  const [updates, setUpdates] = useState<StoryUpdate[]>(initial.updates);
  const [addingUpdate, setAddingUpdate] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const labelStyle = useSpaceLabelStyle();

  if (deleted) return null;

  const type = post.kind === "root" ? getConversation(post.conversation) : undefined;
  const typeLine = type ? conversationLine(post.chapterSlug, post.conversation, post.topic) : undefined;
  const isStory = type?.value === "unfinished";

  const toggleKept = async () => {
    const next = !kept;
    setKeptState(next);
    const result = await setKept(post.id, next);
    if (result.error) {
      setKeptState(!next);
      toast({ title: result.error, tone: "danger" });
      return;
    }
    toast(
      next
        ? { title: "Kept", description: "It stays in your Kept list.", action: "See Kept", onAction: () => router.push("/kept") }
        : { title: "Removed from Kept" },
    );
  };

  const toggleFollowing = async () => {
    const next = !following;
    setFollowing(next);
    const result = await setFollowingStory(post.id, next);
    if (result.error) {
      setFollowing(!next);
      toast({ title: result.error, tone: "danger" });
      return;
    }
    toast(
      next
        ? { title: "Following this story", description: `We’ll let you know when ${post.anonymous ? "they add" : `${post.author} adds`} an update.` }
        : { title: "Stopped following this story" },
    );
  };

  const badge = progressLabel(post.progress);
  // Just Grouv: the caption sits inside the picture (Figma 110:3891).
  const captionInImage = post.kind === "grouv" && post.media.length > 0;
  // A post kept to a few people isn't drawn to share onwards.
  const canDownload = post.mine || post.audience === "everyone";
  const makeImage = () => import("@/components/app/postImage").then(({ postImage }) => postImage(post));
  const downloadImage = async () => {
    try {
      downloadFile(await makeImage());
      toast({ title: "PNG downloaded", tone: "confirm" });
    } catch {
      toast({ title: "Couldn’t make the image", tone: "danger" });
    }
  };

  const toggleRoot = async () => {
    const next = !rooted;
    // Optimistic, then put it back if the server says no.
    setRootedState(next);
    setRoots((n) => Math.max(0, n + (next ? 1 : -1)));

    const result = await setRooted(post.id, next);
    if (result.error) {
      setRootedState(!next);
      setRoots((n) => Math.max(0, n + (next ? -1 : 1)));
      toast({ title: result.error, tone: "danger" });
    }
  };

  return (
    // The wash hints at the Space; the label (banner or tag) names it.
    <SpaceFrame slug={post.chapterSlug}>
    <article
      id={`post-${post.id}`}
      // Each Space has its own wash, so a scroll shows where a post is from.
      className={cn(
        "flex gap-4 p-4 sm:p-5 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)]",
        labelStyle === "banner" && post.chapterSlug ? "rounded-xl" : "rounded-2xl",
        spaceCardClass(post.chapterSlug),
      )}
    >
      {/* Beside the post on wider screens; on phones it moves into the
          header so text and media get the card's full width (as X and
          LinkedIn do). */}
      <span className="hidden shrink-0 sm:block">
        <Avatar src={post.avatar} name={post.author} userId={post.anonymous ? null : post.authorId} className="size-10" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <header className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
          <Avatar src={post.avatar} name={post.author} userId={post.anonymous ? null : post.authorId} className="size-10 shrink-0 sm:hidden" />
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
              {typeLine && <>{typeLine} · </>}
              {post.time}
              {/* Only the author sees who a narrower post was for. */}
              {post.mine && post.audience !== "everyone" && (
                <> · {post.audience === "only_me" ? "Only me" : "Selected Bonds"}</>
              )}
            </span>
          </div>
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
                canDownload={canDownload}
                kept={kept}
                onClose={() => setMenuOpen(false)}
                onSelect={(action) => {
                  setMenuOpen(false);
                  if (action === "Download as PNG") void downloadImage();
                  else if (action === "Keep Post" || action === "Remove from Kept") void toggleKept();
                  else setDialog(action);
                }}
              />
            )}
          </div>
        </header>

        {(post.title || (post.body && !captionInImage)) && (
          <div className="flex flex-col gap-1 py-2">
            {post.title && (
              <h2 className="font-sans text-xl font-semibold text-ink-700">
                {/* A typed post's headline reads as something said. */}
                {type && "“"}
                <Linkify text={post.title} className="text-primary-600" />
                {type && "”"}
              </h2>
            )}
            {post.body && !captionInImage && (
              <p className="font-sans text-base whitespace-pre-line text-ink-400">
                <MentionText text={post.body} source="posts" id={post.id} className="text-primary-600" />
              </p>
            )}
          </div>
        )}

        {post.media.length > 0 && (
          <PostMedia
            media={post.media}
            caption={captionInImage ? post.body : undefined}
            postedAt={captionInImage ? post.createdAt : undefined}
          />
        )}

        {isStory && (updates.length > 0 || post.mine) && (
          <StoryUpdates
            postId={post.id}
            updates={updates}
            mine={post.mine}
            adding={addingUpdate}
            onAdding={setAddingUpdate}
            onAdded={(update) => {
              setUpdates((prev) => [...prev, update]);
              setAddingUpdate(false);
              toast({ title: "Update added", description: "Everyone following this story will hear about it." });
            }}
            onRemoved={(id) => setUpdates((prev) => prev.filter((u) => u.id !== id))}
          />
        )}

        <hr className="border-ink-50" />

        <footer className="flex flex-wrap gap-3 py-3 sm:gap-5">
          {/* Unfinished stories are followed rather than rooted. */}
          {!isStory && (
            <Action
              icon={
                type?.value === "unspoken" ? (
                  <HeartIcon className="size-6" />
                ) : type?.value === "unfiltered" ? (
                  <AgreeIcon className="size-6" />
                ) : (
                  <PlantIcon className="size-6" />
                )
              }
              // "Root 22", as comments show it. It never changes what
              // anyone's feed shows. Relate / Agree are the same Root.
              label={
                type ? (
                  <>
                    {/* The heart / thumb says it on phones. */}
                    <span className="hidden sm:inline">{type.rootLabel} </span>
                    {roots}
                  </>
                ) : (
                  <>Root {roots}</>
                )
              }
              ariaLabel={type ? `${type.rootLabel}, ${roots}` : undefined}
              compact={Boolean(type)}
              tone="root"
              active={rooted}
              onClick={toggleRoot}
            />
          )}
          <Action
            icon={type?.value === "unfiltered" ? <PerspectiveIcon className="size-6" /> : <ChatIcon className="size-6" />}
            label={
              <>
                <span className="hidden sm:inline">{type?.replyLabel ?? "Comment"} </span>
                {comments}
              </>
            }
            tone="muted"
            active={commentsOpen}
            onClick={() => setCommentsOpen((v) => !v)}
          />
          {isStory &&
            (post.mine ? (
              <Action
                icon={<PlusIcon className="size-6" />}
                label="Add an update"
                tone="root"
                active={addingUpdate}
                onClick={() => setAddingUpdate((v) => !v)}
              />
            ) : (
              <Action
                icon={<BellIcon className="size-6" />}
                label={following ? "Following" : "Follow story"}
                tone="root"
                active={following}
                onClick={toggleFollowing}
              />
            ))}
          {type && !isStory && (
            <Action
              icon={<BookmarkIcon className="size-6" filled={kept} />}
              label={<span className="hidden sm:inline">{kept ? "Kept" : "Keep"}</span>}
              ariaLabel={kept ? "Kept" : "Keep"}
              compact
              tone="muted"
              active={kept}
              onClick={toggleKept}
            />
          )}
          <ShareSheet
            url={`${typeof window === "undefined" ? "" : window.location.origin}/posts/${post.id}`}
            title="A post on Grouv"
            image={canDownload ? makeImage : undefined}
            onOpen={() => {
              // Sharing your own post opens its link; ask who it reads for.
              void sharePostLink(post.id).then((result) => setLinkPublic(result.public));
            }}
            note={
              linkPublic === null
                ? undefined
                : linkPublic
                  ? "Anyone with this link can read the post and the first few comments, without an account."
                  : "Only people on Grouv who can already see this post can open the link."
            }
            trigger={(open) => (
              <Action
                icon={<ShareIcon className="size-6" />}
                // A typed post has more actions: on phones Share is its icon.
                label={type ? <span className="hidden sm:inline">Share</span> : "Share"}
                ariaLabel={type ? "Share" : undefined}
                compact={Boolean(type)}
                tone="outline"
                onClick={open}
              />
            )}
          />
        </footer>

        {commentsOpen && (
          <PostComments
            postId={post.id}
            placeholder={type?.replyPlaceholder}
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
            onReported={() => setDialog(null)}
          />
        )}
        {dialog === "Delete Post" && (
          <DeletePostModal
            postId={post.id}
            onClose={() => setDialog(null)}
            onDeleted={() => {
              setDialog(null);
              setDeleted(true);
              onDeleted?.();
              toast({ title: "Post deleted", tone: "danger" });
            }}
          />
        )}
      </div>
    </article>
    </SpaceFrame>
  );
}

function Action({
  icon,
  label,
  tone,
  active = false,
  compact = false,
  ariaLabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: React.ReactNode;
  tone: "root" | "muted" | "outline";
  active?: boolean;
  /** Tighter padding on phones, for a row of four actions. */
  compact?: boolean;
  /** For an action whose words are hidden on phones. */
  ariaLabel?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active || undefined}
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-2 rounded-full py-2 font-sans text-sm transition-colors",
        compact ? "px-3 sm:px-4" : "px-4",
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

/**
 * An Unfinished story's updates, oldest first, as a thin timeline under the
 * post. The author adds one inline; followers are notified by the database.
 */
function StoryUpdates({
  postId,
  updates,
  mine,
  adding,
  onAdding,
  onAdded,
  onRemoved,
}: {
  postId: string;
  updates: StoryUpdate[];
  mine: boolean;
  adding: boolean;
  onAdding: (adding: boolean) => void;
  onAdded: (update: StoryUpdate) => void;
  onRemoved: (id: string) => void;
}) {
  const toast = useToast();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string>();
  const [saving, startSaving] = useTransition();

  const save = () => {
    const body = draft.trim();
    if (!body) return;
    setError(undefined);
    startSaving(async () => {
      const result = await addStoryUpdate(postId, body);
      if (result.error || !result.update) {
        setError(result.error ?? "We couldn't add that update.");
        return;
      }
      setDraft("");
      onAdded(result.update);
    });
  };

  const remove = async (id: string) => {
    const result = await deleteStoryUpdate(id);
    if (result.error) toast({ title: result.error, tone: "danger" });
    else onRemoved(id);
  };

  if (updates.length === 0 && !adding) return null;

  return (
    <section aria-label="Story updates" className="flex flex-col gap-3">
      {updates.length > 0 && (
        <ol className="flex flex-col gap-3 border-l-2 border-primary-100 pl-4">
          {updates.map((update, index) => (
            <li key={update.id} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 font-sans text-xs font-semibold tracking-wide text-primary-600 uppercase">
                Update {index + 1}
                <span className="font-normal tracking-normal text-ink-300 normal-case" suppressHydrationWarning>
                  · {update.time}
                </span>
                {mine && (
                  <button
                    type="button"
                    onClick={() => void remove(update.id)}
                    className="ml-auto font-sans text-xs font-normal tracking-normal text-destructive-60 normal-case hover:underline"
                  >
                    Remove
                  </button>
                )}
              </span>
              <p className="font-sans text-base break-words whitespace-pre-line text-ink-500">
                <Linkify text={update.body} className="text-primary-600" />
              </p>
            </li>
          ))}
        </ol>
      )}

      {mine && adding && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-sm font-medium tracking-wide text-ink-500 uppercase">Where is it now?</span>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              maxLength={2000}
              autoFocus
              placeholder="Week two: …"
              className="w-full resize-y rounded-lg bg-ivory-100 px-3.5 py-2.5 font-sans text-base text-ink-500 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-ink-200 focus:shadow-[0px_0px_0px_4px_rgba(249,189,152,0.25)]"
            />
          </label>
          {error && <p className="font-sans text-sm text-destructive-60">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => onAdding(false)}
              className="rounded-full px-4 py-2 font-ui text-sm font-medium text-ink-500 hover:bg-ivory-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!draft.trim() || saving}
              className="rounded-full bg-primary-500 px-4 py-2 font-ui text-sm font-medium text-white transition-colors hover:bg-primary-400 disabled:bg-ink-50 disabled:text-ink-200"
            >
              {saving ? "Adding…" : "Add update"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgreeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M7.5 10.5V19h-3v-8.5h3Zm0 0 3.6-6a1.8 1.8 0 0 1 3.3 1.3l-.9 3.7h4.6a2 2 0 0 1 2 2.4l-1.3 5.6a2 2 0 0 1-2 1.5H7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PerspectiveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.5 9.5a5 5 0 0 1 5-5h1a5 5 0 0 1 0 10H7l-3 2.2.8-3.1A5 5 0 0 1 3.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 16.4a5 5 0 0 0 2 .4H17l3 2.2-.8-3.1a5 5 0 0 0-3.4-8.3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BookmarkIcon({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} className={className} aria-hidden="true">
      <path d="M6.5 4.5h11v15L12 15.8l-5.5 3.7v-15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5ZM10 20.5h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 5.5v13M5.5 12h13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
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
