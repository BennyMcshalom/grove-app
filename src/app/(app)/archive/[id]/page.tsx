import { notFound } from "next/navigation";
import { ChapterArchiveView } from "@/components/app/ChapterArchiveView";
import { getShellViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { loadFeed } from "@/lib/feed";
import { loadMyLogEntries } from "@/lib/log-server";
import { createClient } from "@/lib/supabase/server";

/**
 * Career Archive — Figma frames 382:11745 (Posts) and 433:16789 (Logs).
 *
 * Keyed by the closed chapter's id rather than its slug: the same chapter can
 * be opened and closed more than once, and each closing has its own reflection.
 */
export default async function ChapterArchivePage({ params }: PageProps<"/archive/[id]">) {
  const { id } = await params;
  const viewer = await getShellViewer();
  const supabase = await createClient();

  const { data: chapter } = await supabase
    .from("user_chapters")
    .select(
      "id, chapter_slug, opened_at, closed_at, chapter_closures(taught, advice, carrying_forward, reflections)",
    )
    .eq("id", id)
    .eq("user_id", viewer.id)
    .eq("status", "closed")
    .maybeSingle();

  if (!chapter?.closed_at) notFound();

  const postsQuery = {
    scope: "mine" as const,
    chapterSlug: chapter.chapter_slug,
    from: chapter.opened_at,
    to: chapter.closed_at,
  };

  const [{ data: tallies }, { data: bonds }, posts, logs] = await Promise.all([
    supabase.rpc("chapter_tallies", { p_user_chapter_id: chapter.id }),
    // close_chapter releases a chapter's bonds in the same transaction, so
    // they carry its exact closing time.
    supabase
      .from("bonds")
      .select(
        "inviter_id, inviter:profiles!bonds_inviter_id_fkey(first_name, avatar_url), invitee:profiles!bonds_invitee_id_fkey(first_name, avatar_url)",
      )
      .eq("status", "released")
      .eq("chapter_slug", chapter.chapter_slug)
      .eq("released_at", chapter.closed_at)
      .or(`inviter_id.eq.${viewer.id},invitee_id.eq.${viewer.id}`),
    loadFeed(postsQuery, viewer.firstName),
    loadMyLogEntries(viewer.id, { userChapterId: chapter.id }),
  ]);

  const closure = chapter.chapter_closures;
  const tally = tallies?.[0];

  return (
    <ChapterArchiveView
      name={getChapter(chapter.chapter_slug)?.name ?? "Chapter"}
      posts={posts}
      postsQuery={postsQuery}
      logs={logs}
      reflection={{
        taught: closure?.taught ?? null,
        advice: closure?.advice ?? null,
        carryingForward: closure?.carrying_forward ?? null,
        reflections: closure?.reflections ?? [],
        postCount: tally?.post_count ?? 0,
        logCount: tally?.log_count ?? 0,
        releasedBonds: (bonds ?? []).flatMap((bond) => {
          const other = bond.inviter_id === viewer.id ? bond.invitee : bond.inviter;
          return other ? [{ name: other.first_name, avatarUrl: other.avatar_url }] : [];
        }),
      }}
    />
  );
}
