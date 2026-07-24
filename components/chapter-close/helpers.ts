// ── Helpers ───────────────────────────────────────────────────────
export function monthsBetween(from: Date, to: Date) {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30)));
}
export function fmtMonth(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
export function pluralMonths(n: number) {
  return n === 1 ? '1 month' : `${n} months`;
}

// 3 preset questions + dynamic extra fields
export const PRESETS = [
  { key: 'learned',  label: 'What did this chapter teach you?',              placeholder: "What shifted in you during this time…" },
  { key: 'advice',   label: 'What would you tell someone starting where you started?', placeholder: "The honest thing you wish you'd known…" },
  { key: 'carry',    label: 'Who or what from this chapter are you carrying forward?', placeholder: "People, lessons, habits…" },
];
