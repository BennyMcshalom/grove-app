import "server-only";
import { billingEnabled, deleteSubscriber } from "@/lib/revenuecat";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Deletes an account for good. Deleting the auth user cascades through every
 * table; uploaded files aren't rows, so their folders are emptied first (plus
 * chat attachments and anonymous files, which live outside them), and the
 * RevenueCat customer goes last.
 */
export async function purgeAccount(userId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: subscription } = await admin.from("subscriptions").select("billing_store").eq("user_id", userId).maybeSingle();

  for (const bucket of ["avatars", "media"] as const) {
    // Pages of 1000 until the folder is empty.
    for (let page = 0; page < 20; page++) {
      const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
      if (!files?.length) break;
      const { error } = await admin.storage.from(bucket).remove(files.map((file) => `${userId}/${file.name}`));
      if (error) {
        console.warn("[account-deletion] couldn't empty a folder", bucket, error.message);
        break;
      }
    }
  }

  // Must run before deleteUser: the cascade removes the rows that say whose these were.
  const { data: leftovers, error: leftoversError } = await admin.rpc("files_left_by", { p_user: userId });
  if (leftoversError) {
    console.error("[account-deletion] listing chat and anonymous files failed", userId, leftoversError);
    return { error: leftoversError.message };
  }
  for (const bucket of ["chat", "media"] as const) {
    const paths = (leftovers ?? []).filter((f) => f.bucket === bucket).map((f) => f.path);
    for (let i = 0; i < paths.length; i += 500) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 500));
      if (error) console.warn("[account-deletion] couldn't remove files", bucket, error.message);
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
