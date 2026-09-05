import type { Group } from "@/components/app/GroupCard";

/**
 * Chapter groups — Figma instances 205:7820 … 205:7823.
 *
 * Titles, phase badges, blurbs and glyphs are Figma's, including its
 * lorem-ipsum description placeholder.
 */
const DESCRIPTION =
  "“Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut”";

export const GROUPS: Group[] = [
  {
    id: "first-time-founder",
    title: "First-time Founder",
    badge: "First 1000 days",
    blurb: "Starting fresh somewhere new",
    description: DESCRIPTION,
    icon: "suitcase",
    initials: "SL",
  },
  {
    id: "relocating-solo",
    title: "Relocating solo",
    badge: "First 1000 days",
    blurb: "Starting fresh somewhere new",
    description: DESCRIPTION,
    icon: "planet",
    initials: "SL",
  },
  {
    id: "early-parenthood",
    title: "Early Parenthood",
    badge: "First 1000 days",
    blurb: "Starting fresh somewhere new",
    description: DESCRIPTION,
    icon: "baby",
    initials: "SL",
  },
  {
    id: "exploring-new-horizons",
    title: "Exploring new horizons",
    badge: "Taking a gap year",
    blurb: "Embracing adventure and change",
    description: DESCRIPTION,
    icon: "barricade",
    initials: "AU",
  },
  {
    id: "building-a-home",
    title: "Building a home",
    badge: "Settled down",
    blurb: "Creating roots and community",
    description: DESCRIPTION,
    icon: "hourglass",
    initials: "CA",
  },
];

/** Figma's group detail frames all draw "First-time Founder" (205:8484). */
export const FEATURED_GROUP: Group = GROUPS[0];

export function getGroup(id: string): Group {
  return GROUPS.find((g) => g.id === id) ?? FEATURED_GROUP;
}
