import type { LogVisibility } from "@/lib/profile";

/**
 * Who can see each profile field — Figma "Audience — Bio / Location /
 * Current chapter / Birthday" (1587:23049…). The database enforces it
 * (profile_for, search_everything); these are the labels and the same rule
 * for the "See your profile the way others do" preview.
 */
export const FIELD_AUDIENCES = [
  { value: "everyone", label: "Everyone", body: "Anyone on Grouv can see this" },
  { value: "circle", label: "My circle", body: "People you're connected with can see this" },
  { value: "bonds", label: "Bonds only", body: "Only your Bonds can see this" },
  { value: "only_me", label: "Private", body: "Just you. A closed door." },
] as const satisfies readonly { value: LogVisibility; label: string; body: string }[];

export type FieldAudience = LogVisibility;

export const PROFILE_FIELDS = [
  { key: "bio", label: "Bio", title: "Who can see your Bio?" },
  { key: "location", label: "Location", title: "Who can see your Location?" },
  { key: "chapter", label: "Current chapter", title: "Who can see your current chapter?" },
  { key: "birthday", label: "Birthday", title: "Who can see your Birthday?" },
] as const;

export type ProfileField = (typeof PROFILE_FIELDS)[number]["key"];

export type ProfileAudiences = Record<ProfileField, FieldAudience>;

/** As the table defaults: birthday for Bonds, the rest for everyone. */
export const DEFAULT_AUDIENCES: ProfileAudiences = {
  bio: "everyone",
  location: "everyone",
  chapter: "everyone",
  birthday: "bonds",
};

export function audienceLabel(audience: FieldAudience) {
  return FIELD_AUDIENCES.find((a) => a.value === audience)?.label ?? "Everyone";
}

/** Who the preview pretends to be. */
export type PreviewAs = "stranger" | "circle" | "bond";

export const PREVIEW_AS: { value: PreviewAs; label: string }[] = [
  { value: "stranger", label: "A stranger" },
  { value: "circle", label: "A connection" },
  { value: "bond", label: "A Bond" },
];

/** private.audience_allows, for the preview. */
export function visibleTo(audience: FieldAudience, as: PreviewAs) {
  if (audience === "everyone") return true;
  if (audience === "circle") return as !== "stranger";
  if (audience === "bonds") return as === "bond";
  return false;
}

/** "March 3" — the year stays private. */
export function birthdayLabel(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}
