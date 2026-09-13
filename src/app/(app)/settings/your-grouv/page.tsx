import { YourGrouvView } from "@/components/app/YourGrouvView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadBondPeople } from "@/lib/bonds-server";
import { loadFeed } from "@/lib/feed";
import { loadMyLogEntries } from "@/lib/log-server";
import { createClient } from "@/lib/supabase/server";

/** Your Grouv — Figma frames 417:16407 (Your Posts) and 435:18506 (Logs). */
export default async function YourGrouvPage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const [posts, logs, people, { data: prompts }] = await Promise.all([
    loadFeed({ scope: "mine" }, viewer.firstName),
    loadMyLogEntries(viewer.id, { limit: 60 }),
    loadBondPeople(),
    supabase
      .from("profile_prompts")
      .select("honest_tension, sitting_with, open_to")
      .eq("user_id", viewer.id)
      .maybeSingle(),
  ]);

  return (
    <YourGrouvView
      posts={posts}
      logs={logs}
      people={people.slice(0, 4).map((p) => ({
        userId: p.userId,
        name: p.name,
        avatarUrl: p.avatarUrl,
        relationship: p.relationship,
      }))}
      prompts={{
        struggling: prompts?.honest_tension ?? null,
        building: prompts?.sitting_with ?? null,
        open: prompts?.open_to ?? null,
      }}
    />
  );
}
