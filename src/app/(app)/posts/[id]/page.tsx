import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/app/PostCard";
import { TopBar } from "@/components/app/TopBar";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadPost } from "@/lib/feed";

/**
 * One post on its own — where notifications, search and shared links point.
 * Figma has no frame for it; it's the feed column with a single card.
 */
export default async function PostPage({ params }: PageProps<"/posts/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const viewer = await getShellViewer();
  const post = await loadPost(id, viewer.firstName);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Post" back="/home" />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
          {post ? (
            <PostCard post={post} />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface px-6 py-12 text-center">
              <p className="font-sans text-base text-ink-500">This post isn&rsquo;t available.</p>
              <p className="font-sans text-sm text-ink-300">
                It may have been deleted, or it&rsquo;s in a space you don&rsquo;t hold.
              </p>
              <Link href="/home" className="font-sans text-sm font-medium text-primary-600 hover:underline">
                Back to your feed
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
