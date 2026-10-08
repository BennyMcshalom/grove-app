/**
 * Profile option lists — the database stores the `value`, the UI shows the
 * `label`. Values match the enums in supabase/migrations.
 */

/** Edit Profile → "Your aura, how your circle reads you" (Figma 404:15157). */
export const AURAS = [
  { value: "reflective", label: "Reflective", dot: "bg-success-50", ring: "var(--color-success-50)" },
  { value: "open_to_connect", label: "Open to connect", dot: "bg-destructive-50", ring: "var(--color-destructive-50)" },
  { value: "deep_focus", label: "Deep Focus", dot: "bg-warning-40", ring: "var(--color-warning-40)" },
  { value: "in_transition", label: "In transition", dot: "bg-primary-300", ring: "var(--color-primary-300)" },
  { value: "active_nearby", label: "Active nearby", dot: "bg-primary-600", ring: "var(--color-primary-600)" },
] as const;

export type Aura = (typeof AURAS)[number]["value"];

/** The thin status ring drawn around someone’s photo — same colour as their aura dot. */
export function auraRing(aura: Aura) {
  return AURAS.find((a) => a.value === aura)?.ring ?? "var(--color-primary-300)";
}

export function auraLabel(aura: Aura) {
  return AURAS.find((a) => a.value === aura)?.label ?? "In transition";
}

/** Settings → Privacy → "Log visibility". LogRail's "My circle" is `circle`. */
export const LOG_VISIBILITY = [
  // WHO CAN SEE YOUR LOG (Figma 1307:22530) adds "Everyone" above the rest.
  { value: "everyone", label: "Everyone", body: "Anyone on Grouv in your spaces can scroll your log" },
  { value: "circle", label: "My circle", body: "People you’re connected with can see it" },
  { value: "bonds", label: "Bonds only", body: "Only your Bonds can open your log" },
  // 1798:50311 calls it "Private".
  { value: "only_me", label: "Private", body: "Just you. A closed door." },
] as const;

export type LogVisibility = (typeof LOG_VISIBILITY)[number]["value"];

/** Deep Focus durations (Figma 296:11390). */
export const FOCUS_DURATIONS = [
  { value: "until_evening", label: "Until this evening" },
  { value: "until_tomorrow_morning", label: "Until tomorrow, 8am" },
  { value: "three_days", label: "For 3 days" },
  { value: "one_week", label: "For a week" },
] as const;

export type FocusDuration = (typeof FOCUS_DURATIONS)[number]["value"];

/**
 * When a Deep Focus session ends, in the viewer's own clock. Runs in the
 * browser so "this evening" and "8am" mean the user's local time.
 */
export function focusEndsAt(duration: FocusDuration, now = new Date()): Date {
  const end = new Date(now);
  switch (duration) {
    case "until_evening":
      end.setHours(18, 0, 0, 0);
      // Already evening: hold until the end of today.
      if (end <= now) end.setHours(23, 59, 0, 0);
      if (end <= now) end.setTime(now.getTime() + 60 * 60 * 1000);
      return end;
    case "until_tomorrow_morning":
      end.setDate(end.getDate() + 1);
      end.setHours(8, 0, 0, 0);
      return end;
    case "three_days":
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    case "one_week":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}
