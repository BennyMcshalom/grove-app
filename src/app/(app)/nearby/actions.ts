"use server";

import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export interface NearbyMatch {
  userId: string;
  name: string;
  avatarUrl: string | null;
  aura: "reflective" | "open_to_connect" | "deep_focus" | "in_transition" | "active_nearby";
  chapterSlug: string;
  phase: string;
  distanceKm: number;
}

/** How long a position counts without a fresh heartbeat. */
const SESSION_SECONDS = 120;

/**
 * Proximity on / heartbeat. The database rounds the fix to ~100m and never
 * shows it to anyone; only rounded distances come back out.
 */
export async function shareProximity(latitude: number, longitude: number): Promise<{ error?: string }> {
  const viewer = await requireOnboardedViewer();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return { error: "We couldn't read your location." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("proximity_sessions").upsert({
    user_id: viewer.userId,
    latitude,
    longitude,
    expires_at: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
  });

  if (error) {
    console.error("[nearby] shareProximity failed", error);
    return { error: "We couldn't turn on Proximity. Try again." };
  }
  return {};
}

/** Proximity off. */
export async function stopProximity(): Promise<void> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  await supabase.from("proximity_sessions").delete().eq("user_id", viewer.userId);
}

export async function findNearby(radiusKm = 5): Promise<{ people: NearbyMatch[]; error?: string }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("nearby_people", { p_radius_km: radiusKm });

  if (error) {
    if (error.hint === "proximity_off") return { people: [], error: "Turn on Proximity to see people nearby." };
    console.error("[nearby] nearby_people failed", error);
    return { people: [], error: "We couldn't look around right now." };
  }

  return {
    people: (data ?? []).map((p) => ({
      userId: p.user_id,
      name: p.first_name,
      avatarUrl: p.avatar_url,
      aura: p.aura,
      chapterSlug: p.chapter_slug,
      phase: p.phase,
      distanceKm: Number(p.distance_km),
    })),
  };
}
