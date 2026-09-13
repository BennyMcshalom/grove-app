import "server-only";
import type { Attendee, EventCard, LiveRoom } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";

export async function loadEvents({
  eventId = null,
  query = null,
  mine = false,
  limit = 50,
}: { eventId?: string | null; query?: string | null; mine?: boolean; limit?: number } = {}): Promise<EventCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("event_cards", {
    p_event_id: eventId,
    p_query: query,
    p_mine: mine,
    p_limit: limit,
  });
  if (error) console.error("[events] event_cards failed", error);

  return (data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    icon: e.icon,
    description: e.description,
    venueName: e.venue_name,
    venueShort: e.venue_short,
    chapterSlug: e.chapter_slug,
    startsAt: e.starts_at,
    capacity: e.capacity,
    goingCount: e.going_count,
    status: e.status,
    conversationId: e.conversation_id,
    hostId: e.host_id,
    hostName: e.host_name,
    hostAvatar: e.host_avatar,
    going: e.i_am_going,
    circleGoing: e.circle_going,
    attendeeAvatars: e.circle_avatars,
    latitude: e.latitude,
    longitude: e.longitude,
    distanceKm: e.distance_km,
  }));
}

/** "Only people in your Circle are visible here" — RLS does the filtering. */
export async function loadAttendees(eventId: string): Promise<Attendee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_attendees")
    .select("user_id, created_at, person:profiles!event_attendees_user_id_fkey(first_name, avatar_url)")
    .eq("event_id", eventId)
    .order("created_at")
    .limit(200);
  if (error) console.error("[events] attendees failed", error);

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    name: row.person?.first_name ?? "Someone",
    avatarUrl: row.person?.avatar_url ?? null,
  }));
}

export async function loadLiveRooms(): Promise<LiveRoom[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("live_room_cards");
  if (error) console.error("[events] live_room_cards failed", error);

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    communityLabel: r.community_label,
    venueName: r.venue_name,
    hereCount: r.here_count,
    here: r.i_am_here,
  }));
}
