"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { newPasswordSchema } from "@/lib/auth/schemas";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { getChapter } from "@/lib/chapters";
import { AURAS, LOG_VISIBILITY, type Aura, type LogVisibility } from "@/lib/profile";
import { geocode } from "@/lib/geocode";
import { siteUrl } from "@/lib/site-url";
import { billingEnabled, stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseUrl } from "@/lib/supabase/env";
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
  phases: z.array(z.object({ userChapterId: z.uuid(), slug: z.string(), phase: z.string() })).max(4),
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

  const { firstName, locationLabel, coordinates, aura, avatarUrl, prompts, phases } = parsed.data;
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
  ]);

  const failed = results.find((result) => result.error);
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

/** Subscription → "Start trial". */
export async function startTrial(): Promise<ActionResult> {
  await requireOnboardedViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_trial");

  if (error) {
    return {
      error:
        error.hint === "trial_used"
          ? "Your free trial has already been used."
          : "We couldn't start your trial. Try again.",
    };
  }

  refresh();
  return {};
}

/**
 * Subscription → "Subscribe". Sends the viewer to Stripe Checkout. Someone
 * still inside their free trial keeps the days they have left before the first
 * charge.
 */
export async function startCheckout(): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!billingEnabled() || !priceId) return { error: "Subscriptions aren't open yet." };

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, stripe_customer_id")
    .eq("user_id", viewer.userId)
    .single();

  if (subscription?.status === "active" || subscription?.status === "past_due") {
    return { error: "You already have a plan. Manage it from Billing." };
  }

  const origin = await siteUrl();
  // Stripe needs a trial to run at least two more days.
  const trialEnd = subscription?.trial_ends_at ? Date.parse(subscription.trial_ends_at) : 0;
  const keepTrial = subscription?.status === "trialing" && trialEnd - Date.now() > 2 * 86_400_000;

  let url: string | null;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: viewer.userId,
      ...(subscription?.stripe_customer_id
        ? { customer: subscription.stripe_customer_id }
        : { customer_email: viewer.email ?? undefined }),
      metadata: { user_id: viewer.userId },
      subscription_data: {
        metadata: { user_id: viewer.userId },
        ...(keepTrial && { trial_end: Math.floor(trialEnd / 1000) }),
      },
      allow_promotion_codes: true,
      success_url: `${origin}/settings?billing=success`,
      cancel_url: `${origin}/settings`,
    });
    url = session.url;
  } catch (error) {
    console.error("[billing] checkout failed", error);
    return { error: "We couldn't open checkout. Try again." };
  }

  if (!url) return { error: "We couldn't open checkout. Try again." };
  redirect(url);
}

/** Subscription → "Manage billing": Stripe's portal for cards, invoices and cancelling. */
export async function openBillingPortal(): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  if (!billingEnabled()) return { error: "Billing isn't set up yet." };

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", viewer.userId)
    .single();
  if (!subscription?.stripe_customer_id) return { error: "You don't have a plan to manage yet." };

  let url: string;
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${await siteUrl()}/settings`,
    });
    url = session.url;
  } catch (error) {
    console.error("[billing] portal failed", error);
    return { error: "We couldn't open billing. Try again." };
  }

  redirect(url);
}

/** Account → "Change password". Also sets a first password for Google users. */
export async function changePassword(password: string): Promise<ActionResult> {
  await requireOnboardedViewer();
  const parsed = newPasswordSchema.safeParse(password);
  if (!parsed.success) return { fieldErrors: { password: parsed.error.issues[0].message } };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });

  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: "That's already your password." } };
    }
    if (error.code === "weak_password") return { fieldErrors: { password: error.message } };
    if (error.code === "reauthentication_needed") {
      return { error: "For your security, sign out and back in, then change it again." };
    }
    return { error: "We couldn't change your password. Try again." };
  }

  return {};
}

/**
 * Danger zone. Deleting the auth user cascades through every table; uploaded
 * files aren't rows, so the viewer's folders are emptied first.
 */
export async function deleteAccount(confirmation: string): Promise<ActionResult> {
  const viewer = await requireOnboardedViewer();
  if (confirmation !== "DELETE") return { error: "Type DELETE to confirm." };

  const admin = createAdminClient();

  // Stop billing before the account (and its subscription row) disappears.
  const { data: subscription } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", viewer.userId)
    .single();
  if (
    subscription?.stripe_subscription_id &&
    ["trialing", "active", "past_due"].includes(subscription.status) &&
    billingEnabled()
  ) {
    try {
      await stripe().subscriptions.cancel(subscription.stripe_subscription_id);
    } catch (error) {
      console.error("[settings] cancelling the Stripe subscription failed", error);
      return { error: "We couldn't cancel your subscription, so your account wasn't deleted. Try again." };
    }
  }

  for (const bucket of ["avatars", "media"] as const) {
    const { data: files } = await admin.storage.from(bucket).list(viewer.userId, { limit: 1000 });
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map((file) => `${viewer.userId}/${file.name}`));
    }
  }

  const { error } = await admin.auth.admin.deleteUser(viewer.userId);
  if (error) {
    console.error("[settings] deleteAccount failed", error);
    return { error: "We couldn't delete your account. Try again, or contact us." };
  }

  // The session belongs to a user that no longer exists; clear its cookies.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
