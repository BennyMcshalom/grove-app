"use client";

import { useState } from "react";
import { EmptyFeed } from "@/components/app/EmptyFeed";
import { GrouvHero, GrouvPage, GrouvTabs } from "@/components/app/GrouvProfile";
import { GrouvRings, type RingPerson, type RingPrompts } from "@/components/app/GrouvRings";
import { BannerPicker } from "@/components/app/settings/BannerPicker";
import { useViewer } from "@/components/app/ViewerProvider";
import { Button } from "@/components/ui/Button";
import type { LogEntry } from "@/lib/log";
import type { FeedPage } from "@/lib/posts";

export { LogTile } from "@/components/app/GrouvProfile";

/**
 * Your Grouv — Figma frames 417:16407 (Your Posts) and 435:18506 (Your Grouv
 * Logs). The same page as anyone else's Grouv (GrouvProfile), with your
 * banner to change and your own words in the rings.
 */
export function YourGrouvView({
  posts,
  logs,
  people,
  prompts,
}: {
  posts: FeedPage;
  logs: LogEntry[];
  people: RingPerson[];
  prompts: RingPrompts;
}) {
  const [pickingBanner, setPickingBanner] = useState(false);
  const viewer = useViewer();

  return (
    <GrouvPage
      title="Your Grouv"
      hero={
        <>
          {/* Your banner tops the rings card, as it does your profile card. */}
          <GrouvHero
            banner={viewer.banner}
            seed={viewer.id}
            bannerAction={
              <button
                type="button"
                onClick={() => setPickingBanner(true)}
                className="absolute top-3 right-3 rounded-full bg-surface/90 px-3 py-1.5 font-sans text-xs font-medium text-ink-700 shadow-sm transition-colors hover:bg-surface"
              >
                Change banner
              </button>
            }
          >
            <GrouvRings
              subject={{
                id: viewer.id,
                name: viewer.firstName,
                avatarUrl: viewer.avatarUrl,
                aura: viewer.aura,
                locationLabel: viewer.locationLabel,
                chapters: viewer.chapters.map((c) => ({ slug: c.slug, phase: c.phase })),
                self: true,
              }}
              people={people}
              prompts={prompts}
            />
          </GrouvHero>
          {pickingBanner && (
            <BannerPicker banner={viewer.banner} seed={viewer.id} onClose={() => setPickingBanner(false)} />
          )}
        </>
      }
    >
      <GrouvTabs
        labels={["Your Posts", "Your Grouv Logs"]}
        postsQuery={{ scope: "mine" }}
        posts={posts}
        postsEmpty={<EmptyFeed />}
        logs={logs}
        logsEmpty={
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-surface px-4 py-10 text-center">
            <p className="font-sans text-sm text-ink-300">You haven&rsquo;t logged a moment yet.</p>
            <Button size="sm" href="/log">
              Open Grouv Log
            </Button>
          </div>
        }
      />
    </GrouvPage>
  );
}
