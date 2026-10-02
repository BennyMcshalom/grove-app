import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { ShellViewer } from "@/components/app/ViewerProvider";
import { FREE_ACTIVE_SPACES } from "@/lib/chapters";
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
    .select("id, first_name, avatar_url, aura, location_label, onboarded_at, theme, banner")
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

  const loadChapters = () =>
    supabase
      .from("user_chapters")
      .select("id, chapter_slug, phase, opened_at, is_primary, paused_at")
      .eq("user_id", userId)
      .eq("status", "open")
      // Primary first, then the order they were opened in — never by
      // whatever order the rows come back.
      .order("is_primary", { ascending: false })
      .order("opened_at");
  const loadSubscription = () =>
    supabase
      .from("subscriptions")
      .select(
        "status, trial_started_at, trial_ends_at, current_period_end, bonus_until, billing_store, spaces_review_due, spaces_locked_at",
      )
      .eq("user_id", userId)
      .single();

  const [firstChapters, firstSubscription, unread, focus, messages] = await Promise.all([
    loadChapters(),
    loadSubscription(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("focus_sessions")
      // The latest session still owed its "Welcome back": running, or ended
      // and not yet seen.
      .select("ends_at, ended_early_at")
      .eq("user_id", userId)
      .is("digest_seen_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.rpc("my_unread_messages"),
  ]);

  const focusRunning =
    Boolean(focus.data) && !focus.data!.ended_early_at && Date.parse(focus.data!.ends_at) > Date.now();

  // A trial or plan that ended on a date changes no row, so the hourly sweep
  // may not have paused Spaces yet (or restored them after subscribing). Put
  // them in step now, so what the shell shows matches what the database allows.
  let chapters = firstChapters;
  let subscription = firstSubscription;
  const pass = hasPass(subscription.data);
  const active = (chapters.data ?? []).filter((c) => !c.paused_at).length;
  const paused = (chapters.data ?? []).length - active;
  if ((!pass && active > FREE_ACTIVE_SPACES) || (pass && paused > 0)) {
    const { error } = await supabase.rpc("sync_my_spaces");
    if (error) console.error("[pass] sync_my_spaces failed", error);
    else [chapters, subscription] = await Promise.all([loadChapters(), loadSubscription()]);
  }

  return {
    id: userId,
    firstName: viewer.profile.first_name,
    email: viewer.email ?? null,
    avatarUrl: viewer.profile.avatar_url,
    aura: viewer.profile.aura,
    banner: viewer.profile.banner,
    locationLabel: viewer.profile.location_label,
    chapters: (chapters.data ?? []).map((c) => ({
      id: c.id,
      slug: c.chapter_slug,
      phase: c.phase,
      openedAt: c.opened_at,
      isPrimary: c.is_primary,
      pausedAt: c.paused_at,
    })),
    subscriptionStatus: subscription.data?.status ?? "none",
    trialEndsAt: subscription.data?.trial_ends_at ?? null,
    hasPass: hasPass(subscription.data),
    trialAvailable: subscription.data?.status === "none" && !subscription.data.trial_started_at,
    spacesReviewDue: spacesChoiceDue(subscription.data, chapters.data?.length ?? 0),
    spacesLocked: Boolean(subscription.data?.spaces_locked_at),
    unreadNotifications: unread.count ?? 0,
    unreadMessages: messages.data?.[0]?.unread ?? 0,
    focusEndsAt: focusRunning ? focus.data!.ends_at : null,
    focusReturnPending: Boolean(focus.data) && !focusRunning,
    theme: viewer.profile.theme,
    callsEnabled: callsEnabled(),
  };
});

/** Where a freshly signed-in user should land. */
export function landingPath(profile: { onboarded_at: string | null } | null) {
  return profile?.onboarded_at ? "/home" : "/onboarding/chapters";
}

/**
 * Mirrors private.has_pass(): the Season Pass is in effect right now. A bonus
 * month (referral reward) counts whatever the plan status says.
 */
/**
 * "Choose which 4 Spaces stay active" is owed: from three days before Grouv's
 * own trial ends (no store plan, no bonus month) while they hold more than
 * four open Spaces, or after a downgrade paused Spaces — until they lock in.
 */
function spacesChoiceDue(
  s:
    | {
        status: string;
        trial_ends_at: string | null;
        current_period_end: string | null;
        bonus_until: string | null;
        billing_store: string | null;
        spaces_review_due: boolean;
        spaces_locked_at: string | null;
      }
    | null
    | undefined,
  openSpaces: number,
  now = Date.now(),
) {
  if (!s || s.spaces_locked_at) return false;
  if (!hasPass(s, now)) return s.spaces_review_due;
  const trialOnly =
    s.status === "trialing" && !s.billing_store && !(s.bonus_until && Date.parse(s.bonus_until) > now);
  const endsSoon = Boolean(s.trial_ends_at) && Date.parse(s.trial_ends_at!) - now <= SPACE_CHOICE_LEAD_MS;
  return trialOnly && endsSoon && openSpaces > FREE_ACTIVE_SPACES;
}

/** How long before the trial ends the chooser starts asking. */
const SPACE_CHOICE_LEAD_MS = 3 * 86_400_000;

export function hasPass(
  s:
    | {
        status: string;
        trial_ends_at: string | null;
        current_period_end: string | null;
        bonus_until?: string | null;
      }
    | null
    | undefined,
  now = Date.now(),
) {
  if (!s) return false;
  const until = (at: string | null | undefined) => (at ? Date.parse(at) > now : false);
  if (until(s.bonus_until)) return true;
  if (s.status === "trialing") return s.trial_ends_at || s.current_period_end ? until(s.trial_ends_at ?? s.current_period_end) : false;
  if (s.status === "active" || s.status === "past_due") return true;
  if (s.status === "canceled") return until(s.current_period_end);
  return false;
}
