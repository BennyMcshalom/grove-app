import type { Email } from "./send";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Brand-coloured single-column layout that survives most mail clients. */
function layout(body: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#FBF8F3;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1F2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:16px;padding:32px;">
            <tr><td style="font-size:20px;font-weight:700;color:#F57E16;padding-bottom:24px;">Grouv</td></tr>
            <tr><td style="font-size:16px;line-height:1.6;">${body}</td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Sent when a free trial starts, so there's a record of when it ends. */
export function trialStartedEmail({
  to,
  firstName,
  trialEndsAt,
  siteUrl,
}: {
  to: string;
  firstName: string;
  trialEndsAt: string | null;
  siteUrl: string;
}): Email {
  const name = escapeHtml(firstName);
  const ends = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return {
    to,
    subject: "Your Grouv free trial has started",
    text: `Hi ${firstName},\n\nYour free trial of Grouv has started${ends ? ` and runs until ${ends}` : ""}. All eight Spaces, Bonds, Bond Log and Life Wrapped are included until your trial ends. See or change your plan any time in Settings: ${siteUrl}/settings`,
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${name},</p>
      <p style="margin:0 0 16px;">Your free trial of Grouv has started${ends ? ` and runs until <strong>${escapeHtml(ends)}</strong>` : ""}. Everything is open to you in the meantime.</p>
      <p style="margin:0 0 24px;">All eight Spaces, Bonds, Bond Log and Life Wrapped are included until your trial ends. You can see or change your plan any time in Settings.</p>
      <a href="${siteUrl}/settings" style="display:inline-block;background:#F57E16;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Open Settings</a>
    `),
  };
}

export function welcomeEmail({
  to,
  firstName,
  chapterNames,
  siteUrl,
}: {
  to: string;
  firstName: string;
  chapterNames: string[];
  siteUrl: string;
}): Email {
  const name = escapeHtml(firstName);
  const chapters = chapterNames.map(escapeHtml).join(", ");

  return {
    to,
    subject: "Your Grouv is ready",
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${name},</p>
      <p style="margin:0 0 16px;">Your Grouv is ready. You're holding ${chapters} — we'll surface people who are on a similar path.</p>
      <p style="margin:0 0 24px;">Depth, on purpose.</p>
      <a href="${siteUrl}/home" style="display:inline-block;background:#F57E16;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Enter Grouv</a>
    `),
    text: `Hi ${firstName},\n\nYour Grouv is ready. You're holding ${chapterNames.join(", ")} — we'll surface people who are on a similar path.\n\nEnter Grouv: ${siteUrl}/home`,
  };
}

/** Invite a friend → Email: the member's personal link, in their name. */
export function referralInviteEmail({
  to,
  friendName,
  inviterName,
  link,
}: {
  to: string;
  friendName: string | null;
  inviterName: string;
  link: string;
}): Email {
  const inviter = escapeHtml(inviterName);
  const hello = friendName ? `Hi ${escapeHtml(friendName)},` : "Hi,";

  return {
    to,
    subject: `${inviterName} invited you to Grouv`,
    html: layout(`
      <p style="margin:0 0 16px;">${hello}</p>
      <p style="margin:0 0 16px;">${inviter} is on Grouv — a place to meet people in the same chapter of life as you — and wants to bring you into your next chapter.</p>
      <p style="margin:0 0 24px;">You'll get 14 days of the full Season Pass, free, when you join.</p>
      <a href="${link}" style="display:inline-block;background:#F57E16;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Join ${inviter} on Grouv</a>
    `),
    text: `${friendName ? `Hi ${friendName},` : "Hi,"}\n\n${inviterName} is on Grouv — a place to meet people in the same chapter of life as you — and wants to bring you into your next chapter. You'll get 14 days of the full Season Pass, free, when you join.\n\nJoin: ${link}`,
  };
}

export interface NotificationEmailInput {
  to: string;
  kind: string;
  recipientName: string;
  actorName: string | null;
  entityId: string | null;
  data: Record<string, unknown>;
  groupTitle: string | null;
  groupSlug: string | null;
  siteUrl: string;
}

/**
 * The few notifications worth an email: someone is waiting on the recipient,
 * or a decision about them was made. Returns null for any other kind.
 */
