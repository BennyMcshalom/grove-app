import { notFound } from "next/navigation";
import { BondLogView } from "@/components/app/bonds/BondLogView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadBondDetails, loadBondLog } from "@/lib/bonds-server";

/**
 * One Bond's shared log — Figma 1185:21160 / 1303:22270 (populated) and
 * 1303:22885 (released, read-only).
 */
export default async function BondLogPage({ params }: PageProps<"/log/bonds/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await getShellViewer();

  const [details, rounds] = await Promise.all([loadBondDetails(id), loadBondLog(id)]);
  if (!details) notFound();

  return <BondLogView details={details} rounds={rounds} />;
}
