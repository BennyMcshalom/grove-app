import { notFound } from "next/navigation";
import { ModerationView, type QueueItem } from "@/components/app/ModerationView";
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

  const { data, error } = await supabase.rpc("moderation_queue", { p_limit: 100 });
  if (error) console.error("[moderation] queue failed", error);

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

  return <ModerationView items={items} />;
}
