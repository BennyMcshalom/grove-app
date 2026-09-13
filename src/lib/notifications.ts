import { getChapter } from "@/lib/chapters";

/** One inbox row, as the panel renders it. */
export interface InboxItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  actorName: string | null;
  actorAvatar: string | null;
  createdAt: string;
  read: boolean;
}

export interface NotificationRow {
  id: string;
  kind: string;
  actor_name: string | null;
  actor_avatar: string | null;
  entity_id: string | null;
  data: unknown;
  read_at: string | null;
  created_at: string;
  group_slug: string | null;
  group_title: string | null;
  room_title: string | null;
}

/** Copy and destination for each notification kind. */
export function toInboxItem(row: NotificationRow): InboxItem {
  const who = row.actor_name ?? "Someone";
  const data = (row.data ?? {}) as Record<string, unknown>;
  const base = {
    id: row.id,
    kind: row.kind,
    actorName: row.actor_name,
    actorAvatar: row.actor_avatar,
    createdAt: row.created_at,
    read: row.read_at !== null,
  };

  switch (row.kind) {
    case "connection_request":
      return { ...base, title: `${who} wants to connect`, body: "Accept to bring them into your circle.", href: "/bonds" };
    case "connection_accepted":
      return { ...base, title: `${who} accepted your request`, body: "They're in your circle now.", href: `/bonds` };
    case "bond_invitation":
      return { ...base, title: `${who} invited you to bond`, body: "Bonds see the parts of you your circle doesn't.", href: "/bonds" };
    case "bond_accepted":
      return { ...base, title: `You and ${who} are bonded`, body: "Say hello.", href: "/bonds" };
    case "post_rooted":
      return { ...base, title: `${who} rooted your post`, body: "Your circle will see it too.", href: row.entity_id ? `/posts/${row.entity_id}` : "/home" };
    case "post_commented":
      return { ...base, title: `${who} commented on your post`, body: "See what they said.", href: row.entity_id ? `/posts/${row.entity_id}` : "/home" };
    case "group_join_request":
      return {
        ...base,
        title: `${who} asked to join ${row.group_title ?? "your group"}`,
        body: "Review the request.",
        href: row.group_slug ? `/groups/${row.group_slug}` : "/groups",
      };
    case "group_join_reviewed":
      return data.approved
        ? {
            ...base,
            title: `You're in ${row.group_title ?? "the group"}`,
            body: "Your join request was approved.",
            href: row.group_slug ? `/groups/${row.group_slug}` : "/groups",
          }
        : {
            ...base,
            title: `Your request to join ${row.group_title ?? "a group"} wasn't approved`,
            body: "There are other groups in your chapters.",
            href: "/groups",
          };
    case "wave_received":
      return {
        ...base,
        title: `${who} waved at you`,
        body: row.room_title ? `In ${row.room_title}.` : "At a Meet & Greet.",
        href: "/events",
      };
    case "chapter_prompt": {
      const chapter = typeof data.chapter_slug === "string" ? getChapter(data.chapter_slug) : undefined;
      return {
        ...base,
        title: "Your weekly reflection",
        body: chapter ? `How is ${chapter.name} going? Log a moment.` : "Log a moment from your week.",
        href: "/log",
      };
    }
    default:
      return { ...base, title: "We found someone you might connect with", body: "", href: "/bonds" };
  }
}
