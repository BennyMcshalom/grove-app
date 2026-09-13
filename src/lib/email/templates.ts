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
