"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { newPasswordSchema } from "@/lib/auth/schemas";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { isBannerKey } from "@/lib/banners";
import { getChapter } from "@/lib/chapters";
import { AURAS, LOG_VISIBILITY, type Aura, type LogVisibility } from "@/lib/profile";
import { sendEmail } from "@/lib/email/send";
import { accountDeletionEmail, dataExportEmail, trialStartedEmail } from "@/lib/email/templates";
import {
  FIELD_AUDIENCES,
  PROFILE_FIELDS,
  type FieldAudience,
  type ProfileField,
} from "@/lib/profile-audience";
import { geocode } from "@/lib/geocode";
import { siteUrl } from "@/lib/site-url";
import { billingEnabled, billingState, fetchSubscriber, syncBilling } from "@/lib/revenuecat";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { error?: string; fieldErrors?: Record<string, string> };

const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());

const ProfileSchema = z.object({
  firstName: z.string().trim().min(1, "Tell us what to call you").max(50, "Keep it under 50 characters"),
  locationLabel: z.string().max(120, "Keep it to a city and country"),
  /** From "detect location"; otherwise the label is looked up when it changes. */
  coordinates: z
    .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
    .nullish(),
  aura: z.enum(AURAS.map((a) => a.value) as [Aura, ...Aura[]]),
  avatarUrl: z.string().nullable(),
  prompts: z.object({
    honestTension: z.string().max(1000),
    sittingWith: z.string().max(1000),
    openTo: z.string().max(1000),
  }),
  phases: z.array(z.object({ userChapterId: z.uuid(), slug: z.string(), phase: z.string() })).max(8),
  /** The space that leads under your name. */
  primaryChapterId: z.uuid().nullish(),
  /** Optional profile fields with their own audience (profile_details). Left out, not touched. */
  bio: z.string().max(300, "Keep your bio under 300 characters").optional(),
  birthday: z
    .string()
    .refine((v) => v === "" || (/^\d{4}-\d{2}-\d{2}$/.test(v) && v >= "1900-01-01" && Date.parse(v) <= Date.now()), {
      message: "Pick a real date in the past.",
    })
    .optional(),
  /** Optional; blank clears it. Left out, it is not touched. */
  username: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === "" || (/^[a-z0-9][a-z0-9_.]{1,28}[a-z0-9]$/.test(v) && !/[._]{2}/.test(v)), {
      message: "3–30 letters, numbers, dots or underscores.",
    })
    .optional(),
});

export type ProfileInput = z.input<typeof ProfileSchema>;

/** Where an avatar the viewer uploaded to the public `avatars` bucket lives. */
function avatarFolderUrl(userId: string) {
  return `${supabaseUrl()}/storage/v1/object/public/avatars/${userId}/`;
}

/** Edit Profile → "Save Changes". */
export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { fieldErrors: { [String(issue.path[0])]: issue.message } };
  }

  const { firstName, locationLabel, coordinates, aura, avatarUrl, prompts, phases, primaryChapterId, username, bio, birthday } =
    parsed.data;
  const folder = avatarFolderUrl(viewer.userId);
  const previousAvatar = viewer.profile.avatar_url;

  // Only our own upload folder, or keeping the photo they already have (which
  // may be their Google picture).
  if (avatarUrl && avatarUrl !== previousAvatar && !avatarUrl.startsWith(folder)) {
    return { error: "That photo didn't upload properly. Try choosing it again." };
  }

  for (const { slug, phase } of phases) {
    if (!getChapter(slug)?.options.includes(phase)) {
      return { error: "One of your spaces has an answer that no longer exists. Pick it again." };
    }
  }

  const supabase = await createClient();
  const results = await Promise.all([
    supabase
      .from("profiles")
      .update({
        first_name: firstName,
        location_label: blankToNull(locationLabel),
        aura,
        avatar_url: avatarUrl,
        ...(username !== undefined && { username: username || null }),
      })
      .eq("id", viewer.userId),
    supabase.from("profile_prompts").upsert({
      user_id: viewer.userId,
      honest_tension: blankToNull(prompts.honestTension),
      sitting_with: blankToNull(prompts.sittingWith),
      open_to: blankToNull(prompts.openTo),
    }),
    ...phases.map(({ userChapterId, phase }) =>
      supabase
        .from("user_chapters")
        .update({ phase })
        .eq("id", userChapterId)
        .eq("user_id", viewer.userId)
        .eq("status", "open"),
    ),
    ...(bio !== undefined || birthday !== undefined
      ? [
          supabase.from("profile_details").upsert({
            user_id: viewer.userId,
            ...(bio !== undefined && { bio: blankToNull(bio) }),
            ...(birthday !== undefined && { birthday: birthday || null }),
            updated_at: new Date().toISOString(),
          }),
        ]
      : []),
  ]);

  const primary =
    primaryChapterId && phases.some((p) => p.userChapterId === primaryChapterId)
      ? await supabase.rpc("set_primary_chapter", { p_user_chapter_id: primaryChapterId })
      : null;

  // Someone took the username between the check and the save.
  if (results[0].error?.code === "23505") return { fieldErrors: { username: "That username is taken." } };
  if (results[0].error?.code === "23514") return { fieldErrors: { username: "That username isn't allowed." } };

  const failed = [...results, primary].find((result) => result?.error);
  if (failed?.error) {
    console.error("[settings] updateProfile failed", failed.error);
    return { error: "We couldn't save your changes. Try again." };
  }

  await updateRegion(blankToNull(locationLabel), viewer.profile.location_label, coordinates ?? null);

  // Tidy up the photo this one replaced, if it was one of our uploads.
  if (previousAvatar && previousAvatar !== avatarUrl && previousAvatar.startsWith(folder)) {
    const path = previousAvatar.slice(`${supabaseUrl()}/storage/v1/object/public/avatars/`.length);
    const { error } = await supabase.storage.from("avatars").remove([path]);
    if (error) console.warn("[settings] couldn't remove old avatar", error);
  }

  refresh();
  return {};
}

