import { BondsView } from "@/components/app/BondsView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadBondInvites, loadBondPeople, loadPendingRequests, loadSuggestions } from "@/lib/bonds-server";

/**
 * Bonds — Figma frames 452:10158, 1075:19428, 1093:22073 (desktop) and
 * 635:18535 / 635:19212 (phone).
 * `?with=<user id>` opens that person's conversation ("Let's Grouv", rails).
 */
export default async function BondsPage({ searchParams }: PageProps<"/bonds">) {
  const { with: withUser } = await searchParams;
  await getShellViewer();

  const [people, invites, pending, suggestions] = await Promise.all([
    loadBondPeople(),
    loadBondInvites(),
    loadPendingRequests(),
    loadSuggestions(6),
  ]);

  const openWith =
    typeof withUser === "string" && people.some((p) => p.userId === withUser) ? withUser : null;

  return (
    <BondsView
      people={people}
      invites={invites}
      pending={pending}
      suggestions={suggestions}
      openWith={openWith}
    />
  );
}
