import Link from "next/link";
import { Avatar } from "@/components/app/Avatar";
import { PostMedia } from "@/components/app/PostMedia";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Linkify } from "@/components/ui/Linkify";
import { progressLabel } from "@/lib/posts";
import type { PublicComment, PublicPost } from "@/lib/public-post";

/**
 * A post as someone outside it reads it — the X-style preview a shared link
 * opens: the post, its counts and the first few comments, then a wall.
 *
 * Signed out, the wall asks them to join (the rest of the thread, rooting
 * and replying need an account). Signed in but outside the post's Space, it
 * points them at Spaces instead. No Figma frame; built from the feed card
 * and comment thread so it reads like the app.
 */
export function PublicPostView({ post, signedIn }: { post: PublicPost; signedIn: boolean }) {
  const shown = post.topComments.length;
  // comments_count counts replies too; none of those are shown here.
  const hidden = Math.max(0, post.comments - shown);
  const badge = progressLabel(post.progress);
  const captionInImage = post.kind === "grouv" && post.media.length > 0;
  const joinHref = `/p/${post.id}/join`;
  const signInHref = `/sign-in?next=${encodeURIComponent(`/posts/${post.id}`)}`;
  // Every action that needs an account goes to the same place.
  const actionHref = signedIn ? "/spaces" : joinHref;

  return (
    <div className="flex flex-col gap-4">
      <article className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-[0px_1px_2px_0px_rgba(23,23,23,0.05)] sm:p-5">
        <header className="flex items-center gap-3">
          <Avatar src={post.avatar} name={post.author} className="size-10 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-lg font-semibold text-ink-700">{post.author}</span>
              {badge && (
                <span className="rounded-full bg-primary-50 px-2 py-1 font-sans text-xs font-semibold text-primary-500">
                  {badge}
                </span>
              )}
            </div>
            <span className="font-sans text-sm text-ink-300" suppressHydrationWarning>
              {post.time}
              {post.chapterName && <> · in {post.chapterName}</>}
            </span>
          </div>
        </header>

        {(post.title || (post.body && !captionInImage)) && (
          <div className="flex flex-col gap-1 py-1">
            {post.title && (
              <h1 className="font-sans text-xl font-semibold text-ink-700">
                <Linkify text={post.title} className="text-primary-600" />
              </h1>
            )}
            {post.body && !captionInImage && (
              <p className="font-sans text-base whitespace-pre-line break-words text-ink-400">
                <Linkify text={post.body} className="text-primary-600" />
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

        <hr className="border-ink-50" />

        {/* The counts show; acting on them needs an account. */}
        <footer className="flex flex-wrap gap-3">
          <Link
            href={actionHref}
            className="flex items-center gap-2 rounded-full bg-primary-50 px-4 py-2 font-sans text-sm text-primary-500 transition-colors hover:bg-primary-100"
          >
            <PlantIcon className="size-5" />
            Root {post.roots}
          </Link>
          <Link
            href={actionHref}
            className="flex items-center gap-2 rounded-full bg-ivory-400 px-4 py-2 font-sans text-sm text-ink-400 transition-colors hover:bg-ivory-500"
          >
            <ChatIcon className="size-5" />
            {post.comments} {post.comments === 1 ? "comment" : "comments"}
          </Link>
        </footer>
      </article>

      {shown > 0 && (
        <section aria-label="The start of the conversation" className="flex flex-col gap-5 rounded-2xl bg-surface p-4 sm:p-5">
          <ul className="flex flex-col gap-5">
            {post.topComments.map((comment) => (
              <li key={comment.id}>
                <CommentRow comment={comment} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-surface px-5 py-6 text-center">
        {signedIn ? (
          <>
            <h2 className="font-display text-xl font-semibold text-ink-800">
              {hidden > 0 ? "The rest of this conversation is in its Space" : "This conversation is in its Space"}
            </h2>
            <p className="max-w-[420px] font-sans text-sm text-ink-400">
              {post.chapterName ? `Hold ${post.chapterName}` : "Hold this post’s Space"} to read every comment, root
              the post and reply.
            </p>
            <Button href="/spaces" size="md" iconRight={<ArrowRight />}>
              See your Spaces
            </Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold text-ink-800">
              {hidden > 0
                ? `${hidden} more ${hidden === 1 ? "reply" : "replies"} in this conversation`
                : shown > 0
                  ? "Join the conversation"
                  : "Be the first to reply"}
            </h2>
            <p className="max-w-[420px] font-sans text-sm text-ink-400">
              {hidden > 0 ? "Join Grouv to read them all, root this post and add your own." : "Join Grouv to root this post and add your own reply."}{" "}
              It&rsquo;s free to start.
            </p>
            <div className="flex w-full max-w-[320px] flex-col gap-2">
              <Button href={joinHref} size="md" fullWidth iconRight={<ArrowRight />}>
                Join Grouv
              </Button>
              <Button href={signInHref} variant="secondary" size="md" fullWidth>
                I have an account
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function CommentRow({ comment }: { comment: PublicComment }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <Avatar src={comment.avatar} name={comment.author} sizes="40px" className="size-9 shrink-0 sm:size-10" />
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
        <div className="flex flex-wrap items-center gap-5 px-1 font-sans text-sm text-ink-400">
          <span className="flex items-center gap-1.5">
            <PlantIcon className="size-4" />
            Root {comment.roots}
          </span>
          {comment.replies > 0 && (
            <span>
              {comment.replies} {comment.replies === 1 ? "reply" : "replies"}
            </span>
          )}
        </div>
      </div>
    </div>
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
