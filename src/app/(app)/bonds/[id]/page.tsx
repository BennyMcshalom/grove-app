import { notFound } from "next/navigation";
import { BondDetailsView } from "@/components/app/bonds/BondDetailsView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadBondCheckins, loadBondDetails } from "@/lib/bonds-server";

/**
 * Bond Details — Figma 1228:29301 (Season Pass) and 1238:30546 (Free, Bond
 * Log locked). Opened from the chat's "View Bond details".
 */
export default async function BondDetailsPage({ params }: PageProps<"/bonds/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const viewer = await getShellViewer();

  const [details, checkins] = await Promise.all([loadBondDetails(id), loadBondCheckins(id, viewer.id)]);
  if (!details) notFound();

  return <BondDetailsView details={details} checkins={checkins} />;
}
