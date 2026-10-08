import { BlockedAccountsView } from "@/components/app/settings/PrivacySections";
import { getShellViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/** Settings → Privacy & AI controls → Blocked accounts — Figma 1608:36232 (phone 1807:46066). */
export default async function BlockedPage() {
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id, created_at")
    .eq("blocker_id", viewer.id)
    .order("created_at", { ascending: false });

  // By name and photo (profiles are readable to members).
  const ids = (blocks ?? []).map((b) => b.blocked_id);
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, first_name, avatar_url").in("id", ids)
    : { data: [] };

  return (
    <BlockedAccountsView
      initial={(blocks ?? []).flatMap((b) => {
        const person = people?.find((p) => p.id === b.blocked_id);
        return person
          ? [{ userId: person.id, name: person.first_name, avatarUrl: person.avatar_url, blockedAt: b.created_at }]
          : [];
      })}
    />
  );
}
