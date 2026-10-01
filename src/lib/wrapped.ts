/** Life Wrapped shapes and labels, shared by the server and the client. */

export type WrapRange = "week" | "month" | "chapter";

export interface WrapMoment {
  id: string;
  body: string | null;
  photoUrl: string | null;
  /** The calendar day it was logged, "2026-09-11". */
  date: string;
  /** Saving can also update the Log entry: it still exists and its chapter is open. */
  sourceEditable: boolean;
}

export interface WrapSummary {
  id: string;
  title: string;
  range: WrapRange;
  startsOn: string;
  endsOn: string;
  createdAt: string;
  /** The closed chapter a chapter wrap covers. */
  userChapterId: string | null;
}

export interface Wrap extends WrapSummary {
  moments: WrapMoment[];
}

/** What "Choose a time range" and "Choose what to include" list. */
export interface WrapChoices {
  /** Chapters a week or month wrap can pull from: the ones held now. */
  sources: { id: string; slug: string; phase: string }[];
  /** "A completed chapter": closed chapters, newest first. */
  closed: { id: string; slug: string; phase: string; openedAt: string; closedAt: string }[];
  /** The newest wrap, for the Grouv Log card. */
  latest: WrapSummary | null;
}

/** The card a public link carries — a snapshot, already stripped of hidden details. */
export interface ShareCardData {
  sharerName: string | null;
  range: WrapRange;
  startsOn: string;
  endsOn: string;
  body: string | null;
  photoUrl: string | null;
  date: string;
}

/** "Not enough moments yet" below this many. Mirrors private.build_wrap. */
export const MIN_WRAP_MOMENTS = 3;

// Calendar days: read at noon UTC so no timezone shifts the day.
const day = (date: string) => new Date(`${date.slice(0, 10)}T12:00:00Z`);
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const dayOnly = new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/** "Sep 11". */
export function momentDateLabel(date: string) {
  return monthDay.format(day(date));
}

/** "Tuesday". */
export function weekdayLabel(date: string) {
  return weekday.format(day(date));
}

/** "Week of Sep 8 – 14", "Aug 31 – Sep 29", "March 2024 – November 2024". */
export function wrapRangeLabel(range: WrapRange, startsOn: string, endsOn: string) {
  const from = day(startsOn);
  const to = day(endsOn);
  if (range === "chapter") {
    const a = monthYear.format(from);
    const b = monthYear.format(to);
    return a === b ? a : `${a} – ${b}`;
  }
  const sameMonth = from.getUTCMonth() === to.getUTCMonth();
  const span = `${monthDay.format(from)} – ${sameMonth ? dayOnly.format(to) : monthDay.format(to)}`;
  return range === "week" ? `Week of ${span}` : span;
}

/** "this week's", for "Pick one moment or reflection from this week's Wrapped." */
export function wrapPeriodWord(range: WrapRange) {
  return range === "week" ? "this week’s" : range === "month" ? "this month’s" : "this chapter’s";
}

/** Where a wrap opens: the Grouv Log, which mounts the viewer. */
export function wrapHref(wrapId: string) {
  return `/log?wrap=${wrapId}`;
}
