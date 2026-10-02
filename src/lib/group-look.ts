import type { PickerIcon } from "@/lib/icons";

/**
 * How a chapter group looks: one flat colour and a line-art illustration
 * (GroupArt.tsx). The art keys match the check on groups.art in
 * supabase/migrations/20261002130100_profile_banner_group_art.sql.
 */

export const GROUP_ARTS = [
  { key: "crossroads", label: "Crossroads" },
  { key: "sprout", label: "Growing" },
  { key: "piggy-bank", label: "Saving" },
  { key: "summit", label: "Summit" },
  { key: "briefcase", label: "Work" },
  { key: "heart-hands", label: "Care" },
  { key: "book", label: "Learning" },
  { key: "palette", label: "Creating" },
  { key: "compass", label: "Finding the way" },
  { key: "plane", label: "Travel" },
  { key: "house", label: "Home & moving" },
  { key: "stroller", label: "Parenthood" },
  { key: "sneaker", label: "Health" },
  { key: "lotus", label: "Stillness" },
  { key: "lightbulb", label: "Ideas" },
  { key: "handshake", label: "Together" },
] as const;

export type GroupArtKey = (typeof GROUP_ARTS)[number]["key"];

export function isGroupArt(value: string): value is GroupArtKey {
  return GROUP_ARTS.some((a) => a.key === value);
}

/**
 * Sixteen flat colours far enough apart that a Space's groups never look
 * alike. Same list as the backfill in the migration.
 */
export const GROUP_PALETTE = [
  "#F28C78",
  "#2BB3A3",
  "#E9B949",
  "#F49AC1",
  "#8E9BF0",
  "#7CC47F",
  "#F2A65A",
  "#5DADE2",
  "#C39BD3",
  "#E8E36B",
  "#4A7C8C",
  "#D9534F",
  "#3D5A98",
  "#A3C9A8",
  "#F7C8A0",
  "#8D6E63",
] as const;

/**
 * groups.icon predates the art and is still required; keep it roughly in step
 * with the art (IconPicker glyphs, src/lib/icons.ts).
 */
export const ART_ICON: Record<GroupArtKey, PickerIcon> = {
  crossroads: "target",
  sprout: "plant",
  "piggy-bank": "sparkle",
  summit: "target",
  briefcase: "suitcase",
  "heart-hands": "hand-peace",
  book: "atom",
  palette: "palette",
  compass: "planet",
  plane: "planet",
  house: "fire",
  stroller: "baby",
  sneaker: "fire",
  lotus: "flower-lotus",
  lightbulb: "sparkle",
  handshake: "hand-peace",
};

/** The art a new group in each Space starts with. */
export const SPACE_ART: Record<string, GroupArtKey> = {
  career: "briefcase",
  wealth: "piggy-bank",
  health: "sneaker",
  relationships: "heart-hands",
  creative: "palette",
  learning: "book",
  spiritual: "lotus",
  adventure: "compass",
};

export function artForSpace(chapterSlug: string | null | undefined): GroupArtKey {
  return (chapterSlug && SPACE_ART[chapterSlug]) || "crossroads";
}

/**
 * A random palette colour no other group in the Space has yet — "no two
 * colours the same". Once all sixteen are taken, any but `avoid`.
 */
export function pickGroupColor(taken: readonly string[], avoid?: string): string {
  const used = new Set(taken.map((c) => c.toUpperCase()));
  if (avoid) used.add(avoid.toUpperCase());
  const free = GROUP_PALETTE.filter((c) => !used.has(c));
  const pool = free.length > 0 ? free : GROUP_PALETTE.filter((c) => c !== avoid?.toUpperCase());
  return pool[Math.floor(Math.random() * pool.length)];
}

/** A custom colour from the hue slider: flat, mid-light, never washed out. */
export function hueColor(hue: number): string {
  const s = 0.68;
  const l = 0.66;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const hex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase();
}

/** The hue of a hex colour, 0–359, to start the slider where the colour is. */
export function colorHue(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

function luminance(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}

/**
 * Whether text and art on this colour should be white: whichever of the dark
 * art ink (#1C1917) or white gives the stronger contrast.
 */
export function isDarkColor(hex: string): boolean {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const l = luminance(hex);
  const onInk = (l + 0.05) / (luminance("#1C1917") + 0.05);
  const onWhite = 1.05 / (l + 0.05);
  return onWhite > onInk;
}

/** Ink and paper for line-art and text on a content colour. */
export function inkOn(hex: string) {
  return isDarkColor(hex)
    ? { ink: "#ffffff", paper: "rgb(255 255 255 / 0.2)", muted: "rgb(255 255 255 / 0.85)" }
    : { ink: "var(--color-art-ink)", paper: "var(--color-art-paper)", muted: "rgb(28 25 23 / 0.75)" };
}