export function notificationEmail(input: NotificationEmailInput): Email | null {
  const who = input.actorName ?? "Someone";
  const group = input.groupTitle ?? "a group";
  const groupHref = input.groupSlug ? `/groups/${input.groupSlug}` : "/groups";

  const copy = (() => {
    switch (input.kind) {
      case "connection_request":
        return {
          subject: `${who} wants to connect on Grouv`,
          line: `${who} asked to join your circle. Accept to see each other's posts and logs.`,
          cta: "See the request",
          href: "/bonds",
        };
      // No score, no explanation: just that it happened.
      case "bond_formed":
        return {
          subject: "Something has taken root",
          line: `Something between you and ${who} has taken root.`,
          cta: "Open Grouv",
          href: "/bonds",
        };
      case "introduction_received": {
        const note = typeof input.data.note === "string" && input.data.note ? ` They said: "${input.data.note}"` : "";
        return {
          subject: `${who} thinks you should meet someone`,
          line: `${who} introduced you to someone in a similar chapter.${note}`,
          cta: "Take a look",
          href: input.entityId ? `/people/${input.entityId}` : "/bonds",
        };
      }
      case "group_join_request":
        return {
          subject: `${who} asked to join ${group}`,
          line: `${who} asked to join ${group}. You're an admin, so it's your call.`,
          cta: "Review the request",
          href: groupHref,
        };
      case "group_join_reviewed":
        return input.data.approved
          ? {
              subject: `You're in ${group}`,
              line: `Your request to join ${group} was approved.`,
              cta: "Open the group",
              href: groupHref,
            }
          : {
              subject: `About your request to join ${group}`,
              line: `Your request to join ${group} wasn't approved this time. There are other groups in your chapters.`,
              cta: "Browse groups",
              href: "/groups",
            };
      case "connection_suggested": {
        const shared = Number(input.data.shared_spaces) || 1;
        return {
          subject: "We found someone you might connect with",
          line: `${who} is holding ${shared === 1 ? "one of your spaces" : `${shared} of your spaces`} right now.`,
          cta: "Take a look",
          href: input.entityId ? `/people/${input.entityId}` : "/bonds",
        };
      }
      default:
        return null;
    }
  })();
  if (!copy) return null;

  const name = escapeHtml(input.recipientName);
  const url = `${input.siteUrl}${copy.href}`;

  return {
    to: input.to,
    subject: copy.subject,
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${name},</p>
      <p style="margin:0 0 24px;">${escapeHtml(copy.line)}</p>
      <a href="${url}" style="display:inline-block;background:#F57E16;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">${escapeHtml(copy.cta)}</a>
      <p style="margin:32px 0 0;font-size:13px;color:#6B7280;">You can turn these emails off in <a href="${input.siteUrl}/settings" style="color:#6B7280;">Settings</a>.</p>
    `),
    text: `Hi ${input.recipientName},\n\n${copy.line}\n\n${copy.cta}: ${url}\n\nTurn these emails off in Settings: ${input.siteUrl}/settings`,
  };
}

/** Settings → "Request export": the link builds the file when they open it signed in. */
export function dataExportEmail({ to, firstName, siteUrl }: { to: string; firstName: string; siteUrl: string }): Email {
  const link = `${siteUrl}/api/export`;
  return {
    to,
    subject: "Your Grouv data export",
    text: `Hi ${firstName},\n\nHere's the link to download a copy of your Grouv data: your profile, chapters, posts, Grouv Log, the messages you sent and your connections, as one file. Open it while signed in to Grouv: ${link}\n\nIf you didn't ask for this, you can ignore this email.`,
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 24px;">Here&#39;s your download link: a copy of your profile, chapters, posts, Grouv Log, the messages you sent and your connections, as one file. Open it while signed in to Grouv.</p>
      <a href="${link}" style="display:inline-block;background:#F57E16;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Download my data</a>
      <p style="margin:24px 0 0;font-size:14px;color:#6B7280;">If you didn&#39;t ask for this, you can ignore this email.</p>
    `),
  };
}

