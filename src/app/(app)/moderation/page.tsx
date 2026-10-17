import { notFound } from "next/navigation";
import { ModerationView, type GroupDeletionItem, type QueueItem } from "@/components/app/ModerationView";
import { requireOnboardedViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/**
 * Staff-only report queue. No Figma frame; styled like Settings. Staff are
 * added by hand: `insert into public.staff (user_id) values ('<uuid>')`.
 */
export default async function ModerationPage() {
  await requireOnboardedViewer();
  const supabase = await createClient();

  const { data: isStaff } = await supabase.rpc("am_i_staff");
  if (isStaff !== true) notFound();

  const [{ data, error }, { data: deletions, error: deletionsError }] = await Promise.all([
    supabase.rpc("moderation_queue", { p_limit: 100 }),
    supabase.rpc("group_deletion_queue"),
  ]);
  if (error) console.error("[moderation] queue failed", error);
  if (deletionsError) console.error("[moderation] group deletions failed", deletionsError);

  const items: QueueItem[] = (data ?? []).map((row) => ({
    targetType: row.target_type,
    targetId: row.target_id,
    reportCount: row.report_count,
    reasons: row.reasons,
    details: row.details,
    firstReportedAt: row.first_reported_at,
    preview: row.preview,
    authorId: row.target_author_id,
    authorName: row.target_author_name,
    gone: row.target_gone,
  }));

  const groupDeletions: GroupDeletionItem[] = (deletions ?? []).map((row) => ({
    requestId: row.request_id,
    groupTitle: row.group_title,
    groupSlug: row.group_slug,
    memberCount: row.member_count,
    requestedBy: row.requested_by_name,
    reason: row.reason,
    createdAt: row.created_at,
  }));

  return <ModerationView items={items} groupDeletions={groupDeletions} />;
}
