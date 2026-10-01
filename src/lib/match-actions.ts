"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { sendNotificationEmailsSoon } from "@/lib/email/notifications";
import {
  LIFE_STAGES,
  LOOKING_FOR,
  joinLabels,
  lookingForLabel,
  matchReason,
  type Introduction,
  type LifeStage,
  type LookingFor,
  type Match,
  type MatchPreferences,
} from "@/lib/matches";
import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

/** "We found some potential connections" — the best few, with why. */
export async function loadMatches(limit = 4): Promise<{ matches: Match[]; error?: string }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("potential_matches", { p_limit: limit });
  if (error) {
    console.error("[matches] potential_matches failed", error);
    return { matches: [], error: "We couldn't look for matches right now. Try again." };
  }
  return {
    matches: (data ?? []).map((row) => {
      const wants = row.looking_for.flatMap((v) => lookingForLabel(v) ?? []);
      return {
        userId: row.user_id,
        name: row.first_name,
        avatarUrl: row.avatar_url,
        chapterSlug: row.chapter_slug,
        phase: row.phase,
        lookingFor: wants.length ? joinLabels(wants) : null,
        why: matchReason(row),
      };
    }),
  };
}

/** "Not relevant" — this profile won't be shown again. */
export async function dismissMatch(userId: string): Promise<Result> {
  await requireOnboardedViewer();
  if (!z.uuid().safeParse(userId).success) return { error: "That profile doesn't exist." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("dismiss_match", { p_other: userId });
  if (error) {
    console.error("[matches] dismiss_match failed", error);
    return { error: "That didn't go through. Try again." };
  }
  return {};
}

export async function loadMatchPreferences(): Promise<MatchPreferences> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase
    .from("match_preferences")
    .select("life_stages, looking_for, distance_km, notify_new_matches")
    .eq("user_id", viewer.userId)
    .maybeSingle();
  return {
    lifeStages: (data?.life_stages ?? []) as LifeStage[],
    lookingFor: (data?.looking_for ?? []) as LookingFor[],
    distanceKm: data?.distance_km ?? null,
    notify: data?.notify_new_matches ?? false,
  };
}

const PreferencesSchema = z.object({
  lifeStages: z.array(z.enum(LIFE_STAGES.map((o) => o.value) as [LifeStage, ...LifeStage[]])).max(5),
  lookingFor: z.array(z.enum(LOOKING_FOR.map((o) => o.value) as [LookingFor, ...LookingFor[]])).max(5),
  distanceKm: z.number().int().min(1).max(500).nullable(),
  notify: z.boolean(),
});

/**
 * "Save preferences". The database refuses changed filters without the
 * Season Pass (hint pass_required); the modal never sends them for Free.
 */
export async function saveMatchPreferences(input: MatchPreferences): Promise<Result & { needsPass?: boolean }> {
  await requireOnboardedViewer();
  const parsed = PreferencesSchema.safeParse(input);
  if (!parsed.success) return { error: "Those preferences didn't look right." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_match_preferences", {
    p_life_stages: parsed.data.lifeStages,
    p_looking_for: parsed.data.lookingFor,
    p_distance_km: parsed.data.distanceKm,
    p_notify: parsed.data.notify,
  });
  if (error) {
    if (error.hint === "pass_required") return { error: "Match filters are part of the Season Pass.", needsPass: true };
    console.error("[matches] save_match_preferences failed", error);
    return { error: "We couldn't save your preferences. Try again." };
  }
  return {};
}

/** "Notify me when someone's around" — turns on new-match notifications only. */
export async function notifyAboutMatches(): Promise<Result> {
  const current = await loadMatchPreferences();
  return saveMatchPreferences({ ...current, notify: true });
}

const IntroSchema = z.object({
  userId: z.uuid(),
  message: z.string().trim().min(1, "Write a short note first.").max(1000, "Keep your note under 1,000 characters."),
  prompt: z.string().trim().max(200).nullable(),
  chapterSlug: z.string().max(40).nullable(),
});

/**
 * "Send introduction" (Figma 980:20547). A connection request carrying the
 * note; chat opens only once they accept. `accepted` when they had already
 * introduced themselves to you, which this answers.
 */
export async function introduceYourself(
  input: z.input<typeof IntroSchema>,
): Promise<Result & { connectionId?: string; accepted?: boolean }> {
  await requireOnboardedViewer();
  const parsed = IntroSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "That note didn't look right." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("introduce_yourself", {
    p_other: parsed.data.userId,
    p_message: parsed.data.message,
    p_prompt: parsed.data.prompt,
    p_chapter_slug: parsed.data.chapterSlug,
  });
  if (error || !data) {
    if (error?.hint === "already_sent") return { error: "Your introduction is already on its way." };
    if (error?.hint === "already_connected") return { error: "You're already connected." };
    if (error?.hint === "declined") return { error: "They're not able to connect right now." };
    if (error?.hint === "blocked") return { error: "You can't connect with this person." };
    if (error?.hint === "rate_limited") return { error: error.message };
    console.error("[matches] introduce_yourself failed", error);
    return { error: "Couldn't send. Your message is saved — try again when you're ready." };
  }
  if (data.status === "accepted") refresh();
  else await sendNotificationEmailsSoon();
  return { connectionId: data.id, accepted: data.status === "accepted" };
}

/** Introductions sent and received, newest first. */
export async function loadIntroductions(): Promise<Introduction[]> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_introductions", { p_limit: 20 });
  if (error) console.error("[matches] my_introductions failed", error);
  return (data ?? []).map((row) => ({
    connectionId: row.connection_id,
    direction: row.direction,
    userId: row.other_id,
    name: row.first_name,
    avatarUrl: row.avatar_url,
    status: row.status,
    message: row.message,
    prompt: row.prompt,
    chapterSlug: row.chapter_slug,
    phase: row.phase,
    seen: row.seen_at !== null,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  }));
}

/** The recipient has seen their introductions ("Waiting to hear back"). */
export async function markIntroductionsSeen(): Promise<void> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_introductions_seen");
  if (error) console.error("[matches] mark_introductions_seen failed", error);
}

/** Recipient → Accept / Decline an introduction. */
export async function respondToIntroduction(connectionId: string, accept: boolean): Promise<Result> {
  await requireOnboardedViewer();
  if (!z.uuid().safeParse(connectionId).success) return { error: "That introduction doesn't exist." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_to_connection", { p_connection_id: connectionId, p_accept: accept });
  if (error) {
    if (error.hint === "rate_limited") return { error: error.message };
    console.error("[matches] respond_to_connection failed", error);
    return { error: "That introduction is no longer waiting on you." };
  }
  refresh();
  return {};
}
