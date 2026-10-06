import { notFound, redirect } from "next/navigation";
import { PersonView, type Person } from "@/components/app/PersonView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadFeed } from "@/lib/feed";
import { loadMyLogEntries } from "@/lib/log-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Someone's Grouv — where tapping their photo anywhere leads, as well as
 * search results and moderation. The same page as Your Grouv: their banner
 * and rings (the three prompts show only to bonds — RLS on profile_prompts —
 * so others see the rings without the words), their card with Space · stage
 * chips and the actions, then their posts and logged moments as grids,
 * limited by RLS to what the viewer may see: audience and circle rules for
 * posts, their log visibility for moments. Their open spaces are public to
 * signed-in users.
 */
export default async function PersonPage({ params }: PageProps<"/people/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const viewer = await getShellViewer();
  if (id === viewer.id) redirect("/settings/your-grouv");

  const supabase = await createClient();
  const pair = `and(requester_id.eq.${viewer.id},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${viewer.id})`;

  const [
    { data: profile },
    { data: chapters },
    { data: connection },
    { data: bond },
    { data: prompts },
    { data: block },
    { data: ringPeople },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, avatar_url, aura, location_label, onboarded_at, banner")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("user_chapters")
      .select("chapter_slug, phase")
      .eq("user_id", id)
      .eq("status", "open")
      .order("is_primary", { ascending: false })
      .order("opened_at"),
    supabase.from("connections").select("id, status, requester_id, intro_message, intro_prompt").or(pair).maybeSingle(),
    supabase
      .from("bonds")
      .select("id, status")
      .or(`and(inviter_id.eq.${viewer.id},invitee_id.eq.${id}),and(inviter_id.eq.${id},invitee_id.eq.${viewer.id})`)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("profile_prompts").select("honest_tension, sitting_with, open_to").eq("user_id", id).maybeSingle(),
    // Only blocks the viewer made are readable.
    supabase.from("blocks").select("blocked_id").eq("blocker_id", viewer.id).eq("blocked_id", id).maybeSingle(),
    // The faces on their rings: you, and connections you share.
    supabase.rpc("grouv_people", { p_user_id: id }),
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

  // Nothing of theirs shows while you've blocked them.
  const [posts, logs] = block
    ? [{ posts: [], nextCursor: null }, []]
    : await Promise.all([
        loadFeed({ scope: "person", authorId: id }, viewer.firstName),
        // Solo moments only: Bond Logs belong inside the Bond.
        loadMyLogEntries(id, { limit: 60 }).then((entries) => entries.filter((e) => e.scope === "solo")),
      ]);

  return (
    <PersonView
      person={{
        id: profile.id,
        name: profile.first_name,
        avatarUrl: profile.avatar_url,
        aura: profile.aura,
        banner: profile.banner,
        locationLabel: profile.location_label,
        chapters: (chapters ?? []).map((c) => ({ slug: c.chapter_slug, phase: c.phase, shared: held.has(c.chapter_slug) })),
        relationship,
        connectionId: connection?.status === "pending" ? connection.id : null,
        // Their note, when they introduced themselves and it waits on you.
        intro:
          relationship === "asked_you" && connection?.intro_message
            ? { message: connection.intro_message, prompt: connection.intro_prompt }
            : null,
        blocked: Boolean(block),
        prompts: prompts
          ? { honestTension: prompts.honest_tension, sittingWith: prompts.sitting_with, openTo: prompts.open_to }
          : null,
        people: (ringPeople ?? []).map((p) => ({
          userId: p.user_id,
          name: p.first_name,
          avatarUrl: p.avatar_url,
          aura: p.aura,
          relationship: p.relationship,
        })),
      }}
      posts={posts}
      logs={logs}
    />
  );
}