/**
 * Keeps the private ~11km region behind "near you" in step with the location
 * label. A failed lookup clears it rather than leave the old city behind.
 */
async function updateRegion(
  label: string | null,
  previousLabel: string | null,
  coordinates: { latitude: number; longitude: number } | null,
) {
  const supabase = await createClient();
  let region: { latitude: number; longitude: number } | null = null;

  if (label && coordinates) {
    region = coordinates;
  } else if (label) {
    const { data: hasRegion } = await supabase.rpc("has_region");
    if (label === previousLabel && hasRegion) return;
    region = await geocode(label);
  }

  const { error } = await supabase.rpc("set_my_region", {
    p_latitude: region?.latitude ?? null,
    p_longitude: region?.longitude ?? null,
  });
  if (error) console.warn("[settings] couldn't save the region", error);
}

const PreferencesSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  logVisibility: z.enum(LOG_VISIBILITY.map((v) => v.value) as [LogVisibility, ...LogVisibility[]]).optional(),
  chapterPrompt: z.boolean().optional(),
  waveReceived: z.boolean().optional(),
  emailUpdates: z.boolean().optional(),
});

/** Settings toggles: appearance, log visibility and notifications. */
export async function updatePreferences(
  input: z.input<typeof PreferencesSchema>,
): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  const parsed = PreferencesSchema.safeParse(input);
  if (!parsed.success) return { error: "That setting isn't one we recognise." };

  const { theme, logVisibility, chapterPrompt, waveReceived, emailUpdates } = parsed.data;
  const supabase = await createClient();
  const writes = [];

  if (theme !== undefined || logVisibility !== undefined) {
    writes.push(
      supabase
        .from("profiles")
        .update({
          ...(theme !== undefined && { theme }),
          ...(logVisibility !== undefined && { log_visibility: logVisibility }),
        })
        .eq("id", viewer.userId),
    );
  }
  if (chapterPrompt !== undefined || waveReceived !== undefined || emailUpdates !== undefined) {
    writes.push(
      supabase
        .from("notification_preferences")
        .update({
          ...(chapterPrompt !== undefined && { chapter_prompt: chapterPrompt }),
          ...(waveReceived !== undefined && { wave_received: waveReceived }),
          ...(emailUpdates !== undefined && { email_updates: emailUpdates }),
        })
        .eq("user_id", viewer.userId),
    );
  }

  const failed = (await Promise.all(writes)).find((result) => result.error);
  if (failed?.error) {
    console.error("[settings] updatePreferences failed", failed.error);
    return { error: "We couldn't save that setting. Try again." };
  }

  refresh();
  return {};
}

const PrivacySchema = z.object({
  discoverable: z.boolean().optional(),
  activityMatching: z.boolean().optional(),
});

/**
 * Privacy & AI toggles (PRD §12). Both are honoured in the database:
 * "Show me in suggestions" by match_candidates, "Learn from my activity" by
 * the interaction log. Never paywalled.
 */
export async function updatePrivacy(input: z.input<typeof PrivacySchema>): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  const parsed = PrivacySchema.safeParse(input);
  if (!parsed.success) return { error: "That setting isn't one we recognise." };

  const { discoverable, activityMatching } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("privacy_settings").upsert({
    user_id: viewer.userId,
    ...(discoverable !== undefined && { discoverable }),
    ...(activityMatching !== undefined && { activity_matching: activityMatching }),
  });

  if (error) {
    console.error("[settings] updatePrivacy failed", error);
    return { error: "We couldn't save that setting. Try again." };
  }
  refresh();
  return {};
}

