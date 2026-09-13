import { GroupsView } from "@/components/app/GroupsView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadGroups } from "@/lib/groups-server";

/** Chapter Groups — Figma frame 177:3542. Data here; list in GroupsView. */
export default async function GroupsPage() {
  await getShellViewer();
  const groups = await loadGroups({ limit: 100 });
  return <GroupsView groups={groups} />;
}
