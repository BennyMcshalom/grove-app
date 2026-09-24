import { HomeFeed } from "@/components/app/HomeFeed";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";
import { loadDailyCards } from "@/lib/bond-actions";

/** Home feed — Figma frame 58:2301. The first page renders on the server. */
export default async function HomePage() {
  const viewer = await getShellViewer();
  // Cards load with the feed so they don't pop in above it afterwards.
  const [firstPage, cards] = await Promise.all([loadFeed({ scope: "home" }, viewer.firstName), loadDailyCards()]);

  // Keyed on the newest post so a new post (which refreshes the page)
  // restarts the feed from the top.
  return <HomeFeed key={firstPage.posts[0]?.id ?? "empty"} firstPage={firstPage} cards={cards} />;
}
