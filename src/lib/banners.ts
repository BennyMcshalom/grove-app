import type { GroupArtKey } from "@/lib/group-look";

/**
 * The profile banner set — the strip across the top of a profile card. No
 * uploads: people pick one of Grouv's own solid colours, or a drawn doodle
 * wallpaper (a solid colour tiled with the group line-art, like WhatsApp's
 * chat backgrounds). Stored on profiles.banner as "color:<key>" or
 * "art:<key>"; null is a solid colour chosen from the person's id.
 */

export const BANNER_COLORS = [
  { key: "sand", hex: "#E8DCC8" },
  { key: "blush", hex: "#F3C6C1" },
  { key: "coral", hex: "#F28C78" },
  { key: "peach", hex: "#F7C8A0" },
  { key: "butter", hex: "#F5E3A1" },
  { key: "mustard", hex: "#E9B949" },
  { key: "lime", hex: "#C7DE8A" },
  { key: "sage", hex: "#A3C9A8" },
  { key: "mint", hex: "#BDE7D4" },
  { key: "teal", hex: "#2BB3A3" },
  { key: "sky", hex: "#A9D4F0" },
  { key: "ocean", hex: "#5DADE2" },
  { key: "periwinkle", hex: "#8E9BF0" },
  { key: "lavender", hex: "#C9B6E4" },
  { key: "orchid", hex: "#C39BD3" },
  { key: "rose", hex: "#F49AC1" },
  { key: "brick", hex: "#D9534F" },
  { key: "forest", hex: "#3F6F5A" },
  { key: "navy", hex: "#2E3F6E" },
  { key: "charcoal", hex: "#3B3A40" },
] as const;

export const BANNER_CATEGORIES = [
  "Career",
  "Health",
  "Relationships",
  "Adventure",
  "Creative",
  "Learning",
  "Spiritual",
  "Wealth",
] as const;

export interface ArtBanner {
  key: string;
  label: string;
  category: (typeof BANNER_CATEGORIES)[number];
  hex: string;
  /** The drawings tiled across it, in order. */
  arts: GroupArtKey[];
}

export const BANNER_ARTS: ArtBanner[] = [
  { key: "career-desk", label: "Desk", category: "Career", hex: "#F7C8A0", arts: ["briefcase", "lightbulb", "crossroads"] },
  { key: "career-climb", label: "Climb", category: "Career", hex: "#3D5A98", arts: ["summit", "briefcase", "handshake"] },
  { key: "career-ideas", label: "Ideas", category: "Career", hex: "#E8DCC8", arts: ["lightbulb", "handshake", "summit"] },
  { key: "health-move", label: "Move", category: "Health", hex: "#A3C9A8", arts: ["sneaker", "sprout", "lotus"] },
  { key: "health-bloom", label: "Bloom", category: "Health", hex: "#F49AC1", arts: ["sneaker", "heart-hands", "sprout"] },
  { key: "relationships-care", label: "Care", category: "Relationships", hex: "#F28C78", arts: ["heart-hands", "handshake", "house"] },
  { key: "relationships-family", label: "Family", category: "Relationships", hex: "#F5E3A1", arts: ["stroller", "house", "heart-hands"] },
  { key: "adventure-roam", label: "Roam", category: "Adventure", hex: "#5DADE2", arts: ["plane", "compass", "summit"] },
  { key: "adventure-trail", label: "Trail", category: "Adventure", hex: "#2BB3A3", arts: ["compass", "summit", "sneaker"] },
  { key: "creative-studio", label: "Studio", category: "Creative", hex: "#C39BD3", arts: ["palette", "lightbulb", "book"] },
  { key: "creative-spark", label: "Spark", category: "Creative", hex: "#E9B949", arts: ["lightbulb", "palette", "sprout"] },
  { key: "learning-shelf", label: "Shelf", category: "Learning", hex: "#8E9BF0", arts: ["book", "lightbulb", "compass"] },
  { key: "learning-grow", label: "Grow", category: "Learning", hex: "#C7DE8A", arts: ["book", "sprout", "crossroads"] },
  { key: "spiritual-still", label: "Still", category: "Spiritual", hex: "#BDE7D4", arts: ["lotus", "sprout", "heart-hands"] },
  { key: "spiritual-path", label: "Path", category: "Spiritual", hex: "#4A7C8C", arts: ["lotus", "compass", "crossroads"] },
  { key: "wealth-save", label: "Save", category: "Wealth", hex: "#7CC47F", arts: ["piggy-bank", "sprout", "summit"] },
  { key: "wealth-build", label: "Build", category: "Wealth", hex: "#8D6E63", arts: ["piggy-bank", "briefcase", "house"] },
];

export type ResolvedBanner = { kind: "color"; hex: string } | { kind: "art"; hex: string; arts: GroupArtKey[] };

/** A key the picker offers, so nothing else gets saved. */
export function isBannerKey(value: string): boolean {
  const [kind, key] = value.split(":");
  if (kind === "color") return BANNER_COLORS.some((c) => c.key === key);
  if (kind === "art") return BANNER_ARTS.some((a) => a.key === key);
  return false;
}

/** The default: a solid colour that stays the same for each person. */
export function defaultBannerColor(seed: string): string {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return BANNER_COLORS[hash % BANNER_COLORS.length].hex;
}

export function resolveBanner(banner: string | null | undefined, seed: string): ResolvedBanner {
  const [kind, key] = (banner ?? "").split(":");
  if (kind === "art") {
    const art = BANNER_ARTS.find((a) => a.key === key);
    if (art) return { kind: "art", hex: art.hex, arts: art.arts };
  }
  if (kind === "color") {
    const color = BANNER_COLORS.find((c) => c.key === key);
    if (color) return { kind: "color", hex: color.hex };
  }
  return { kind: "color", hex: defaultBannerColor(seed) };
}
