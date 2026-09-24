import { HomeFeed } from "@/components/app/HomeFeed";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";

/** Home feed — Figma frame 58:2301. The first page renders on the server. */
export default async function HomePage() {
  const viewer = await getShellViewer();
  const firstPage = await loadFeed({ scope: "home" }, viewer.firstName);

  // Keyed on the newest post so a new post (which refreshes the page)
  // restarts the feed from the top.
  return <HomeFeed key={firstPage.posts[0]?.id ?? "empty"} firstPage={firstPage} />;
}
