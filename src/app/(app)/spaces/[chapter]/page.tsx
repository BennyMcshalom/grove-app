import { notFound, redirect } from "next/navigation";
import { SpaceView, type SpaceMember } from "@/components/app/SpaceView";
import { getShellViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { loadFeed } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";

/**
 * A space — Figma frames 172:3169 (Roots), 172:4641 (Open), 172:6133
 * (Anonymous) and 172:6458 (Ask Members). Data here; tabs in SpaceView.
 */
export default async function SpacePage({ params }: PageProps<"/spaces/[chapter]">) {
  const { chapter: slug } = await params;
  if (!getChapter(slug)) notFound();

  const viewer = await getShellViewer();
  const held = viewer.chapters.find((c) => c.slug === slug);
  // A space's feed is for the people holding it.
  if (!held) redirect("/spaces");

  const supabase = await createClient();
  const [roots, { data: members }, { data: questions }] = await Promise.all([
    loadFeed({ scope: "roots", chapterSlug: slug }, viewer.firstName),
    supabase.rpc("space_members", { p_chapter_slug: slug }),
    supabase.rpc("live_space_questions", { p_chapter_slug: slug }),
  ]);

  return (
    <SpaceView
      slug={slug}
      phase={held.phase}
      roots={roots}
      members={(members ?? []).map(
        (m): SpaceMember => ({
          userId: m.user_id,
          name: m.first_name,
          avatarUrl: m.avatar_url,
          phase: m.phase,
          inCircle: m.in_circle,
          connection:
            m.connection_status === "accepted"
              ? "connected"
              : m.connection_status === "pending"
                ? m.connection_from_me
                  ? "requested"
                  : "incoming"
                : // A decline looks like a request still waiting to whoever sent it.
                  m.connection_status === "declined" && m.connection_from_me
                  ? "requested"
                  : "none",
          bond: m.bond_status === "active" ? "active" : m.bond_status === "pending" ? "pending" : "none",
        }),
      )}
      questions={(questions ?? []).map((q) => ({
        id: q.id,
        body: q.body,
        isMine: q.is_mine,
        replyCount: q.reply_count,
      }))}
    />
  );
}
