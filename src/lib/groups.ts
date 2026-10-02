import type { GroupArtKey } from "@/lib/group-look";

/** Chapter group shapes, built on the server from group_cards(). */

export interface Group {
  id: string;
  slug: string;
  title: string;
  /** The badge, e.g. "First 1000 days". */
  label: string | null;
  description: string | null;
  icon: string;
  /** The card's flat colour (hex). */
  color: string;
  /** The card's line-art (GroupArt.tsx). */
  art: GroupArtKey;
  chapterSlug: string | null;
  joinPolicy: "open" | "approval";
  memberCount: number;
  conversationId: string;
  myRole: "admin" | "member" | null;
  requestPending: boolean;
  /** Up to four member photos. */
  memberAvatars: string[];
}

export interface Truth {
  id: string;
  body: string;
  feltCount: number;
  createdAt: string;
  feltByMe: boolean;
  mine: boolean;
}

export interface VideoTruth {
  id: string;
  src: string;
  durationSeconds: number | null;
  authorName: string;
  mine: boolean;
}

export interface JoinRequest {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}