const AudienceSchema = z.object({
  field: z.enum(PROFILE_FIELDS.map((f) => f.key) as [ProfileField, ...ProfileField[]]),
  audience: z.enum(FIELD_AUDIENCES.map((a) => a.value) as [FieldAudience, ...FieldAudience[]]),
});

/** "Save audience" (Figma 1587:23049…): who can see one profile field. */
export async function updateProfileAudience(field: ProfileField, audience: FieldAudience): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  const parsed = AudienceSchema.safeParse({ field, audience });
  if (!parsed.success) return { error: "That setting isn't one we recognise." };

  const supabase = await createClient();
  const column = `${parsed.data.field}_audience` as const;
  const patch: Partial<Record<typeof column, FieldAudience>> = { [column]: parsed.data.audience };
  const { error } = await supabase.from("profile_details").upsert({
    user_id: viewer.userId,
    ...patch,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[settings] updateProfileAudience failed", error);
    return { error: "We couldn't save that. Try again." };
  }
  refresh();
  return {};
}

/**
 * "Request export" (Figma 1593:23216): emails a link to /api/export, which
 * builds the file when they open it while signed in. Without email set up
 * (local dev) the caller downloads it straight away instead.
 */
export async function requestDataExport(): Promise<ActionResult & { emailed?: boolean }> {
  const viewer = await requireOnboardedViewer();
  if (!viewer.email) return { emailed: false };
  try {
    const { sent } = await sendEmail(
      dataExportEmail({ to: viewer.email, firstName: viewer.profile.first_name, siteUrl: await siteUrl() }),
    );
    return { emailed: sent };
  } catch (error) {
    console.error("[settings] requestDataExport failed", error);
    return { error: "We couldn't request your export. Try again." };
  }
}

/**
 * The profile banner: one of Grouv's own colours or drawn wallpapers — no
 * uploads. Null goes back to the default colour.
 */
export async function setProfileBanner(banner: string | null): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  if (banner !== null && !isBannerKey(banner)) return { error: "That banner isn't one of ours." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ banner }).eq("id", viewer.userId);
  if (error) {
    console.error("[settings] setProfileBanner failed", error);
    return { error: "We couldn't change your banner. Try again." };
  }
  refresh();
  return {};
}

// Mirrors the profiles.username check. A "use server" file exports only
// actions, so the form keeps its own copy for instant feedback.
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_.]{1,28}[a-z0-9]$/;

/** Edit Profile checks a username as it's typed. */
export async function checkUsername(username: string): Promise<{ available: boolean; error?: string }> {
  await requireOnboardedViewer();
  const value = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(value) || /[._]{2}/.test(value)) {
    return { available: false, error: "3–30 letters, numbers, dots or underscores." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("username_available", { p_username: value });
  if (error) return { available: false, error: "We couldn't check that name. Try again." };
  return data ? { available: true } : { available: false, error: "That username is taken." };
}

/** Subscription → "Start trial". Confirms it by email. */
export async function startTrial(): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  const supabase = await createClient();
  const { data: trial, error } = await supabase.rpc("start_trial");

  if (error) {
    return {
      error:
        error.hint === "trial_used"
          ? "Your free trial has already been used."
          : "We couldn't start your trial. Try again.",
    };
  }

  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.email) {
    const email = trialStartedEmail({
      to: auth.user.email,
      firstName: viewer.profile.first_name,
      trialEndsAt: trial?.trial_ends_at ?? null,
      siteUrl: await siteUrl(),
    });
    // After the response, so a slow mail provider doesn't hold up the button.
    after(async () => {
      try {
        await sendEmail(email);
      } catch (e) {
        console.error("[billing] trial email failed", e);
      }
    });
  }

  refresh();
  return {};
}

/**
 * After RevenueCat's checkout closes: pull the viewer's plan straight away
 * rather than wait for the webhook, so Settings shows it on return.
 */
export async function refreshBilling(): Promise<
  ActionResult & { status?: string | null; currentPeriodEnd?: string | null; trialEnd?: string | null }
> {
  const viewer = await requireOnboardedViewer();
  if (!billingEnabled()) return { error: "Subscriptions aren't open yet." };

  try {
    const state = await syncBilling(viewer.userId);
    refresh();
    return { status: state.status, currentPeriodEnd: state.currentPeriodEnd, trialEnd: state.trialEnd };
  } catch (error) {
    console.error("[billing] refresh failed", error);
    return { error: "Your payment went through, but your plan is taking a moment to show. Check back shortly." };
  }
}

/**
 * Subscription → "Manage billing". RevenueCat's link for wherever the plan was
 * bought: its own portal for web purchases, or the App Store / Google Play.
 */
