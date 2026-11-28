/**
 * Sections hidden to keep Grouv simple, the way Instagram and X keep a
 * handful of destinations (2026-11-24, narrowed 2026-11-28 to Home, Spaces
 * and Profile). Hidden means out of the navigation and the side panels, and
 * their addresses lead to Home; the pages, their data and their code stay,
 * nothing is deleted. Set one back to true to bring it back everywhere.
 */
export const FEATURES = {
  events: false,
  nearby: false,
  groups: false,
  deepFocus: false,
  /** Bonds, your circle, Connect, introductions and Walking with. Off: Follow instead. */
  bonds: false,
  /** Grouv Log (moments) and Life Wrapped. */
  log: false,
  archive: false,
  /** The Kept list, and the Keep button that fills it. */
  kept: false,
  search: false,
  /** Settings. Edit profile and the subscription page stay reachable. */
  settings: false,
  /** The full Grouv profile (banner, rings, prompts, Grouv Logs tab). Off: the lean profile. */
  richProfile: false,
} as const;

/** Address prefixes of each hideable section. */
const SECTIONS: [string, boolean][] = [
  ["/events", FEATURES.events],
  ["/nearby", FEATURES.nearby],
  ["/groups", FEATURES.groups],
  ["/deep-focus", FEATURES.deepFocus],
  ["/bonds", FEATURES.bonds],
  ["/introduce", FEATURES.bonds],
  ["/walking", FEATURES.bonds],
  ["/log", FEATURES.log],
  ["/archive", FEATURES.archive],
  ["/kept", FEATURES.kept],
  ["/search", FEATURES.search],
  ["/settings", FEATURES.settings],
];

/** Pages under a hidden section that still have to open. */
const STILL_OPEN = ["/settings/edit-profile", "/settings/subscription"];

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** Whether a navigation link points at something that's switched on. */
export function shownInNav(href: string) {
  const path = href.split("?")[0];
  return !SECTIONS.some(([prefix, on]) => !on && under(path, prefix));
}

/** Whether a signed-in visitor opening this address should land on Home instead. */
export function screenHidden(pathname: string) {
  if (STILL_OPEN.some((p) => under(pathname, p))) return false;
  return !shownInNav(pathname);
}
