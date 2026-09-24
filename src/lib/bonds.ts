import type { Aura } from "@/lib/profile";

/** Bonds-screen shapes, built on the server from the bonds_* RPCs. */

export type MessageKind = "text" | "voice" | "video" | "image" | "link" | "post_share" | "system" | "card" | "file";

/** Someone in the viewer's bonds or circle, with the chat they share. */
export interface BondPerson {
  userId: string;
  name: string;
  avatarUrl: string | null;
  aura: Aura;
  /** Their longest-held open chapter, shown as the badge under their name. */
  chapterSlug: string | null;
  phase: string | null;
  relationship: "bond" | "circle";
  bondId: string | null;
  since: string;
  /**
   * The viewer's rank for this bond, 1–5, set weekly by the bond engine.
   * Shown only as the colour of the bond mark — never as a number.
   */
  rank: number | null;
  conversationId: string | null;
  lastMessage: { preview: string; at: string; fromMe: boolean } | null;
  unread: number;
}

export interface PendingRequest {
  kind: "connection";
  requestId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string | null;
  phase: string | null;
}

export interface Suggestion {
  userId: string;
  name: string;
  avatarUrl: string | null;
  phase: string;
  sharedChapter: string;
  mutualCount: number;
  mutualAvatars: string[];
}

export interface ChatMessage {
  id: string;
  kind: MessageKind;
  fromMe: boolean;
  body: string | null;
  createdAt: string;
  /**
   * For shared posts: the post, or null when the reader can't see it (it sits
   * in a space they don't hold). Undefined for every other kind.
   */
  sharedPost?: { id: string; title: string | null; body: string | null; chapterSlug: string } | null;
  /** A Curio or Wander card sent privately; null if it was retired. */
  card?: { kind: "curio" | "wander"; title: string; body: string } | null;
  /** Signed link for voice notes, videos and photos. */
  mediaUrl?: string | null;
  durationSeconds?: number | null;
  /** Documents: what to call the download and how big it is. */
  file?: { name: string; size: number | null };
}

/** A morning card: one Curio per open space, one Wander. Gone at noon. */
export interface DailyCard {
  cardId: string;
  kind: "curio" | "wander";
  chapterSlug: string | null;
  title: string;
  body: string;
}

/** One line for a conversation list. */
export function messagePreview(kind: MessageKind | null, body: string | null) {
  switch (kind) {
    case "text":
    case "system":
      return body ?? "";
    case "post_share":
      return "Shared a post";
    case "voice":
      return "Voice note";
    case "video":
      return "Video";
    case "image":
      return "Photo";
    case "link":
      return "Link";
    case "card":
      return "Shared a card";
    case "file":
      return "Document";
    default:
      return "";
  }
}

/**
 * Bond ranks by colour, strongest first: deep gold, warm amber, soft sage,
 * muted teal, cool stone. The only way rank is ever shown.
 */
export const BOND_RANK_COLORS = ["#C9A84C", "#D4884A", "#5C8A6A", "#3A7A7A", "#7A8A96"] as const;

export function bondRankColor(rank: number | null) {
  return BOND_RANK_COLORS[Math.min(Math.max((rank ?? 5) - 1, 0), 4)];
}

/** "7 months", "3 weeks", "5 days", "Today" — how long a bond has lasted. */
export function bondDuration(since: string, now = Date.now()) {
  const days = Math.floor((now - new Date(since).getTime()) / 86_400_000);
  if (days < 1) return "Today";
  if (days < 14) return `${days} ${days === 1 ? "day" : "days"}`;
  if (days < 60) return `${Math.floor(days / 7)} weeks`;
  const months = Math.floor(days / 30);
  if (months < 24) return `${months} months`;
  return `${Math.floor(days / 365)} years`;
}
