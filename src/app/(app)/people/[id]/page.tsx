import { notFound, redirect } from "next/navigation";
import { PersonView, type Person } from "@/components/app/PersonView";
import { getShellViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/**
 * Someone's profile — where search results and moderation point. Figma has no
 * frame for it; it's Settings' profile banner for another person. Their open
 * spaces are public to signed-in users; the three prompts show only to bonds
 * (RLS on profile_prompts).
 */
export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const viewer = await getShellViewer();
  if (id === viewer.id) redirect("/settings");

  const supabase = await createClient();
  const pair = `and(requester_id.eq.${viewer.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${viewer.id})`;

  const [{ data: profile }, { data: chapters }, { data: connection }, { data: bond }, { data: prompts }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, avatar_url, aura, location_label, onboarded_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("user_chapters")
        .select("chapter_slug, phase")
        .eq("user_id", id)
        .eq("status", "open")
        .order("opened_at"),
      supabase.from("connections").select("id, status, requester_id").or(pair).maybeSingle(),
      supabase
        .from("bonds")
        .select("id, status")
        .or(`and(inviter_id.eq.${viewer.id},invitee_id.eq.${id}),and(inviter_id.eq.${id},invitee_id.eq.${viewer.id})`)
        .eq("status", "active")
        .maybeSingle(),
      supabase.from("profile_prompts").select("honest_tension, sitting_with, open_to").eq("user_id", id).maybeSingle(),
    ]);

  if (!profile?.onboarded_at) notFound();

  const relationship: Person["relationship"] = bond
    ? "bond"
    : connection?.status === "accepted"
      ? "circle"
      : connection?.status === "pending"
        ? connection.requester_id === viewer.id
          ? "requested"
          : "asked_you"
        : "none";

  const held = new Set(viewer.chapters.map((c) => c.slug));

  return (
    <PersonView
      person={{
        id: profile.id,
        name: profile.first_name,
        avatarUrl: profile.avatar_url,
        aura: profile.aura,
        locationLabel: profile.location_label,
        chapters: (chapters ?? []).map((c) => ({ slug: c.chapter_slug, phase: c.phase, shared: held.has(c.chapter_slug) })),
        relationship,
        connectionId: connection?.status === "pending" ? connection.id : null,
        prompts: prompts
          ? { honestTension: prompts.honest_tension, sittingWith: prompts.sitting_with, openTo: prompts.open_to }
          : null,
      }}
    />
  );
}
