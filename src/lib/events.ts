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
