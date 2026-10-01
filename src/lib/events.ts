/** Event and Meet & Greet shapes, built on the server. */

export interface EventCard {
  id: string;
  title: string;
  icon: string;
  description: string | null;
  venueName: string;
  venueShort: string | null;
  chapterSlug: string;
  startsAt: string;
  capacity: number;
  goingCount: number;
  status: "scheduled" | "cancelled";
  conversationId: string;
  hostId: string | null;
  hostName: string | null;
  hostAvatar: string | null;
  going: boolean;
  circleGoing: number;
  /** Up to five attendee photos (circle members, and everyone for the host). */
  attendeeAvatars: string[];
  /** From geocoding the venue when the event was created; null if it wasn't found. */
  latitude: number | null;
  longitude: number | null;
  /** From the viewer's region; null when either location is unknown. */
  distanceKm: number | null;
}

/** "3 km away", or "Near you" under a kilometre. */
export function distanceLabel(km: number | null) {
  if (km === null) return null;
  if (km < 1) return "Near you";
  return `${km < 10 ? km.toFixed(1).replace(/.0$/, "") : Math.round(km)} km away`;
}

/** "Capacity reached" — nobody new can say I'll Grouv (the attendee trigger enforces it too). */
export function isFull(event: Pick<EventCard, "goingCount" | "capacity">) {
  return event.goingCount >= event.capacity;
}

/** How full the event is, 0–100, for the capacity bar. */
export function capacityPercent(event: Pick<EventCard, "goingCount" | "capacity">) {
  return event.capacity > 0 ? Math.min(100, (event.goingCount / event.capacity) * 100) : 100;
}

/** "12 of your circle have GROUV", or the head count when none of your circle is going. */
export function circleLabel(event: Pick<EventCard, "circleGoing" | "goingCount">) {
  return event.circleGoing > 0
    ? `${event.circleGoing} of your circle have GROUV`
    : `${event.goingCount} going`;
}

/** OpenStreetMap, which needs no key. */
export function mapUrl(latitude: number, longitude: number) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`;
}

export interface Attendee {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

export interface LiveRoom {
  id: string;
  title: string;
  communityLabel: string | null;
  venueName: string | null;
  hereCount: number;
  here: boolean;
}

export interface RoomPerson {
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string | null;
  phase: string | null;
  isMe: boolean;
  iWaved: boolean;
  wavedAtMe: boolean;
}

function ordinal(day: number) {
  if (day % 100 >= 11 && day % 100 <= 13) return `${day}th`;
  return `${day}${["th", "st", "nd", "rd"][day % 10] ?? "th"}`;
}

/** "Friday, 28th August 2026" in the viewer's clock. */
export function eventDateLabel(iso: string) {
  const date = new Date(iso);
  const weekday = date.toLocaleDateString("en-GB", { weekday: "long" });
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  return `${weekday}, ${ordinal(date.getDate())} ${month} ${date.getFullYear()}`;
}

/** "10:00AM". */
export function eventTimeLabel(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(" ", "");
}
