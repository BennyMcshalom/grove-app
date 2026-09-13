import "server-only";
import { Resend } from "resend";

let resend: Resend | null = null;

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends app email (welcome notes, digests) through Resend. Auth codes don't go
 * through here — Supabase Auth sends those over Resend's SMTP relay.
 *
 * Without RESEND_API_KEY / EMAIL_FROM (local dev) the email is logged and
 * skipped rather than failing the action that triggered it.
 */
export async function sendEmail(email: Email): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.warn(`[email] RESEND_API_KEY or EMAIL_FROM not set; skipped "${email.subject}"`);
    return { sent: false };
  }

  resend ??= new Resend(apiKey);
  const { error } = await resend.emails.send({ from, ...email });

  if (error) {
    throw new Error(`Resend rejected "${email.subject}": ${error.message}`);
  }
  return { sent: true };
}
