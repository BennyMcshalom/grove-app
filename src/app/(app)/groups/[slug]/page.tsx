import { notFound } from "next/navigation";
import { GroupView } from "@/components/app/GroupView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadGroups, loadJoinRequests, loadTruths, loadVideoTruths } from "@/lib/groups-server";

/**
 * Chapter group — Figma frames 205:8408 / 222:13524 (Conversation),
 * 206:10081 (Truth Board) and 206:10507 (Video Truths).
 */
export default async function GroupPage({ params }: PageProps<"/groups/[slug]">) {
  const { slug } = await params;
  const viewer = await getShellViewer();
  const [group] = await loadGroups({ slug, limit: 1 });
  if (!group) notFound();

  const member = group.myRole !== null;
  const [truths, videos, requests] = await Promise.all([
    member ? loadTruths(group.id) : Promise.resolve([]),
    member ? loadVideoTruths(group.id, viewer.id) : Promise.resolve([]),
    group.myRole === "admin" ? loadJoinRequests(group.id) : Promise.resolve([]),
  ]);

  return (
    <GroupView
      key={`${group.id}-${group.myRole ?? "none"}`}
      group={group}
      truths={truths}
      videos={videos}
      requests={requests}
    />
  );
}
