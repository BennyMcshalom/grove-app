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
  /**
   * A button on the row: "acknowledge" a bond's new chapter, or "dismiss" a
   * one-time prompt (clearing a dormancy nudge means it never comes back).
   */
  action?: { kind: "acknowledge" | "dismiss"; label: string };
}

export interface NotificationRow {
  id: string;
  kind: string;
  actor_id: string | null;
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
    // Older rows from before bonds were formed by the engine.
    case "bond_invitation":
    case "bond_accepted":
    case "bond_formed":
      return { ...base, title: `Something between you and ${who} has taken root.`, body: "", href: "/bonds" };
    // In-app only, and quiet: no reason given.
    case "bond_shifted":
      return { ...base, title: `Your connection with ${who} has shifted.`, body: "Everything you've shared is still here.", href: "/bonds" };
    case "bond_chapter_opened": {
      const chapter = typeof data.chapter_slug === "string" ? getChapter(data.chapter_slug) : undefined;
      return {
        ...base,
        title: `${who} opened a new chapter`,
        body: chapter ? `They're starting something in ${chapter.name}.` : "They're starting something new.",
        href: "/bonds",
        action: { kind: "acknowledge", label: "Acknowledge" },
      };
    }
    case "stage_drift":
      return {
        ...base,
        title: `You and ${who} seem to be in different chapters now.`,
        body: "Still feels right?",
        href: row.entity_id ? `/people/${row.entity_id}` : "/bonds",
        action: { kind: "dismiss", label: "It does" },
      };
    case "dormancy_nudge":
      return {
        ...base,
        title: `It's been quiet between you and ${who}.`,
        body: "Maybe say hello?",
        href: row.entity_id ? `/people/${row.entity_id}` : "/bonds",
        action: { kind: "dismiss", label: "Not now" },
      };
    case "chapter_closing_suggested": {
      const chapter = typeof data.chapter_slug === "string" ? getChapter(data.chapter_slug) : undefined;
      return {
        ...base,
        title: chapter ? `${chapter.name} has been shifting a lot` : "This chapter has been shifting a lot",
        body: "Maybe it's ready to close. The Chapter Closing Ritual is there when you are.",
        href: chapter ? `/spaces/${chapter.slug}` : "/spaces",
      };
    }
    case "introduction_suggested": {
      const other = typeof data.other_name === "string" ? data.other_name : "someone";
      return {
        ...base,
        title: `${who} and ${other} are in a similar chapter`,
        body: "Want to introduce them?",
        href: row.entity_id ? `/introduce?a=${row.actor_id ?? ""}&b=${row.entity_id}` : "/bonds",
      };
    }
    case "introduction_received": {
      const note = typeof data.note === "string" && data.note ? `"${data.note}"` : "Take a look and connect if it feels right.";
      return {
        ...base,
        title: `${who} thinks you should meet someone`,
        body: note,
        href: row.entity_id ? `/people/${row.entity_id}` : "/bonds",
      };
    }
    // "I see you": a private signal, never a count.
    case "post_rooted":
      return { ...base, title: `${who} sees you`, body: "They saw your post.", href: row.entity_id ? `/posts/${row.entity_id}` : "/home" };
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
    case "connection_suggested": {
      const shared = Number(data.shared_spaces) || 1;
      return {
        ...base,
        title: "We found someone you might connect with",
        body: `${who} is holding ${shared === 1 ? "one of your spaces" : `${shared} of your spaces`}.`,
        href: row.entity_id ? `/people/${row.entity_id}` : "/bonds",
      };
    }
    default:
      return { ...base, title: "Something new on Grouv", body: "", href: "/home" };
  }
}
