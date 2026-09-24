/**
 * Links in posts, comments and chat. They're found in plain text and shown as
 * links, but every one opens through /link, which checks the address before
 * sending anyone off Grouv.
 */

// http(s) URLs and bare www. addresses; trailing punctuation is trimmed.
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING = /[).,;:!?\]}'"]+$/;

export type TextPart = { kind: "text"; text: string } | { kind: "link"; text: string; href: string };

export function splitLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    let raw = match[0];
    const trailing = raw.match(TRAILING)?.[0] ?? "";
    raw = raw.slice(0, raw.length - trailing.length);
    const start = match.index ?? 0;
    if (start > last) parts.push({ kind: "text", text: text.slice(last, start) });
    const url = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    parts.push({ kind: "link", text: raw, href: `/link?to=${encodeURIComponent(url)}` });
    last = start + raw.length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/** The address as something safe to hand to the browser, or null. */
export function normaliseOutboundUrl(value: string | null | undefined): URL | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    // "https://grouv.app@evil.example" hides the real host.
    if (url.username || url.password) return null;
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}
