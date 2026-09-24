import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { ShellViewer } from "@/components/app/ViewerProvider";
import { callsEnabled } from "@/lib/livekit";
import { createClient } from "@/lib/supabase/server";

export type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

/**
 * The signed-in user and their profile, verified against the JWT signature
 * (getClaims), memoised per request. Null when signed out.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, avatar_url, aura, location_label, onboarded_at, theme")
    .eq("id", claims.sub)
    .single();

  if (!profile) return null;
  return { userId: claims.sub, email: claims.email, profile };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  return viewer;
}

/** For app screens: signed in and through onboarding. */
export async function requireOnboardedViewer() {
  const viewer = await requireViewer();
  if (!viewer.profile.onboarded_at) redirect("/onboarding/chapters");
  return viewer;
}

/**
 * Everything the app shell shows about the viewer, loaded in parallel once
 * per request by the (app) layout.
 */
export const getShellViewer = cache(async (): Promise<ShellViewer> => {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const userId = viewer.userId;

  const [chapters, subscription, unread, focus, messages] = await Promise.all([
    supabase
      .from("user_chapters")
      .select("id, chapter_slug, phase, opened_at, is_primary")
      .eq("user_id", userId)
      .eq("status", "open")
      // Primary first, then the order they were opened in — never by
      // whatever order the rows come back.
      .order("is_primary", { ascending: false })
      .order("opened_at"),
    supabase.from("subscriptions").select("status, trial_ends_at").eq("user_id", userId).single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("focus_sessions")
      .select("ends_at")
      .eq("user_id", userId)
      .is("ended_early_at", null)
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("my_unread_messages"),
  ]);

  return {
    id: userId,
    firstName: viewer.profile.first_name,
    avatarUrl: viewer.profile.avatar_url,
    aura: viewer.profile.aura,
    locationLabel: viewer.profile.location_label,
    chapters: (chapters.data ?? []).map((c) => ({
      id: c.id,
      slug: c.chapter_slug,
      phase: c.phase,
      openedAt: c.opened_at,
      isPrimary: c.is_primary,
    })),
    subscriptionStatus: subscription.data?.status ?? "none",
    trialEndsAt: subscription.data?.trial_ends_at ?? null,
    unreadNotifications: unread.count ?? 0,
    unreadMessages: messages.data?.[0]?.unread ?? 0,
    focusEndsAt: focus.data?.ends_at ?? null,
    theme: viewer.profile.theme,
    callsEnabled: callsEnabled(),
  };
});

/** Where a freshly signed-in user should land. */
export function landingPath(profile: { onboarded_at: string | null } | null) {
  return profile?.onboarded_at ? "/home" : "/onboarding/chapters";
}
