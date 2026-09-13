import { BondsView } from "@/components/app/BondsView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadBondPeople, loadPendingRequests, loadSuggestions } from "@/lib/bonds-server";

/**
 * Bonds — Figma frames 452:10158 (desktop) and 635:18535 / 635:19212 (phone).
 * `?with=<user id>` opens that person's conversation ("Let's Grouv", rails).
 */
export default async function BondsPage({ searchParams }: PageProps<"/bonds">) {
  const { with: withUser } = await searchParams;
  await getShellViewer();

  const [people, pending, suggestions] = await Promise.all([
    loadBondPeople(),
    loadPendingRequests(),
    loadSuggestions(6),
  ]);

  const openWith =
    typeof withUser === "string" && people.some((p) => p.userId === withUser) ? withUser : null;

  return (
    <BondsView
      people={people}
      pending={pending}
      suggestions={suggestions}
      openWith={openWith}
    />
  );
}
