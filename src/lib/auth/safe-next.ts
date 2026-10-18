/**
 * `?next=` after signing in: only a path on this site, so the link can't
 * bounce someone to another site. Parsed as a URL rather than pattern-matched:
 * browsers strip tabs and newlines, so "/\t/evil.com" would otherwise become
 * "//evil.com" (another site) after passing a "starts with one slash" check.
 */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512 || !value.startsWith("/")) return null;
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return null;
  try {
    const base = "https://grouv.invalid";
    const url = new URL(value, base);
    if (url.origin !== base) return null;
    const path = url.pathname + url.search + url.hash;
    // "/..//x" normalises to "//x", which is another site again.
    return path.startsWith("//") ? null : path;
  } catch {
    return null;
  }
}