export async function billingManagementUrl(): Promise<ActionResult & { url?: string }> {
  const viewer = await requireOnboardedViewer();
  if (!billingEnabled()) return { error: "Billing isn't set up yet." };

  try {
    const { managementUrl } = billingState(await fetchSubscriber(viewer.userId));
    if (!managementUrl) return { error: "You don't have a plan to manage yet." };
    return { url: managementUrl };
  } catch (error) {
    console.error("[billing] management URL failed", error);
    return { error: "We couldn't open billing. Try again." };
  }
}

/**
 * Account → "Change password". Someone holding an unlocked device mustn't be
 * able to take the account over, so a change needs either the current
 * password or a code emailed to the account (the "forgot it" path, and the
 * only path for Google accounts that never set a password).
 */
export async function passwordStatus(): Promise<{ hasPassword: boolean; email: string | null }> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return {
    hasPassword: Boolean(data.user?.identities?.some((identity) => identity.provider === "email")),
    email: data.user?.email ?? null,
  };
}

/** Change it by proving the current password. */
export async function changePassword(current: string, next: string): Promise<ActionResult> {
  await requireOnboardedViewer();
  const parsed = newPasswordSchema.safeParse(next);
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };
  if (!current) return { fieldErrors: { current: "Enter your current password." } };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return { error: "We couldn't find your account's email." };

  // Checked on a throwaway client, so the viewer's own session is untouched;
  // the extra session it makes is signed out straight away.
  const checker = createSupabaseClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await checker.auth.signInWithPassword({ email, password: current });
  if (wrong) {
    if (wrong.code === "over_request_rate_limit") return { error: "Too many tries. Wait a minute and try again." };
    return { fieldErrors: { current: "That isn't your current password." } };
  }
  await checker.auth.signOut({ scope: "local" });

  return savePassword(supabase, { password: parsed.data });
}

/** "Forgot your current password?" — emails a 6-digit code to the account. */
export async function sendPasswordCode(): Promise<ActionResult> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.auth.reauthenticate();
  if (error) {
    console.error("[settings] reauthenticate failed", error);
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "Wait a minute before asking for another code."
          : "We couldn't send a code. Try again shortly.",
    };
  }
  return {};
}

/** Change it with the emailed code instead of the current password. */
export async function changePasswordWithCode(code: string, next: string): Promise<ActionResult> {
  await requireOnboardedViewer();
  const parsed = newPasswordSchema.safeParse(next);
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };
  const nonce = code.replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(nonce)) return { fieldErrors: { code: "Enter the code from the email." } };

  const supabase = await createClient();
  return savePassword(supabase, { password: parsed.data, nonce });
}

async function savePassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  attributes: { password: string; nonce?: string },
): Promise<ActionResult> {
  const { error } = await supabase.auth.updateUser(attributes);
  if (!error) return {};

  if (error.code === "same_password") return { fieldErrors: { password: "That's already your password." } };
  if (error.code === "weak_password") return { fieldErrors: { password: error.message } };
  if (error.code === "reauthentication_not_valid" || error.code === "otp_expired") {
    return { fieldErrors: { code: "That code is wrong or has expired. Ask for a new one." } };
  }
  console.error("[settings] updateUser(password) failed", error);
  return { error: "We couldn't change your password. Try again." };
}

/**
 * Danger zone → "Account deletion requested" (Figma 1593:23224): the account
 * is scheduled for deletion in seven days and they're signed out everywhere.
 * Signing back in before then calls it off (cancel_account_deletion); after
 * that, the account-deletions cron deletes everything (purgeAccount).
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  if (confirmation !== "DELETE") return { error: "Type DELETE to confirm." };

  const supabase = await createClient();

  // A plan that will renew keeps charging after the account is gone, and App
  // Store / Google Play plans can only be cancelled by the person themselves,
  // so they cancel first.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("billing_store, status, cancel_at_period_end")
    .eq("user_id", viewer.userId)
    .single();
  if (
    subscription?.billing_store &&
    ["trialing", "active", "past_due"].includes(subscription.status) &&
    !subscription.cancel_at_period_end
  ) {
    return { error: "Cancel your plan under Subscription → Manage billing first, then delete your account." };
  }

  const { data: deleteAfter, error } = await supabase.rpc("request_account_deletion");
  if (error || !deleteAfter) {
    console.error("[settings] deleteAccount failed", error);
    return { error: "We couldn't schedule your account deletion. Try again, or contact us." };
  }

  if (viewer.email) {
    const email = accountDeletionEmail({
      to: viewer.email,
      firstName: viewer.profile.first_name,
      deleteAfter,
      siteUrl: await siteUrl(),
    });
    after(async () => {
      try {
        await sendEmail(email);
      } catch (e) {
        console.warn("[settings] deletion email failed", e);
      }
    });
  }

  // Signed out everywhere, then the confirmation (outside the app).
  await supabase.auth.signOut({ scope: "global" });
  redirect(`/goodbye?on=${encodeURIComponent(deleteAfter)}`);
}
