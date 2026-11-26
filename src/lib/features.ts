/**
 * Sections hidden to keep Grouv simple, the way Instagram and X keep a
 * handful of destinations (2026-11-24). Hidden means out of the navigation
 * and the side panels; the pages, their data and their links still work,
 * nothing is deleted. Set one back to true to bring it back everywhere.
 */
export const FEATURES = {
  events: false,
  nearby: false,
  groups: false,
  deepFocus: false,
  /** The full Grouv profile (banner, rings, prompts, Grouv Logs tab). Off: the lean profile. */
  richProfile: false,
} as const;

/** Whether a navigation link points at something that's switched on. */
export function shownInNav(href: string) {
  if (href.startsWith("/events")) return FEATURES.events;
  if (href.startsWith("/nearby")) return FEATURES.nearby;
  if (href.startsWith("/groups")) return FEATURES.groups;
  if (href.startsWith("/deep-focus")) return FEATURES.deepFocus;
  return true;
}
