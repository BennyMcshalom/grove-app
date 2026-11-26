"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/app/Avatar";
import { MentionText } from "@/components/app/MentionText";
import { PostComments } from "@/components/app/PostComments";
import { PostMedia } from "@/components/app/PostMedia";
import { StoryUpdates } from "@/components/app/PostCard";
import { useDismiss } from "@/components/app/PostMenu";
import { DeletePostModal, EditPostModal, ReportPostModal } from "@/components/app/PostModals";
import { ShareSheet } from "@/components/app/ShareSheet";
import { useToast } from "@/components/app/ToastProvider";
import { Linkify } from "@/components/ui/Linkify";
import { getChapter } from "@/lib/chapters";
import { cn } from "@/lib/cn";
import { getConversation, topicLabel } from "@/lib/conversations";
import { setFollowingStory, setHidden, setKept, setRooted, sharePostLink } from "@/lib/post-actions";
import type { FeedReason, Post, StoryUpdate } from "@/lib/posts";

/**
 * A conversation on the new Home and Space pages (Phase 1 handoff).
 *
 * Calm: name, "Unspoken · Family", the words, and the format's own actions:
 *   Unspoken    Relate · Respond · Keep
 *   Unfiltered  Agree · Another perspective · Keep
 *   Unfinished  Respond · Follow story
 *   Regular     Root · Respond
 * Share, Copy link, Hide, Report and "Why am I seeing this?" live in ⋯.
 * The same post ID and thread as everywhere else (/posts/<id>).
 */
