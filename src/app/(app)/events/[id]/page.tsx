import { notFound } from "next/navigation";
import { EventView } from "@/components/app/EventView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadAttendees, loadEvents } from "@/lib/events-server";

/** Event View — Figma frame 452:9875. */
export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const viewer = await getShellViewer();
  const [[event], attendees] = await Promise.all([loadEvents({ eventId: id, limit: 1 }), loadAttendees(id)]);
  if (!event) notFound();

  return (
    <EventView
      key={`${event.id}-${event.going}`}
      event={event}
      attendees={attendees}
      isHost={event.hostId === viewer.id}
    />
  );
}