/** Danger zone: the account goes for good on `deleteAfter` unless they sign back in. */
export function accountDeletionEmail({
  to,
  firstName,
  deleteAfter,
  siteUrl,
}: {
  to: string;
  firstName: string;
  deleteAfter: string;
  siteUrl: string;
}): Email {
  const when = new Date(deleteAfter).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return {
    to,
    subject: "Your Grouv account is scheduled for deletion",
    text: `Hi ${firstName},\n\nYour account is scheduled for permanent deletion on ${when}. Sign back in any time before then to cancel: ${siteUrl}/sign-in\n\nAfter that date, your data, Bonds, and posts are gone for good.`,
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin:0 0 16px;">Your account is scheduled for permanent deletion on <strong>${escapeHtml(when)}</strong>. Sign back in any time before then to cancel.</p>
      <p style="margin:0 0 24px;">After that date, your data, Bonds, and posts are gone for good.</p>
      <a href="${siteUrl}/sign-in" style="display:inline-block;background:#F57E16;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Keep my account</a>
    `),
  };
}

export interface MessageEmailInput {
  to: string;
  recipientName: string;
  conversationKind: "direct" | "group" | "event";
  unreadCount: number;
  senderCount: number;
  latestSenderId: string | null;
  latestSenderName: string | null;
  latestKind: string;
  /** Text and link messages only; null for media. */
  latestPreview: string | null;
  groupSlug: string | null;
  groupTitle: string | null;
  eventId: string | null;
  eventTitle: string | null;
  siteUrl: string;
}

/** What the newest message was, when there's no text to quote. */
function describeMessage(kind: string) {
  switch (kind) {
    case "voice":
      return "a voice note";
    case "video":
      return "a video";
    case "image":
      return "a photo";
    case "file":
      return "a file";
    case "post_share":
      return "a post";
    default:
      return "a message";
  }
}

/**
 * Unread messages, one email per chat until it's opened again (see
 * claim_message_emails). The site has no push notifications, so this is how
 * someone away from Grouv learns they've been messaged.
 */
export function messageEmail(input: MessageEmailInput): Email {
  const sender = input.latestSenderName ?? "Someone";
  const n = input.unreadCount;
  const more = n === 1 ? "a message" : `${n} messages`;
  const place =
    input.conversationKind === "group"
      ? input.groupTitle ?? "your group"
      : input.conversationKind === "event"
        ? input.eventTitle ?? "an event chat"
        : null;

  const subject = place
    ? `${n === 1 ? `${sender} sent a message` : `${n} new messages`} in ${place}`
    : `${sender} sent you ${more} on Grouv`;

  const intro = place
    ? n === 1
      ? `${sender} sent a message in ${place}:`
      : `There are ${n} new messages in ${place}${input.senderCount > 1 ? "" : ` from ${sender}`}. The latest, from ${sender}:`
    : n === 1
      ? `${sender} sent you a message:`
      : `${sender} sent you ${n} messages. The latest:`;

  const quote = input.latestPreview?.trim()
    ? `“${input.latestPreview.trim()}${input.latestPreview.length >= 140 ? "…" : ""}”`
    : `They sent ${describeMessage(input.latestKind)}.`;

  const path =
    input.conversationKind === "group" && input.groupSlug
      ? `/groups/${input.groupSlug}`
      : input.conversationKind === "event" && input.eventId
        ? `/events/${input.eventId}`
        : input.latestSenderId
          ? `/bonds?with=${input.latestSenderId}`
          : "/bonds";
  const href = `${input.siteUrl}${path}`;
  const settings = `${input.siteUrl}/settings`;

  return {
    to: input.to,
    subject,
    text: `Hi ${input.recipientName},\n\n${intro}\n\n${quote}\n\nReply on Grouv: ${href}\n\nYou're getting this because you have unread messages on Grouv. We send one email per chat until you open it. Turn message emails off in Settings: ${settings}`,
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${escapeHtml(input.recipientName)},</p>
      <p style="margin:0 0 12px;">${escapeHtml(intro)}</p>
      <p style="margin:0 0 24px;padding:12px 16px;background:#FBF8F3;border-left:4px solid #F57E16;border-radius:8px;color:#374151;">${escapeHtml(quote)}</p>
      <a href="${href}" style="display:inline-block;background:#F57E16;color:#FFFFFF;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Reply on Grouv</a>
      <p style="margin:24px 0 0;font-size:13px;color:#6B7280;">You're getting this because you have unread messages on Grouv. We send one email per chat until you open it. <a href="${settings}" style="color:#6B7280;">Turn message emails off</a> in Settings.</p>
    `),
  };
}