export function ConversationCard({ post: initial, onHidden }: { post: Post; onHidden?: () => void }) {
  const [post, setPost] = useState(initial);
  const [rooted, setRootedState] = useState(initial.rooted);
  const [roots, setRoots] = useState(initial.roots);
  const [comments, setComments] = useState(initial.comments);
  const [kept, setKeptState] = useState(initial.kept);
  const [following, setFollowing] = useState(initial.following);
  const [updates, setUpdates] = useState<StoryUpdate[]>(initial.updates);
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"edit" | "delete" | "report" | "why" | null>(null);
  const [hidden, setHiddenState] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [linkPublic, setLinkPublic] = useState<boolean | null>(null);
  const toast = useToast();
  const router = useRouter();

  if (deleted) return null;

  const type = post.kind === "root" ? getConversation(post.conversation) : undefined;
  const isStory = type?.value === "unfinished";
  const chapter = getChapter(post.chapterSlug);
  const subhub = topicLabel(post.chapterSlug, post.topic);
  // "Unspoken · Family", "Unfinished · Learning", or "Career · Family" for a regular post.
  const context = [type?.label ?? chapter?.name, subhub ?? (type ? chapter?.name : undefined)].filter(Boolean).join(" · ");
  const link = () => `${window.location.origin}/posts/${post.id}`;

  const hide = async (next: boolean) => {
    setHiddenState(next);
    const result = await setHidden(post.id, next);
    if (result.error) {
      setHiddenState(!next);
      toast({ title: result.error, tone: "danger" });
    } else if (next) {
      onHidden?.();
    }
  };

  if (hidden) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-ink-100 px-4 py-3 font-sans text-sm text-ink-400">
        <span>Hidden. You won&rsquo;t see this post in your feeds.</span>
        <button type="button" onClick={() => void hide(false)} className="font-semibold text-ink-700 hover:underline">
          Undo
        </button>
      </div>
    );
  }

  const toggleRoot = async () => {
    const next = !rooted;
    setRootedState(next);
    setRoots((n) => Math.max(0, n + (next ? 1 : -1)));
    const result = await setRooted(post.id, next);
    if (result.error) {
      setRootedState(!next);
      setRoots((n) => Math.max(0, n + (next ? -1 : 1)));
      toast({ title: result.error, tone: "danger" });
    }
  };

  const toggleKept = async () => {
    const next = !kept;
    setKeptState(next);
    const result = await setKept(post.id, next);
    if (result.error) {
      setKeptState(!next);
      toast({ title: result.error, tone: "danger" });
      return;
    }
    toast(next ? { title: "Kept", action: "See Kept", onAction: () => router.push("/kept") } : { title: "Removed from Kept" });
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
    toast({ title: next ? "Following this story" : "Stopped following this story" });
  };

  const copyLink = async () => {
    void sharePostLink(post.id);
    try {
      await navigator.clipboard.writeText(link());
      toast({ title: "Link copied", tone: "confirm" });
    } catch {
      toast({ title: "Couldn’t copy the link", tone: "danger" });
    }
  };

  return (
    <article
      id={`post-${post.id}`}
      className="flex flex-col gap-3 rounded-2xl border border-ink-50 bg-surface p-4 sm:p-5"
    >
      <header className="flex items-start gap-3">
        <Avatar
          src={post.avatar}
          name={post.author}
          userId={post.anonymous ? null : post.authorId}
          sizes="36px"
          className="size-9 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-[15px] font-semibold text-ink-800">{post.author}</span>
          </span>
          <span className="font-sans text-xs text-ink-300" suppressHydrationWarning>
            {context && <>{context} · </>}
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
            className="-m-1 rounded-full p-1.5 text-ink-300 transition-colors hover:bg-ivory-200 hover:text-ink-500"
          >
            <DotsIcon className="size-5" />
          </button>
          {menuOpen && (
            <CardMenu
              mine={post.mine}
              hasReason={Boolean(post.reason)}
              onClose={() => setMenuOpen(false)}
              onSelect={(action) => {
                setMenuOpen(false);
                if (action === "share") document.getElementById(`share-${post.id}`)?.click();
                else if (action === "copy") void copyLink();
                else if (action === "hide") void hide(true);
                else setDialog(action);
              }}
            />
          )}
        </div>
      </header>

      {(post.title || post.body) && (
        <div className="flex flex-col gap-1.5">
          {post.title && (
            <p className="font-sans text-[16px] leading-snug font-semibold text-ink-800">
              <Linkify text={post.title} className="text-primary-600" />
            </p>
          )}
          {post.body && (
            <>
              <p
                className={cn(
                  "font-sans text-[15px] leading-relaxed whitespace-pre-line text-ink-600",
                  !expanded && "line-clamp-4",
                )}
              >
                <MentionText text={post.body} source="posts" id={post.id} className="text-primary-600" />
              </p>
              {!expanded && (post.body.length > 280 || post.body.split("\n").length > 4) && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="self-start font-sans text-sm font-medium text-ink-400 hover:text-ink-700"
                >
                  Read more
                </button>
              )}
            </>
          )}
        </div>
      )}

      {post.media.length > 0 && <PostMedia media={post.media} />}

      {isStory && (updates.length > 0 || addingUpdate) && (
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

      <footer className="-ml-2 flex flex-wrap items-center gap-1">
        {!isStory && (
          <TextAction
            active={rooted}
            onClick={toggleRoot}
            count={roots}
            icon={
              type?.value === "unspoken" ? (
                <HeartIcon filled={rooted} />
              ) : type?.value === "unfiltered" ? (
                <AgreeIcon filled={rooted} />
              ) : (
                <PlantIcon filled={rooted} />
              )
            }
          >
            {type?.rootLabel ?? "Root"}
          </TextAction>
        )}
        <TextAction
          active={commentsOpen}
          onClick={() => setCommentsOpen((v) => !v)}
          count={comments}
          icon={type?.value === "unfiltered" ? <PerspectiveIcon /> : <ChatIcon />}
        >
          {type?.replyLabel ?? "Respond"}
        </TextAction>
        {type && !isStory && (
          <TextAction active={kept} onClick={toggleKept} icon={<BookmarkIcon filled={kept} />}>
            {kept ? "Kept" : "Keep"}
          </TextAction>
        )}
        {isStory &&
          (post.mine ? (
            <TextAction active={addingUpdate} onClick={() => setAddingUpdate((v) => !v)} icon={<PlusIcon />}>
              Add an update
            </TextAction>
          ) : (
            <TextAction active={following} onClick={toggleFollowing} icon={<BellIcon filled={following} />}>
              {following ? "Following" : "Follow story"}
            </TextAction>
          ))}
      </footer>

      {commentsOpen && (
        <PostComments
          postId={post.id}
          placeholder={type?.replyPlaceholder}
          onCountChange={(delta) => setComments((n) => Math.max(0, n + delta))}
        />
      )}

      <ShareSheet
        url={typeof window === "undefined" ? "" : link()}
        title="A conversation on Grouv"
        onOpen={() => void sharePostLink(post.id).then((result) => setLinkPublic(result.public))}
        note={
          linkPublic === null
            ? undefined
            : linkPublic
              ? "Anyone with this link can read the post and the first few responses, without an account."
              : "Only people on Grouv who can already see this post can open the link."
        }
        trigger={(open) => <button id={`share-${post.id}`} type="button" hidden tabIndex={-1} aria-hidden="true" onClick={open} />}
      />

      {dialog === "why" && post.reason && (
        <WhyModal reason={post.reason} author={post.author} space={chapter?.name} onClose={() => setDialog(null)} />
      )}
      {dialog === "edit" && (
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
      {dialog === "report" && (
        <ReportPostModal postId={post.id} onClose={() => setDialog(null)} onReported={() => setDialog(null)} />
      )}
      {dialog === "delete" && (
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
    </article>
  );
}

function TextAction({
  active,
  onClick,
  count,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-sans text-sm font-medium transition-colors hover:bg-ivory-200",
        active ? "text-primary-600" : "text-ink-400 hover:text-ink-700",
      )}
    >
      <span className="size-[18px] shrink-0" aria-hidden="true">
        {icon}
      </span>
      {children}
      {count !== undefined && count > 0 && <span className="text-ink-300">{count}</span>}
    </button>
  );
}

const ICON = { viewBox: "0 0 24 24", className: "size-full", "aria-hidden": true } as const;
const LINE = { stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg {...ICON} fill={filled ? "currentColor" : "none"}>
      <path d="M12 19.5s-7.5-4.4-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10Z" {...LINE} />
    </svg>
  );
}

function AgreeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg {...ICON} fill={filled ? "currentColor" : "none"}>
      <path d="M7.5 10.5V19h-3v-8.5h3Zm0 0 3.6-6a1.8 1.8 0 0 1 3.3 1.3l-.9 3.7h4.6a2 2 0 0 1 2 2.4l-1.3 5.6a2 2 0 0 1-2 1.5H7.5" {...LINE} />
    </svg>
  );
}

function PlantIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg {...ICON} fill="none">
      <path
        d="M12 21v-7m0 0c0-3.3 2.7-6 6-6h2v1a6 6 0 0 1-6 6h-2Zm0 0c0-2.8-2.2-5-5-5H5v1a5 5 0 0 0 5 5h2Z"
        fill={filled ? "currentColor" : "none"}
        {...LINE}
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg {...ICON} fill="none">
      <path d="M4 12a8 8 0 1 1 3.5 6.6L4 20l1.2-3.3A7.9 7.9 0 0 1 4 12Z" {...LINE} />
    </svg>
  );
}

function PerspectiveIcon() {
  return (
    <svg {...ICON} fill="none">
      <path d="M3.5 9.5a5 5 0 0 1 5-5h1a5 5 0 0 1 0 10H7l-3 2.2.8-3.1A5 5 0 0 1 3.5 9.5Z" {...LINE} />
      <path d="M13.5 16.4a5 5 0 0 0 2 .4H17l3 2.2-.8-3.1a5 5 0 0 0-3.4-8.3" {...LINE} />
    </svg>
  );
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg {...ICON} fill={filled ? "currentColor" : "none"}>
      <path d="M6.5 4.5h11v15L12 15.8l-5.5 3.7v-15Z" {...LINE} />
    </svg>
  );
}

function BellIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg {...ICON} fill="none">
      <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5Z" fill={filled ? "currentColor" : "none"} {...LINE} />
      <path d="M10 20.5h4" {...LINE} />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...ICON} fill="none">
      <path d="M12 5.5v13M5.5 12h13" {...LINE} />
    </svg>
  );
}

type CardAction = "share" | "copy" | "hide" | "report" | "why" | "edit" | "delete";

