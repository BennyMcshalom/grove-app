import { EventsView } from "@/components/app/EventsView";
import { getShellViewer } from "@/lib/auth/viewer";
import { loadEvents, loadLiveRooms } from "@/lib/events-server";

/** Events — Figma frame 354:6662. Data here; tabs and cards in EventsView. */
export default async function EventsPage() {
  await getShellViewer();
  const [events, rooms] = await Promise.all([loadEvents({ limit: 100 }), loadLiveRooms()]);
  return <EventsView events={events} rooms={rooms} />;
}
