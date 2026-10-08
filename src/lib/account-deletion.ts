import "server-only";
import { billingEnabled, deleteSubscriber } from "@/lib/revenuecat";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deletes an account for good. Deleting the auth user cascades through every
 * table; uploaded files aren't rows, so their folders are emptied first, and
 * the RevenueCat customer goes last.
 */
export async function purgeAccount(userId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: subscription } = await admin.from("subscriptions").select("billing_store").eq("user_id", userId).maybeSingle();

  for (const bucket of ["avatars", "media"] as const) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (files?.length) {
      await admin.storage.from(bucket).remove(files.map((file) => `${userId}/${file.name}`));
    }
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account-deletion] deleteUser failed", userId, error);
    return { error: error.message };
  }

  if (subscription?.billing_store && billingEnabled()) {
    try {
      await deleteSubscriber(userId);
    } catch (e) {
      console.warn("[account-deletion] removing the RevenueCat customer failed", e);
    }
  }
  return {};
}

/** Every account whose seven days are up. For the account-deletions cron. */
export async function purgeDueAccounts(): Promise<{ deleted: number; failed: number }> {
  const admin = createAdminClient();
  const { data: due, error } = await admin
    .from("account_deletions")
    .select("user_id")
    .lte("delete_after", new Date().toISOString())
    .limit(50);
  if (error) throw error;

  let deleted = 0;
  let failed = 0;
  for (const { user_id } of due ?? []) {
    const result = await purgeAccount(user_id);
    if (result.error) failed++;
    else deleted++;
  }
  return { deleted, failed };
}
