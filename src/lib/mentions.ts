import type { Aura } from "@/lib/profile";

/**
 * @mentions ("callouts"). The words keep "@Amara"; the row keeps who that was
 * in its `mentions` column, which the database checks and notifies from.
 */
export interface MentionPerson {
  id: string;
  name: string;
  avatarUrl: string | null;
  aura?: Aura;
}

/**
 * Who the @ list offers: commenting on a post, writing a post into a Space,
 * a group or event conversation, or a fixed list (a one-to-one chat).
 */
export type MentionContext =
  | { kind: "post"; postId: string }
  | { kind: "space"; chapterSlug: string }
  | { kind: "conversation"; conversationId: string }
  | { kind: "people"; people: MentionPerson[] };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "@Name" followed by something that can't continue a name. */
function mentionPattern(names: string[]) {
  const alternatives = [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length).map(escape);
  return alternatives.length ? new RegExp(`@(${alternatives.join("|")})(?![\\p{L}\\p{N}_])`, "giu") : null;
}

/** The picked people whose "@Name" is still in the text, each once. */
export function mentionIdsIn(text: string, picked: Iterable<MentionPerson>): string[] {
  const ids = new Set<string>();
  for (const person of picked) {
    if (mentionPattern([person.name])?.test(text)) ids.add(person.id);
  }
  return [...ids];
}

export type MentionPart = { kind: "text"; text: string } | { kind: "mention"; text: string; person: MentionPerson };

/** Splits text into plain runs and "@Name" runs for the people mentioned. */
export function splitMentions(text: string, people: MentionPerson[]): MentionPart[] {
  const pattern = mentionPattern(people.map((p) => p.name));
  if (!pattern || !text.includes("@")) return [{ kind: "text", text }];
  const byName = new Map(people.map((p) => [p.name.toLocaleLowerCase(), p]));
  const parts: MentionPart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const person = byName.get(match[1].toLocaleLowerCase());
    if (!person || match.index === undefined) continue;
    if (match.index > last) parts.push({ kind: "text", text: text.slice(last, match.index) });
    parts.push({ kind: "mention", text: match[0], person });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", text: text.slice(last) });
  return parts;
}

/** The "@query" being typed just before the caret, if any. */
export function activeMentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const match = /(^|[\s(])@([\p{L}\p{N}_'-]{0,30})$/u.exec(before);
  if (!match) return null;
  return { start: caret - match[2].length - 1, query: match[2] };
}

/** Server actions take ids from the client; anything else is dropped. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
