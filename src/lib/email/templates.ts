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
    text: `Hi ${firstName},\n\nYour free trial of Grouv has started${ends ? ` and runs until ${ends}` : ""}. You won't be charged for the trial. See or change your plan any time in Settings: ${siteUrl}/settings`,
    html: layout(`
      <p style="margin:0 0 16px;">Hi ${name},</p>
      <p style="margin:0 0 16px;">Your free trial of Grouv has started${ends ? ` and runs until <strong>${escapeHtml(ends)}</strong>` : ""}. Everything is open to you in the meantime.</p>
      <p style="margin:0 0 24px;">You won't be charged for the trial. You can see or change your plan any time in Settings.</p>
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
