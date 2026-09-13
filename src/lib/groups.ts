/** Chapter group shapes, built on the server from group_cards(). */

export interface Group {
  id: string;
  slug: string;
  title: string;
  /** The badge, e.g. "First 1000 days". */
  label: string | null;
  description: string | null;
  icon: string;
  color: string;
  chapterSlug: string | null;
  joinPolicy: "open" | "approval";
  memberCount: number;
  conversationId: string;
  myRole: "admin" | "member" | null;
  requestPending: boolean;
  /** Up to four member photos. */
  memberAvatars: string[];
}

/** Start a group → PICK A COLOR (Figma 211:11620). */
export const GROUP_COLORS = [
  "#FAF8CA",
  "#E9FEF8",
  "#CFF7FA",
  "#D6E1FC",
  "#BDE3EE",
  "#FED1FA",
  "#FED1DD",
  "#FEF1E9",
] as const;

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
