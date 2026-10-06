import { redirect } from "next/navigation";
import { CompanionChapterView, CompanionGone } from "@/components/app/companions/CompanionChapterView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadCompanionChapter } from "@/lib/companions-server";

/**
 * A chapter you walk alongside — the full page behind "Open chapter" and
 * every companion notification. Access is checked in the database on every
 * load: removed or left, and there's nothing to show.
 */
export default async function WalkingChapterPage({ params }: PageProps<"/walking/[id]">) {
  const { id } = await params;
  const viewer = await getShellViewer();
  const uuid = /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  const data = uuid ? await loadCompanionChapter(uuid) : null;
  if (!data) return <CompanionGone />;
  // The owner manages the same relationship from their own chapter.
  if (data.isOwner) redirect(`/spaces/${data.chapterSlug}/companions?c=${data.companionId}`);
  return <CompanionChapterView data={data} viewerId={viewer.id} />;
}
