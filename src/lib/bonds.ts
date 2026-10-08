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
  /** Formed by the engine, or invited with a shared goal (Season Pass). */
  origin: "engine" | "invite" | null;
  /** "Checking in on our first year in a new city" — the chat header shows it. */
  sharedGoal: string | null;
  goalHorizonMonths: number | null;
  checkinCount: number;
  /** Coarse 10–100 depth for the bar — never shown as a number (PRD D8). */
  depthLevel: number | null;
  /** A Bond invite in flight between you (circle rows only). */
  invite: { id: string; fromMe: boolean; goal: string | null } | null;
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
  /** Their introduction note; null for a plain Connect. */
  message: string | null;
  /** The starter prompt they picked, if any. */
  prompt: string | null;
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
  /** Edited by its sender ("edited" beside the time). */
  editedAt?: string | null;
  /** Deleted by its sender: shown as "This message was deleted". */
  deleted?: boolean;
  /** The message this one replies to, quoted above it. */
  replyTo?: { id: string; fromMe: boolean; preview: string } | null;
}

/** A daily card: one Curio per active Space (up to four), one Wander. Live for 24 hours. */
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

/** YOUR BOND INVITES: someone asked the viewer into a Bond (Figma 1093:22073). */
export interface BondInvite {
  bondId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string | null;
  phase: string | null;
  goal: string | null;
}

/** Bond Details — Figma 1228:29301 (paid) / 1238:30546 (free). */
export interface BondDetails {
  bondId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string | null;
  phase: string | null;
  origin: "engine" | "invite";
  status: "active" | "released";
  sharedGoal: string | null;
  goalHorizonMonths: number | null;
  since: string;
  releasedAt: string | null;
  endedByMe: boolean;
  depthLevel: number;
  checkinCount: number;
  firstCheckinOn: string | null;
  logCount: number;
}

export interface BondCheckin {
  id: string;
  fromMe: boolean;
  mode: "in_app" | "in_person";
  body: string;
  happenedOn: string;
}

export type BondStage = "pre" | "mid" | "post";

/**
 * MILESTONES: Pre-project until the pair first checks in, Mid-project while
 * they work on it, Post-project once the goal's horizon has passed or the Bond
 * was released.
 */
export function bondStage(details: Pick<BondDetails, "since" | "goalHorizonMonths" | "status" | "checkinCount" | "logCount">, now = Date.now()): BondStage {
  if (details.status === "released") return "post";
  if (details.goalHorizonMonths) {
    const end = new Date(details.since);
    end.setMonth(end.getMonth() + details.goalHorizonMonths);
    if (end.getTime() <= now) return "post";
  }
  return details.checkinCount > 0 || details.logCount > 0 ? "mid" : "pre";
}

export const BOND_STAGE_LABEL: Record<BondStage, string> = {
  pre: "Pre-project",
  mid: "Mid-project",
  post: "Post-project",
};

/** "7 months" on the goal bar: the goal's horizon, else how long it's lasted. */
export function goalSpan(horizonMonths: number | null, since: string) {
  if (horizonMonths) return `${horizonMonths} ${horizonMonths === 1 ? "month" : "months"}`;
  return bondDuration(since);
}

/** Bond Log: one prompt round, with your answer and theirs once shared. */
export interface BondLogRound {
  activityId: string;
  kind: "weekly" | "gratitude" | "something_new";
  activityStartedAt: string;
  activityEnded: boolean;
  round: number;
  opensOn: string;
  title: string;
  subtitle: string | null;
  /** Words, a photo, or both — like a solo Log moment. */
  mine: {
    body: string | null;
    photoUrl: string | null;
    /** The stored path, so replacing a draft photo can remove the old one. */
    photoPath: string | null;
    shared: boolean;
    /** "Try something new together": the activity they named (1732:44501). */
    heading: string | null;
  } | null;
  theirs: { body: string | null; photoUrl: string | null; heading: string | null } | null;
  theirShared: boolean;
}

/** One Bond keeping a log with the viewer (Grouv Log → Bond Log tab). */
export interface BondLogSummary {
  bondId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string | null;
  phase: string | null;
  status: "active" | "released";
  sharedCount: number;
  waitingOnMe: boolean;
}

export const BOND_ACTIVITIES = [
  { kind: "gratitude", label: "5-day gratitude challenge", body: "Share one thing you’re grateful for, every day this week" },
  { kind: "weekly", label: "Weekly check-in", body: "A standing prompt to reflect together once a week" },
  { kind: "something_new", label: "Try something new together", body: "Pick an activity neither of you has done before" },
] as const;
