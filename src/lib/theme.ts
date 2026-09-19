export type Theme = "light" | "dark";

/**
 * The appearance lives in `profiles.theme`, but the page has to be the right
 * colour before any of that loads — otherwise a dark-mode user gets a white
 * flash on every navigation. So the choice is mirrored into a cookie the
 * server can read while rendering <html>, and the signed-in value corrects it
 * once the shell knows better.
 */
export const THEME_COOKIE = "grouv-theme";

export function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}

/** Applies the theme to the document, and remembers it for the next render. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  // A year, readable by the server; nothing secret lives in it.
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
