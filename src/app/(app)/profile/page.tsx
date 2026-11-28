import { redirect } from "next/navigation";
import { YourProfileView } from "@/components/app/LeanProfile";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";
import { FEATURES } from "@/lib/features";

/** Your profile, its own tab (2026-11-28): your name and your posts. */
export default async function ProfilePage() {
  // With the full Grouv profile switched back on, it lives where it used to.
  if (FEATURES.richProfile) redirect("/settings/your-grouv");
  const viewer = await getShellViewer();
  const posts = await loadFeed({ scope: "mine" }, viewer.firstName);
  return <YourProfileView posts={posts} />;
}
