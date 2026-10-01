import { HomeFeed } from "@/components/app/HomeFeed";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";
import { loadDailyCards } from "@/lib/bond-actions";
import { loadIntroductions, loadMatches } from "@/lib/match-actions";
import { loadFreshWrap } from "@/lib/wrapped-server";

/**
 * Home feed — Figma frame 58:2301. The first page renders on the server,
 * with Chapter Today (introductions, Wrapped, match activity).
 *
 * `?matches=1` opens the potential-connections modal; `?intro=<id>` opens an
 * introduction's status (where the introduction notifications lead).
 */
export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const [viewer, params] = await Promise.all([getShellViewer(), searchParams]);
  // Cards load with the feed so they don't pop in above it afterwards.
  const [firstPage, cards, introductions, matches, wrap] = await Promise.all([
    loadFeed({ scope: "home" }, viewer.firstName),
    loadDailyCards(),
    loadIntroductions(),
    loadMatches(4),
    loadFreshWrap(viewer.id),
  ]);

  const intro = typeof params.intro === "string" ? params.intro : null;

  // Keyed on the newest post so a new post (which refreshes the page)
  // restarts the feed from the top.
  return (
    <HomeFeed
      key={firstPage.posts[0]?.id ?? "empty"}
      firstPage={firstPage}
      cards={cards}
      introductions={introductions}
      matchCount={matches.matches.length}
      wrap={wrap ? { id: wrap.id, range: wrap.range } : null}
      openMatches={params.matches === "1"}
      openIntroId={intro}
    />
  );
}
