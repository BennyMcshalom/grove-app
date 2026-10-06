import { notFound, redirect } from "next/navigation";
import { CompanionsManager, type OwnerUpdate } from "@/components/app/companions/CompanionsManager";
import { getShellViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { loadCompanionNote, loadOwnerCompanions } from "@/lib/companions-server";
import type { CompanionMessage } from "@/lib/invites";
import { siteUrl } from "@/lib/site-url";
import { signPaths } from "@/lib/storage-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Companions — the owner's side of "Walk alongside a chapter": who walks
 * with this chapter, invitations still out, the note and next milestone,
 * updates, each companion's check-ins, and removing someone.
 * `?c=<companion id>` opens that companion's thread.
 */
export default async function CompanionsPage({ params, searchParams }: PageProps<"/spaces/[chapter]/companions">) {
  const { chapter: slug } = await params;
  const { c } = await searchParams;
  const chapter = getChapter(slug);
  if (!chapter) notFound();

  const viewer = await getShellViewer();
  const held = viewer.chapters.find((h) => h.slug === slug);
  if (!held) redirect("/spaces");

  const supabase = await createClient();
  const [{ companions, invites }, note, { data: updateRows }, origin] = await Promise.all([
    loadOwnerCompanions(held.id),
    loadCompanionNote(held.id),
    supabase
      .from("companion_updates")
      .select("id, body, photo_path, created_at")
      .eq("user_chapter_id", held.id)
      .order("created_at", { ascending: false })
      .limit(30),
    siteUrl(),
  ]);

  // Each thread is checked by the database (owner of the relationship).
  const threads = await Promise.all(
    companions.map((m) => supabase.rpc("companion_thread", { p_companion_id: m.companionId })),
  );
  const threadById: Record<string, CompanionMessage[]> = {};
  companions.forEach((m, i) => {
    threadById[m.companionId] = (threads[i].data ?? []).map((t) => ({
      id: t.id,
      authorId: t.author_id,
      authorName: t.author_name,
      authorAvatar: t.author_avatar,
      body: t.body,
      createdAt: t.created_at,
    }));
  });

  const rows = updateRows ?? [];
  const [signed, { data: recipients }] = await Promise.all([
    signPaths("media", rows.map((u) => u.photo_path), { width: 900 }),
    rows.length
      ? supabase.from("companion_update_recipients").select("update_id").in("update_id", rows.map((u) => u.id))
      : Promise.resolve({ data: [] as { update_id: string }[] }),
  ]);
  const updates: OwnerUpdate[] = rows.map((u) => ({
    id: u.id,
    body: u.body,
    photoUrl: u.photo_path ? (signed.get(u.photo_path) ?? null) : null,
    createdAt: u.created_at,
    recipientCount: (recipients ?? []).filter((r) => r.update_id === u.id).length,
  }));

  return (
    <CompanionsManager
      slug={slug}
      userChapterId={held.id}
      phase={held.phase}
      companions={companions}
      invites={invites}
      threads={threadById}
      note={note}
      updates={updates}
      origin={origin}
      openCompanion={typeof c === "string" ? c : null}
    />
  );
}
