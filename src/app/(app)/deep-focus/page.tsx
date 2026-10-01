import { DeepFocusView, type FocusDigest } from "@/components/app/DeepFocusView";
import { getShellViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

/**
 * Deep Focus — Figma frame 296:11390 (choose), cross frames 1207:22853
 * (active, locked), 1207:22861 (return) and 1207:22896 (optional digest).
 */
export default async function DeepFocusPage() {
  const viewer = await getShellViewer();

  let digest: FocusDigest | null = null;
  if (viewer.focusReturnPending) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("focus_digest");
    const row = data?.[0];
    if (row) {
      digest = {
        newMatches: row.new_matches,
        bondMessages: row.bond_messages,
        bondSender: row.bond_sender,
        otherMessages: row.other_messages,
        otherSender: row.other_sender,
        groupReplies: row.group_replies,
        groupTitle: row.group_title,
        postComments: row.post_comments,
      };
    }
  }

  return (
    <DeepFocusView
      activeUntil={viewer.focusEndsAt}
      returning={viewer.focusReturnPending}
      digest={digest}
    />
  );
}
