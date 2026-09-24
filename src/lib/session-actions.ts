"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/**
 * Once per session, from the browser. The time zone drives the notification
 * quiet hours (no email before 08:00 or after 21:00 local) and when the
 * morning cards arrive. A position, when sent, refreshes the private
 * city-level region behind "near you" — but only for people who already
 * chose to share a location in Edit Profile.
 */
export async function syncSession(input: {
  timezone: string;
  position?: { latitude: number; longitude: number } | null;
}): Promise<void> {
  await requireOnboardedViewer();
  const supabase = await createClient();

  if (typeof input.timezone === "string" && input.timezone.length <= 64) {
    const { error } = await supabase.rpc("set_my_timezone", { p_timezone: input.timezone });
    if (error) console.warn("[session] couldn't save the time zone", error.message);
  }

  const position = input.position;
  if (
    position &&
    Number.isFinite(position.latitude) &&
    Number.isFinite(position.longitude) &&
    Math.abs(position.latitude) <= 90 &&
    Math.abs(position.longitude) <= 180
  ) {
    const { data: hasRegion } = await supabase.rpc("has_region");
    if (!hasRegion) return;
    // Rounded to ~11 km in the database; the geohash kept is city-level.
    const { error } = await supabase.rpc("set_my_region", {
      p_latitude: position.latitude,
      p_longitude: position.longitude,
    });
    if (error) console.warn("[session] couldn't refresh the region", error.message);
  }
}