function CardMenu({
  mine,
  hasReason,
  onClose,
  onSelect,
}: {
  mine: boolean;
  hasReason: boolean;
  onClose: () => void;
  onSelect: (action: CardAction) => void;
}) {
  const ref = useDismiss(onClose);
  const items: { action: CardAction; label: string; danger?: boolean }[] = [
    { action: "share", label: "Share" },
    { action: "copy", label: "Copy link" },
    ...(mine
      ? [
          { action: "edit" as const, label: "Edit" },
          { action: "delete" as const, label: "Delete", danger: true },
        ]
      : [
          { action: "hide" as const, label: "Hide" },
          { action: "report" as const, label: "Report", danger: true },
        ]),
    ...(hasReason ? [{ action: "why" as const, label: "Why am I seeing this?" }] : []),
  ];
  return (
    <div
      ref={ref}
      role="menu"
      className="absolute top-full right-0 z-20 mt-1 flex w-56 flex-col rounded-xl border border-ink-50 bg-surface py-1.5 shadow-[0px_8px_24px_0px_rgba(0,0,0,0.12)]"
    >
      {items.map((item) => (
        <button
          key={item.action}
          type="button"
          role="menuitem"
          onClick={() => onSelect(item.action)}
          className={cn(
            "flex items-center gap-3 px-4 py-2 text-left font-sans text-sm transition-colors hover:bg-ivory-200",
            item.danger ? "text-destructive-60" : "text-ink-600",
          )}
        >
          <span className={cn("size-[18px] shrink-0", !item.danger && "text-ink-400")} aria-hidden="true">
            {MENU_ICONS[item.action]}
          </span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

const MENU_ICONS: Record<CardAction, React.ReactNode> = {
  share: (
    <svg {...ICON} fill="none">
      <path d="M12 4v11M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" {...LINE} />
    </svg>
  ),
  copy: (
    <svg {...ICON} fill="none">
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" {...LINE} />
    </svg>
  ),
  hide: (
    <svg {...ICON} fill="none">
      <path d="M3.5 12S6.5 6 12 6s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6ZM4 4l16 16" {...LINE} />
      <circle cx="12" cy="12" r="2.5" {...LINE} />
    </svg>
  ),
  report: (
    <svg {...ICON} fill="none">
      <path d="M5.5 20.5V4.5M5.5 5h11l-2 4 2 4h-11" {...LINE} />
    </svg>
  ),
  why: (
    <svg {...ICON} fill="none">
      <circle cx="12" cy="12" r="8.5" {...LINE} />
      <path d="M9.8 9.5a2.3 2.3 0 0 1 4.4.8c0 1.5-2.2 2-2.2 3.2M12 16.5h.01" {...LINE} />
    </svg>
  ),
  edit: (
    <svg {...ICON} fill="none">
      <path d="m14.5 5.5 4 4M4.5 19.5l1-4L16 5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L8.5 18.5l-4 1Z" {...LINE} />
    </svg>
  ),
  delete: (
    <svg {...ICON} fill="none">
      <path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7M10.5 10.5v6M13.5 10.5v6" {...LINE} />
    </svg>
  ),
};

const WHY: Record<FeedReason, (author: string, space?: string) => string> = {
  connection: (author) => `You’re connected with ${author}.`,
  space: (_author, space) => `It’s in ${space ?? "one of your Spaces"}, a Space you’re part of.`,
  new_voice: (author) => `${author} is new to Grouv. New voices get a fair chance to be seen.`,
  discussion: () => "People are having a thoughtful conversation here.",
  public: () => "It’s a recent public conversation on Grouv.",
  following_story: () => "You follow this story.",
};

function WhyModal({
  reason,
  author,
  space,
  onClose,
}: {
  reason: FeedReason;
  author: string;
  space?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="why-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-surface p-5"
      >
        <h2 id="why-title" className="font-sans text-base font-semibold text-ink-800">
          Why you&rsquo;re seeing this
        </h2>
        <p className="font-sans text-[15px] text-ink-600">{WHY[reason](author, space)}</p>
        <p className="font-sans text-sm text-ink-400">
          For You weighs your Spaces, how recent a post is, the quality of the conversation, your connections and a
          little exploration. Nobody can pay to be shown more.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-1 self-end rounded-full bg-ink-800 px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-ink-700"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function DotsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}
