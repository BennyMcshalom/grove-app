import { FeedList } from "@/components/app/FeedList";
import { TopBar } from "@/components/app/TopBar";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";

/**
 * Kept — the posts you tapped Keep on, newest post first. They stay readable
 * to you after the feed's 48 hours (shared with Everyone, no block between
 * you). No Figma frame; it's the feed column, like a post's own page.
 */
export default async function KeptPage() {
  const viewer = await getShellViewer();
  const firstPage = await loadFeed({ scope: "kept" }, viewer.firstName);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Kept" back="/home" />
      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-6 pb-10">
          <FeedList
            query={{ scope: "kept" }}
            initial={firstPage}
            empty={
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-6 py-12 text-center">
                <p className="font-sans text-base font-medium text-ink-500">Nothing kept yet</p>
                <p className="max-w-[360px] font-sans text-sm text-ink-300">
                  Tap Keep on a post, or choose Keep Post from its menu, and it stays here after it leaves your feed.
                </p>
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
