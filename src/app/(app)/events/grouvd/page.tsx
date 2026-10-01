import Link from "next/link";
import { EmptyState } from "@/components/app/EmptyState";
import { GrouvdEventCard } from "@/components/app/EventsRail";
import { TopBar } from "@/components/app/TopBar";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadEvents } from "@/lib/events-server";

/**
 * Grouv'd Events — Figma frame 635:23035 (phone; "View Grouv'd Events" on
 * Gatherings opens it). The events you said I'll Grouv to, as the desktop
 * rail's cards. Desktop shows the same list in the Events rail.
 */
export default async function GrouvdEventsPage() {
  await getShellViewer();
  const events = await loadEvents({ mine: true, limit: 100 });

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <TopBar title="Grouv’d Events" back="/events" />

      <div className="min-h-0 flex-1 scroll-slim overflow-y-auto px-4 py-4 lg:px-8">
        <div className="mx-auto flex w-full max-w-[724px] flex-col gap-4 pb-10">
          {events.length === 0 ? (
            <EmptyState
              variant="screen"
              title="No Grouv’d Events"
              body="Events you say I’ll Grouv to show up here"
              action={
                <Link
                  href="/events"
                  className="font-sans text-sm font-medium text-primary-600 hover:underline"
                >
                  Find events near you
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {events.map((event) => (
                <li key={event.id}>
                  <GrouvdEventCard event={event} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
