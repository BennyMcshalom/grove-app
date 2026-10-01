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
  /** Whoever caused it, so their photo can open their Grouv. */
  actorId: string | null;
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
    actorId: row.actor_id,
    createdAt: row.created_at,
    read: row.read_at !== null,
  };

  switch (row.kind) {
    case "connection_request":
      return { ...base, title: `${who} wants to connect`, body: "Accept to bring them into your circle.", href: "/bonds" };
    case "connection_accepted":
      return { ...base, title: `${who} accepted your request`, body: "They're in your circle now.", href: `/bonds` };
    // Season Pass Bond invites (they can also be older engine-era rows).
    case "bond_invitation": {
      const goal = typeof data.goal === "string" ? data.goal : null;
      return {
        ...base,
        title: `${who} invited you to a Bond`,
        body: goal ? `Goal: ${goal}` : "Accept to share check-ins, reflections and a goal.",
        href: "/bonds",
      };
    }
    case "bond_accepted":
      return { ...base, title: `${who} accepted your Bond invite`, body: "You're Bonded now.", href: "/bonds" };
    case "bond_declined":
      return { ...base, title: `${who} declined your Bond invite`, body: "You're still connected.", href: "/bonds" };
    case "bond_released":
      return {
        ...base,
        title: `${who} ended your Bond`,
        body: "What you shared stays readable. You're still connected.",
        href: row.entity_id ? `/bonds/${row.entity_id}` : "/bonds",
      };
    case "bond_log_shared":
      return {
        ...base,
        title: `${who} shared in your Bond Log`,
        body: data.activity === "gratitude" ? "Today's gratitude is in." : "Their reflection is waiting for yours.",
        href: row.entity_id ? `/log/bonds/${row.entity_id}` : "/log",
      };
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
    // Chapter invitations (Figma 122:8021's INVITATIONS rail).
    case "chapter_invite": {
      const title = typeof data.title === "string" ? data.title : "their chapter";
      return {
        ...base,
        title: `${who} invited you`,
        body: `to join "${title}"`,
        href: typeof data.token === "string" ? `/i/${data.token}` : "/spaces",
      };
    }
    case "chapter_invite_accepted": {
      const chapter = typeof data.chapter_slug === "string" ? getChapter(data.chapter_slug) : undefined;
      return {
        ...base,
        title: `${who} joined your chapter`,
        body: typeof data.title === "string" ? `They're part of "${data.title}" now.` : "They're in your circle now.",
        href: chapter ? `/spaces/${chapter.slug}` : "/spaces",
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
    // PRD catalog, Cross: Review outcome available. Never names the reviewer.
    case "report_reviewed":
      return {
        ...base,
        title: "Update on your report",
        body: `We've reviewed your report about ${reportSubject(data)} — tap to see the outcome.`,
        href: row.entity_id ? `/reports/${row.entity_id}` : "/settings",
      };
    case "wrapped_ready": {
      const chapter = typeof data.chapter_slug === "string" ? getChapter(data.chapter_slug) : undefined;
      return {
        ...base,
        title: data.range === "chapter" ? "Your chapter’s Wrapped is ready" : "Your weekly Wrapped is ready",
        body: chapter ? `A few moments from ${chapter.name}, gathered into a short story.` : "A few of your moments, gathered into a short story.",
        href: row.entity_id ? `/log?wrap=${row.entity_id}` : "/log",
      };
    }
    // Season Pass and referrals (workstream A).
    case "trial_ending":
      return {
        ...base,
        title: "Your Season Pass trial ends soon",
        body:
          typeof data.ends_at === "string"
            ? `Full access until ${new Date(data.ends_at).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" })}. Compare plans before it ends.`
            : "Compare plans before it ends.",
        href: "/settings/subscription",
      };
    case "spaces_paused":
      return {
        ...base,
        title: "Some of your Spaces are paused",
        body: "Free keeps four active. Choose which four — everything in the others is kept.",
        href: "/spaces",
      };
    case "referral_joined":
      return {
        ...base,
        title: `${who} joined Grouv with your link`,
        body: "Your reward unlocks when they complete their first chapter.",
        href: `/settings/invite${row.entity_id ? `?referral=${row.entity_id}` : ""}`,
      };
    case "referral_reward_earned":
      return {
        ...base,
        title: "You earned a reward!",
        body: `${who} completed their first chapter. Claim a month of Season Pass.`,
        href: `/settings/invite${row.entity_id ? `?referral=${row.entity_id}` : ""}`,
      };
    case "referral_nudge":
      return {
        ...base,
        title: `${who} is cheering you on`,
        body: "Keep going with your chapter — closing it is a moment worth marking.",
        href: "/spaces",
      };
    // "Introduce yourself" (workstream D): the request, and the decision back.
    case "introduction_request":
      return {
        ...base,
        title: `${who} introduced themselves`,
        body: "Read their note, then accept or decline.",
        href: row.entity_id ? `/home?intro=${row.entity_id}` : "/home",
      };
    case "introduction_accepted":
      return {
        ...base,
        title: `${who} said yes!`,
        body: "Your introduction was accepted. Say hello and see where it goes.",
        href: row.entity_id ? `/home?intro=${row.entity_id}` : "/bonds",
      };
    case "introduction_declined":
      return {
        ...base,
        title: "Not this time",
        body: `${who} isn't able to connect right now. There are more people to meet.`,
        href: row.entity_id ? `/home?intro=${row.entity_id}` : "/home?matches=1",
      };
    case "match_available":
      return {
        ...base,
        title: "We found someone you might connect with",
        body: "A new potential connection is around. See why you match.",
        href: "/home?matches=1",
      };
    // Kinds added by a newer release than this client: still a readable row.
    default:
      return { ...base, title: "Something new on Grouv", body: "", href: "/home" };
  }
}

/** What a report was about, as the reporter would say it: "Jalen", or "a post". */
export function reportSubject(data: Record<string, unknown>) {
  if (typeof data.subject === "string" && data.subject) return data.subject;
  return REPORT_NOUNS[typeof data.target_type === "string" ? data.target_type : ""] ?? "something you flagged";
}

const REPORT_NOUNS: Record<string, string> = {
  post: "a post",
  comment: "a comment",
  message: "a message",
  group: "a group",
  event: "an event",
  profile: "a profile",
  truth: "a Truth",
  space_question: "a question",
};
