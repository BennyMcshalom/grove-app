/** Grouv Log shapes, built on the server. */

export interface LogEntry {
  id: string;
  body: string | null;
  photoUrl: string | null;
  /** The user's calendar day, "2026-09-13". */
  entryDate: string;
  /** Day N of the chapter this was logged in. */
  dayNumber: number;
  chapterSlug: string;
  scope: "solo" | "bond";
}

export interface CircleLog {
  userId: string;
  name: string;
  avatarUrl: string | null;
  chapterSlug: string;
  phase: string;
  latestAt: string;
  entries: LogEntry[];
}

/** Figma's "4 of 5 days logged": the weekly rhythm the rail measures against. */
export const WEEKLY_LOG_TARGET = 5;

const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

/** "APR. 10" / "Apr. 10" — entry dates are calendar days, so read them as UTC. */
export function logDateLabel(entryDate: string) {
  return shortDate.format(new Date(`${entryDate}T12:00:00Z`)).replace(" ", ". ");
}

/** The viewer's local calendar day, for new entries. */
export function localDay(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
