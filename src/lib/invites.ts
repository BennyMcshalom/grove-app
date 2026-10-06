import type { LogEntry } from "@/lib/log";

/**
 * Chapter Companions — "Walk alongside a chapter". A chapter owner invites
 * someone to walk with them through one chapter: the moments they picked,
 * where they are now, and the updates they choose to share. Accepting never
 * opens a Space for the companion or changes their circle.
 */

/** What the invitation offers (the "If you accept, you can see" list). */
export interface CompanionShare {
  story: boolean;
  current: boolean;
  future: boolean;
}

/** The invitation card — what the companion sees, in the app and on /i/<token>. */
export interface CompanionInvitation {
  id: string;
  token: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  chapterSlug: string;
  /** The owner's stage in that chapter. */
  phase: string;
  /** The chapter's headline: "Trying to find a balance". */
  title: string;
  /** "Why Victor?" */
  why: string | null;
  /** "What would help from him?" */
  ask: string | null;
  share: CompanionShare;
  momentCount: number;
  isSender: boolean;
  /** Addressed to someone else (the viewer can't accept it). */
  forSomeoneElse: boolean;
  /** Someone has already accepted it. */
  taken: boolean;
  /** How the viewer answered; null when signed out or never invited. */
  myStatus: "pending" | "accepted" | "declined" | null;
  /** The viewer already walks with this chapter through it. */
  myCompanionId: string | null;
}

/** A row under INVITATIONS (the My Spaces and Space rails). */
export interface PendingInvitation {
  id: string;
  token: string;
  title: string;
  chapterSlug: string;
  senderName: string;
  senderAvatar: string | null;
  createdAt: string;
}

/** Someone the picker can invite. */
export interface InvitePerson {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** "Bonded since Mar 2024", "In your circle", or their stage in this Space. */
  detail: string;
  group: "bond" | "suggested";
}

/** One of the owner's own moments from the chapter, for "Story so far". */
export interface PickableMoment extends LogEntry {
  kind: "log" | "post";
}

/** A card under "Chapters I'm walking with". */
export interface WalkingWith {
  companionId: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  chapterSlug: string;
  phase: string;
  title: string;
  milestone: string | null;
  milestoneDate: string | null;
  latestUpdate: string | null;
  latestUpdateAt: string | null;
  muted: boolean;
  since: string;
}

export interface CompanionUpdate {
  id: string;
  body: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export interface CompanionMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAt: string;
}

/** A shared chapter, as its companion (or its owner) opens it. */
export interface CompanionChapter {
  companionId: string;
  userChapterId: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  companionUserId: string;
  companionName: string;
  companionAvatar: string | null;
  chapterSlug: string;
  phase: string;
  title: string;
  why: string | null;
  ask: string | null;
  share: CompanionShare;
  whereNow: string | null;
  milestone: string | null;
  milestoneDate: string | null;
  noteUpdatedAt: string | null;
  muted: boolean;
  isOwner: boolean;
  since: string;
  moments: PickableMoment[];
  updates: CompanionUpdate[];
  thread: CompanionMessage[];
}

/** The owner's Companions section: one person walking with them. */
export interface OwnerCompanion {
  companionId: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  since: string;
  share: CompanionShare;
  momentCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageMine: boolean;
}

/** An invitation still out. */
export interface SentInvite {
  id: string;
  token: string;
  recipientId: string | null;
  recipientName: string | null;
  recipientAvatar: string | null;
  createdAt: string;
}

/** The cookie that carries an invitation through sign-up (/i/<token>/join). */
export const INVITE_COOKIE = "grouv_chapter_invite";

/** "Oct. 14" for a milestone's calendar date. */
export function milestoneDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(" ", ". ");
}
