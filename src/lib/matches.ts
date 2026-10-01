import { getChapter } from "@/lib/chapters";

/**
 * Matching and introductions — shapes and copy shared by Home, the match
 * modal (Figma 650:37394) and Match Preferences (1215:22432). The database
 * stores the `value`; the UI shows the `label`.
 */

/** "LIFE STAGE" chips — where you are right now. */
export const LIFE_STAGES = [
  { value: "starting_over", label: "Starting over" },
  { value: "rebuilding_routines", label: "Rebuilding routines" },
  { value: "new_to_city", label: "New to the city" },
  { value: "career_pivot", label: "Career pivot" },
  { value: "becoming_parent", label: "Becoming a parent" },
] as const;

/** "WHAT YOU'RE LOOKING FOR" chips. */
export const LOOKING_FOR = [
  { value: "accountability", label: "Accountability" },
  { value: "creative_collaboration", label: "Creative collaboration" },
  { value: "sounding_board", label: "A steady sounding board" },
  { value: "adventure_partners", label: "Adventure partners" },
  { value: "quiet_checkins", label: "Quiet check-ins" },
] as const;

export type LifeStage = (typeof LIFE_STAGES)[number]["value"];
export type LookingFor = (typeof LOOKING_FOR)[number]["value"];

/** The distance slider's range, in km. */
export const DISTANCE = { min: 5, max: 200, step: 5, fallback: 25 } as const;

export interface MatchPreferences {
  lifeStages: LifeStage[];
  lookingFor: LookingFor[];
  /** Null: no cap. */
  distanceKm: number | null;
  notify: boolean;
}

/** One card in "We found some potential connections". */
export interface Match {
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string;
  phase: string;
  /** "Accountability & Creative collaboration", or null when they haven't said. */
  lookingFor: string | null;
  /** "Why you matched: …" */
  why: string;
}

/** An introduction the viewer sent or received (PRD §5). */
export interface Introduction {
  connectionId: string;
  direction: "sent" | "received";
  userId: string;
  name: string;
  avatarUrl: string | null;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  prompt: string | null;
  chapterSlug: string | null;
  phase: string | null;
  seen: boolean;
  createdAt: string;
  respondedAt: string | null;
}

export function lookingForLabel(value: string) {
  return LOOKING_FOR.find((o) => o.value === value)?.label ?? null;
}

function lifeStageLabel(value: string) {
  return LIFE_STAGES.find((o) => o.value === value)?.label ?? null;
}

/** "A, B & C" */
export function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} & ${labels.at(-1)}`;
}

/**
 * "You're both at First tech job in Career and looking for accountability."
 * Built from what the two share — never from anything private.
 */
export function matchReason(row: {
  chapter_slug: string;
  phase: string;
  same_phase: boolean;
  shared_looking_for: string[];
  shared_life_stages: string[];
}) {
  const space = getChapter(row.chapter_slug)?.name ?? "the same space";
  const stages = row.shared_life_stages.flatMap((v) => lifeStageLabel(v) ?? []).map((l) => l.toLowerCase());
  const wants = row.shared_looking_for.flatMap((v) => lookingForLabel(v) ?? []).map((l) => l.toLowerCase());

  const where = row.same_phase
    ? `You're both at ${row.phase.toLowerCase()} in ${space}`
    : `You're both in ${space}, a step or two apart`;
  const extras = [
    stages.length ? `both ${joinLabels(stages)}` : null,
    wants.length ? `looking for ${joinLabels(wants)}` : null,
  ].filter(Boolean);
  return extras.length ? `${where} and ${extras.join(", ")}.` : `${where}.`;
}

/** Starter prompts for "Introduce yourself" (Figma 980:20547). */
export function starterPrompts(match: { chapterSlug: string | null; phase: string | null }) {
  const space = match.chapterSlug ? getChapter(match.chapterSlug)?.name : undefined;
  return [
    match.phase ? `Ask how ${match.phase.toLowerCase()} is going` : "Ask what they're working through",
    "Share something similar you went through",
    space ? `Swap one thing that's helped in ${space}` : "Swap one thing that's helped lately",
  ];
}
