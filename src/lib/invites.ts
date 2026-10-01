/** Chapter invitation shapes (PRD §6 "Invitation preview, share, and recipient landing"). */

/** The card a recipient sees — Figma 1524:25315. */
export interface ChapterInvitation {
  id: string;
  token: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  chapterSlug: string;
  title: string;
  note: string | null;
  photoUrls: string[];
  isSender: boolean;
  /** How the viewer answered; null when signed out or never invited. */
  myStatus: "pending" | "accepted" | "declined" | null;
  /** The viewer already holds this chapter's Space, so no stage to pick. */
  holdsChapter: boolean;
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

/** Someone the picker (1505:24264) can invite. */
export interface InvitePerson {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** "Bonded since Mar 2024", "In your circle", or their stage in this Space. */
  detail: string;
  group: "bond" | "suggested";
}

/** The cookie that carries an invitation through sign-up (/i/<token>/join). */
export const INVITE_COOKIE = "grouv_chapter_invite";
