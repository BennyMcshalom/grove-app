/**
 * Conversation types — what kind of conversation a "Root a thought" post
 * starts, and the topic inside its Space it's about (Relationships → Family).
 *
 * Optional: a post without a type works exactly as before. Each type has its
 * own words for the same two actions every post already has — the Root
 * (Relate / Agree) and the comments (Respond / Another perspective) — plus
 * Keep, or Follow story for Unfinished posts.
 */
export type Conversation = "unspoken" | "unfiltered" | "unfinished";

export interface ConversationType {
  value: Conversation;
  label: string;
  /** One line under the label: what this kind of post is for. */
  hint: string;
  /** The first prompt in the composer (the post's headline). */
  prompt: string;
  /** The second, optional prompt (the line of context under it). */
  detailPrompt: string;
  /** What the Root is called on this kind of post. */
  rootLabel: string;
  /** What commenting is called. */
  replyLabel: string;
  /** The comment box's placeholder. */
  replyPlaceholder: string;
  /** Real-sounding examples, shown one at a time as a placeholder. */
  examples: string[];
}

export const CONVERSATIONS: ConversationType[] = [
  {
    value: "unspoken",
    label: "Unspoken",
    hint: "What people rarely say",
    prompt: "What's the thing people rarely say?",
    detailPrompt: "Anything you want to add · Optional",
    rootLabel: "Relate",
    replyLabel: "Respond",
    replyPlaceholder: "Respond with care",
    examples: [
      "When everyone calls me the strong one, all I hear is 'please don't give us another problem to worry about.'",
      "I finally got the job I used to pray for, and most mornings I wish I didn't have to go.",
      "Sometimes I leave my friends' messages unread because I don't have the energy to be the funny version of myself.",
      "I've turned down invitations because I couldn't afford them, then told everyone I was busy.",
    ],
  },
  {
    value: "unfiltered",
    label: "Unfiltered",
    hint: "What people really think",
    prompt: "What do you really think?",
    detailPrompt: "Why? · Optional",
    rootLabel: "Agree",
    replyLabel: "Another perspective",
    replyPlaceholder: "Share another perspective",
    examples: [
      "A peaceful 9–5 job is not a consolation prize.",
      "Being the oldest child does not automatically make you the backup parent.",
      "Buying cheap isn't always the same thing as saving money.",
      "You shouldn't have to share every password to prove you're faithful.",
    ],
  },
  {
    value: "unfinished",
    label: "Unfinished",
    hint: "What you're still figuring out",
    prompt: "What are you in the middle of?",
    detailPrompt: "Where is it right now? · Optional",
    rootLabel: "Root",
    replyLabel: "Respond",
    replyPlaceholder: "Add a response",
    examples: [
      "I accepted a job in a city I've never visited. I move in 19 days.",
      "I finally sent the message to the friend I haven't spoken to since 2021.",
      "Day 1 of trying to learn how to swim at 31. I am absolutely terrified of water.",
      "I signed up for my first 5K even though I can't run for five minutes straight.",
    ],
  },
];

export function getConversation(value: string | null | undefined): ConversationType | undefined {
  return CONVERSATIONS.find((c) => c.value === value);
}

/**
 * Topics inside each Space. Stored on the post as the slug; shown as the
 * label ("Unspoken · Family"). Add to a list freely; renaming a slug would
 * orphan the posts that carry it.
 */
export const TOPICS: Record<string, { slug: string; label: string }[]> = {
  career: [
    { slug: "work", label: "Work" },
    { slug: "job-search", label: "Job search" },
    { slug: "side-hustle", label: "Side hustle" },
    { slug: "business", label: "Business" },
    { slug: "relocation", label: "Relocation" },
    { slug: "burnout", label: "Burnout" },
  ],
  spiritual: [
    { slug: "faith", label: "Faith" },
    { slug: "purpose", label: "Purpose" },
    { slug: "doubt", label: "Doubt" },
    { slug: "practice", label: "Practice" },
    { slug: "community", label: "Community" },
  ],
  wealth: [
    { slug: "money", label: "Money" },
    { slug: "debt", label: "Debt" },
    { slug: "saving", label: "Saving" },
    { slug: "investing", label: "Investing" },
    { slug: "spending", label: "Spending" },
    { slug: "family-money", label: "Family money" },
  ],
  adventure: [
    { slug: "travel", label: "Travel" },
    { slug: "moving-abroad", label: "Moving abroad" },
    { slug: "solo-trips", label: "Solo trips" },
    { slug: "new-experiences", label: "New experiences" },
  ],
  health: [
    { slug: "fitness", label: "Fitness" },
    { slug: "mental-health", label: "Mental health" },
    { slug: "food", label: "Food" },
    { slug: "sleep", label: "Sleep" },
    { slug: "recovery", label: "Recovery" },
  ],
  creative: [
    { slug: "making", label: "Making" },
    { slug: "sharing-work", label: "Sharing work" },
    { slug: "creative-block", label: "Creative block" },
    { slug: "craft", label: "Craft" },
  ],
  learning: [
    { slug: "study", label: "Study" },
    { slug: "new-skills", label: "New skills" },
    { slug: "career-change", label: "Career change" },
    { slug: "languages", label: "Languages" },
  ],
  relationships: [
    { slug: "family", label: "Family" },
    { slug: "dating", label: "Dating" },
    { slug: "marriage", label: "Marriage" },
    { slug: "friendship", label: "Friendship" },
    { slug: "parenting", label: "Parenting" },
    { slug: "heartbreak", label: "Heartbreak" },
  ],
};

export function topicsFor(chapterSlug: string | null | undefined) {
  return (chapterSlug && TOPICS[chapterSlug]) || [];
}

export function topicLabel(chapterSlug: string | null | undefined, topic: string | null | undefined) {
  if (!topic) return undefined;
  return topicsFor(chapterSlug).find((t) => t.slug === topic)?.label;
}

/** "Unspoken · Family", or just "Unspoken"; undefined for untyped posts. */
export function conversationLine(
  chapterSlug: string | null | undefined,
  conversation: string | null | undefined,
  topic: string | null | undefined,
) {
  const type = getConversation(conversation);
  if (!type) return undefined;
  const label = topicLabel(chapterSlug, topic);
  return label ? `${type.label} · ${label}` : type.label;
}
