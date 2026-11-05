import type { Metadata } from "next";
import Link from "next/link";
import { PublicPostView } from "@/components/app/PublicPostView";
import { ArrowRight } from "@/components/ui/ArrowRight";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { loadPublicPost } from "@/lib/public-post";
import { siteUrl } from "@/lib/site-url";

/**
 * A shared post, signed out (grouv.app/posts/<id> lands here when there's no
 * session; signed-in visitors are sent back to /posts/<id> by the proxy).
 *
 * Like X: the post, its counts and the first few comments are free to read;
 * the rest of the thread, rooting and replying need an account. Only named
 * posts shared with Everyone open this way (the database decides) — any other
 * link gets a calm "sign in to see it" card that says nothing about the post.
 */

/** WhatsApp, X, iMessage and the rest preview the link with the post. */
export async function generateMetadata({ params }: PageProps<"/p/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = await loadPublicPost(id);
  // People's posts aren't for search engines, only for whoever has the link.
  const robots = { index: false, follow: false };
  if (!post) return { title: "A post on Grouv", robots };

  const origin = await siteUrl();
  const title = `${post.author} on Grouv`;
  const words = [post.title, post.body].filter(Boolean).join(" — ").replace(/\s+/g, " ").trim();
  const description = words ? (words.length > 180 ? `${words.slice(0, 177)}…` : words) : "A post shared from Grouv.";
  const image = post.firstPhotoPath ? `${origin}/p/${post.id}/image` : `${origin}/images/og-wordmark-dark.png`;

  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      url: `${origin}/posts/${post.id}`,
      siteName: "Grouv",
      type: "article",
      images: [{ url: image, alt: "" }],
    },
    twitter: { card: post.firstPhotoPath ? "summary_large_image" : "summary", title, description, images: [image] },
  };
}

export default async function PublicPostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const post = await loadPublicPost(id);
  const valid = /^[0-9a-f-]{36}$/i.test(id);
  const signInHref = valid ? `/sign-in?next=${encodeURIComponent(`/posts/${id}`)}` : "/sign-in";
  const joinHref = valid ? `/p/${id}/join` : "/sign-up";

  return (
    <main className="min-h-dvh bg-ivory-100">
      <header className="sticky top-0 z-10 border-b border-ink-50 bg-ivory-100/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[724px] items-center justify-between gap-3 px-4 py-3">
          <Link href="/" aria-label="Grouv home">
            <Logo className="h-7" />
          </Link>
          <div className="flex items-center gap-2">
            <Button href={signInHref} variant="secondary" size="sm">
              Sign in
            </Button>
            <Button href={joinHref} size="sm">
              Join Grouv
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 px-4 py-6 pb-12">
        {post ? (
          <PublicPostView post={post} signedIn={false} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-12 text-center">
            <h1 className="font-display text-2xl font-semibold text-ink-800">This post is on Grouv</h1>
            <p className="max-w-[420px] font-sans text-base text-ink-400">
              It&rsquo;s shared with the people around its author, so you&rsquo;ll need to sign in to see it. It may
              also have been deleted.
            </p>
            <div className="flex w-full max-w-[320px] flex-col gap-2 pt-2">
              <Button href={signInHref} size="md" fullWidth iconRight={<ArrowRight />}>
                Sign in
              </Button>
              <Button href={joinHref} variant="secondary" size="md" fullWidth>
                Join Grouv
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
