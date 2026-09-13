import { LogView } from "@/components/app/LogView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadBondPeople } from "@/lib/bonds-server";
import { loadCircleLogs, loadMyLogEntries, loadTodaysPrompts, logWeekStart } from "@/lib/log-server";
import { createClient } from "@/lib/supabase/server";

/** Grouv Log — Figma frame 246:6062. Data here; tabs and cards in LogView. */
export default async function LogPage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();
  const slugs = viewer.chapters.map((c) => c.slug);

  const [entries, circleSolo, circleBond, prompts, people, { data: profile }] = await Promise.all([
    loadMyLogEntries(viewer.id),
    loadCircleLogs("solo"),
    loadCircleLogs("bond"),
    loadTodaysPrompts(slugs),
    loadBondPeople(),
    supabase.from("profiles").select("log_visibility").eq("id", viewer.id).single(),
  ]);

  return (
    <LogView
      entries={entries}
      circleSolo={circleSolo}
      circleBond={circleBond}
      prompts={prompts}
      bonds={people.flatMap((p) => (p.relationship === "bond" && p.bondId ? [{ bondId: p.bondId, name: p.name }] : []))}
      visibility={profile?.log_visibility ?? "circle"}
      weekStart={logWeekStart()}
    />
  );
}
