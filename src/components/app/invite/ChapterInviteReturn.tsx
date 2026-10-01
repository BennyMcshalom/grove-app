import { cookies } from "next/headers";
import { InviteRedirect } from "@/components/app/invite/InviteRedirect";
import { INVITE_COOKIE } from "@/lib/invites";

/**
 * Someone who signed up through a chapter invitation link (/i/<token>/join)
 * lands back on its card once they're in the app. Answering it clears the
 * cookie (respondChapterInvite); until then it's offered once per session.
 */
export async function ChapterInviteReturn() {
  const token = (await cookies()).get(INVITE_COOKIE)?.value;
  if (!token || !/^[0-9a-f]{20}$/.test(token)) return null;
  return <InviteRedirect token={token} />;
}
