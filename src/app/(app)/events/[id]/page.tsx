import { EventView } from "@/components/app/EventView";

/**
 * Event View — Figma frame 452:9875.
 *
 * Every card in the Gatherings list opens this; Figma only draws the one
 * event, so the id selects nothing yet and the view renders its content.
 */
export default function EventPage() {
  return <EventView />;
}
