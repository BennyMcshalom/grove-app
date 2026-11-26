import { notFound, redirect } from "next/navigation";
import { SpaceView, type SpaceMember } from "@/components/app/SpaceView";
import { PausedSpaceNotice } from "@/components/app/pass/PausedSpaceNotice";
import { getShellViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { loadConversations, loadFeed } from "@/lib/feed";
import { SpaceConversations } from "@/components/app/conversations/SpaceConversations";
import { newExperienceOn } from "@/lib/experience";
import { createClient } from "@/lib/supabase/server";

/**
 * A space — Figma frames 172:3169 (Roots), 172:4641 (Open), 172:6133
 * (Anonymous) and 172:6458 (Ask Members). Data here; tabs in SpaceView.
 */
export default async function SpacePage({ params, searchParams }: PageProps<"/spaces/[chapter]">) {
  const [{ chapter: slug }, { view }] = await Promise.all([params, searchParams]);
  if (!getChapter(slug)) notFound();

  const viewer = await getShellViewer();
  const held = viewer.chapters.find((c) => c.slug === slug);

  // The new Space page (Phase 1): its conversations, open to anyone signed in.
  // ?view=classic (members, questions, chapter settings) is the legacy page.
  if (view !== "classic" && (await newExperienceOn())) {
    const firstPage = await loadConversations({ view: "space", chapterSlug: slug }, null, viewer.firstName);
    return <SpaceConversations key={firstPage.posts[0]?.id ?? "empty"} slug={slug} joined={Boolean(held)} firstPage={firstPage} />;
  }

  // A space's feed is for the people holding it.
  if (!held) redirect("/spaces");

  const supabase = await createClient();
  const [roots, { data: members }, { data: questions }, { data: hasRegion }] = await Promise.all([
    loadFeed({ scope: "roots", chapterSlug: slug }, viewer.firstName),
    supabase.rpc("space_members", { p_chapter_slug: slug }),
    supabase.rpc("live_space_questions", { p_chapter_slug: slug }),
    supabase.rpc("has_region"),
  ]);

  return (
    <>
    {held.pausedAt && <PausedSpaceNotice userChapterId={held.id} name={getChapter(slug)!.name} />}
    <SpaceView
      slug={slug}
      userChapterId={held.id}
      phase={held.phase}
      hasRegion={hasRegion === true}
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
        expiresAt: q.expires_at,
      }))}
    />
    </>
  );
}
