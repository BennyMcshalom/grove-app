"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import type { LiveRoom, RoomPerson } from "@/lib/events";
import { loadLiveRooms } from "@/lib/events-server";
import { PICKER_ICONS } from "@/lib/icons";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

const CreateEventSchema = z.object({
  title: z.string().trim().min(1, "Name your event").max(120, "Keep the name under 120 characters"),
  icon: z.enum(PICKER_ICONS),
  venueName: z.string().trim().min(1, "Say where it is").max(200, "Keep the location under 200 characters"),
  chapterSlug: z.string().min(1, "Choose the space it belongs to"),
  /** Built in the browser from the date and time fields, so it's the host's local time. */
  startsAt: z.iso.datetime({ offset: true }),
  capacity: z.coerce.number().int().min(1, "Capacity needs to be at least 1").max(10000, "Capacity is capped at 10,000"),
  description: z.string().trim().max(2000, "Keep the description under 2,000 characters"),
});

export type CreateEventInput = z.input<typeof CreateEventSchema>;

/** Create an Event → "Create event". The host is going, and the chat opens. */
export async function createEvent(input: CreateEventInput): Promise<Result & { id?: string }> {
  await requireOnboardedViewer();
  const parsed = CreateEventSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the event details." };

  const { title, icon, venueName, chapterSlug, startsAt, capacity, description } = parsed.data;
  if (!getChapter(chapterSlug)) return { error: "Choose the space it belongs to." };
  if (Date.parse(startsAt) < Date.now() - 5 * 60 * 1000) return { error: "Pick a date and time in the future." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      title,
      icon,
      venue_name: venueName,
      chapter_slug: chapterSlug,
      starts_at: new Date(startsAt).toISOString(),
      capacity,
      description: description || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[events] createEvent failed", error);
    return { error: "We couldn't create that event. Try again." };
  }

  refresh();
  return { id: data.id };
}

/** "I'll Grouv" / "You're grouv'd". */
export async function setRsvp(eventId: string, going: boolean): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();

  const { error } = going
    ? await supabase.from("event_attendees").insert({ event_id: eventId, user_id: viewer.userId })
    : await supabase.from("event_attendees").delete().eq("event_id", eventId).eq("user_id", viewer.userId);

  if (error && error.code !== "23505") {
    if (error.hint === "event_full") return { error: "This event is full." };
    if (error.hint === "event_closed") return { error: "This event isn't taking RSVPs any more." };
    console.error("[events] setRsvp failed", error);
    return { error: "That didn't go through. Try again." };
  }

  refresh();
  return {};
}

export async function cancelEvent(eventId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .update({ status: "cancelled" })
    .eq("id", eventId)
    .select("id");
  if (error || !data?.length) return { error: "Only the host can cancel this event." };
  refresh();
  return {};
}

/** Meet & Greet → "Turn on here". Joins the room if someone already started it. */
export async function startLiveRoom(title: string): Promise<Result & { roomId?: string }> {
  await requireOnboardedViewer();
  const name = title.trim();
  if (!name) return { error: "Name the place or event." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_live_room", { p_title: name });
  if (error || !data) {
    console.error("[events] startLiveRoom failed", error);
    return { error: "We couldn't turn this on. Try again." };
  }
  refresh();
  return { roomId: data };
}

export async function joinLiveRoom(roomId: string): Promise<Result> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_live_room", { p_room_id: roomId });
  if (error) {
    return { error: error.hint === "room_ended" ? "That room has ended." : "We couldn't join that room." };
  }
  refresh();
  return {};
}

export async function leaveLiveRoom(roomId: string): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  await supabase.from("live_room_presence").delete().eq("room_id", roomId).eq("user_id", viewer.userId);
  refresh();
  return {};
}

/** Keeps the viewer listed while the Events page is open. */
export async function touchLiveRoom(roomId: string): Promise<void> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  await supabase
    .from("live_room_presence")
    .update({ seen_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("user_id", viewer.userId);
}

export async function loadRoomPeople(roomId: string): Promise<RoomPerson[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("live_room_people", { p_room_id: roomId });
  if (error) console.error("[events] live_room_people failed", error);

  return (data ?? []).map((p) => ({
    userId: p.user_id,
    name: p.first_name,
    avatarUrl: p.avatar_url,
    chapterSlug: p.chapter_slug,
    phase: p.phase,
    isMe: p.is_me,
    iWaved: p.i_waved,
    wavedAtMe: p.waved_at_me,
  }));
}

export async function refreshLiveRooms(): Promise<LiveRoom[]> {
  await requireOnboardedViewer();
  return loadLiveRooms();
}

/** "Wave" / "Waved". */
export async function setWave(roomId: string, userId: string, waved: boolean): Promise<Result> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = waved
    ? await supabase.from("waves").insert({ room_id: roomId, to_user: userId })
    : await supabase.from("waves").delete().eq("room_id", roomId).eq("from_user", viewer.userId).eq("to_user", userId);

  if (error && error.code !== "23505") {
    if (error.code === "42501") return { error: "You can only wave at people in the room with you." };
    return { error: "That wave didn't go through." };
  }
  return {};
}
